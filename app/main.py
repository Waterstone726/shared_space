import json
from datetime import datetime
from contextlib import asynccontextmanager  # 1. 引入上下文管理器
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from app.manager import manager
from app.service import service

# --- 2. 定义生命周期 (替代原来的 try...finally) ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动前执行的代码 (可选)
    print("🚀 服务正在启动...")
    
    yield  # 程序运行期间停在这里
    
    # 🛑 关机时执行的代码 (相当于原来的 finally)
    print("💾 检测到程序退出，正在强制保存数据...")
    service.save_data()
    print("✅ 数据保存完毕，再见！")

# 3. 将 lifespan 注入到 app 中
app = FastAPI(lifespan=lifespan)

# 挂载静态文件目录
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

@app.get("/", response_class=HTMLResponse)
async def get_page(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, username: str = Query(...)):
    await manager.connect(websocket, username)
    await manager.broadcast_state()
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            action = message.get("action")
            payload = message.get("payload")
            now = datetime.now().isoformat()
            
            # --- 业务逻辑 ---
            if action == "add":
                new_task = { 
                    "id": service.state["next_id"], 
                    "text": payload.get("text"), 
                    "time_slot": payload.get("time_slot"), 
                    "completed": False, 
                    "created_at": now, 
                    "completed_at": None, 
                    "started_at": None, 
                    "likes": 0, 
                    "is_daily": False 
                }
                service.state["tasks_by_user"].setdefault(username, []).append(new_task)
                service.state["next_id"] += 1

            elif action == "start":
                _u, task = service.find_task(payload.get("id"))
                if task and not task.get("started_at"): 
                    task["started_at"] = now

            elif action == "toggle":
                _u, task = service.find_task(payload.get("id"))
                if task:
                    is_counter_task = task.get("is_daily") and task.get("text") in ["喝水", "站立"]
                    if is_counter_task:
                        task["completed"] = (task.get("completed", 0) or 0) + 1
                    else:
                        task["completed"] = not task.get("completed", False)
                        task["completed_at"] = now if task["completed"] else None
                        if task["completed"] and not task.get("started_at") and not task.get("is_daily"):
                            task["started_at"] = task["created_at"]

            elif action == "delete":
                user_of_task, task = service.find_task(payload.get("id"))
                if user_of_task and task: 
                    service.state["tasks_by_user"][user_of_task].remove(task)

            elif action == "like":
                _u, task = service.find_task(payload.get("id"))
                if task: 
                    task["likes"] = task.get("likes", 0) + 1

            elif action == "post_message":
                new_message = {"username": username, "text": payload.get("text"), "timestamp": now}
                service.state["messages"].append(new_message)
                service.state["messages"] = service.state["messages"][-50:]
            
            # 实时保存（双重保险：每次操作存一次，关机时再存一次）
            service.save_data()
            await manager.broadcast_state()

    except WebSocketDisconnect:
        manager.disconnect(username)
        # 【新增！】这一行非常重要：有人走了，立刻广播通知所有人更新状态
        await manager.broadcast_state()
    except Exception as e:
        print(f"Error: {e}")
        manager.disconnect(username)
        # 【新增！】出错断开时，也广播一下
        await manager.broadcast_state()

if __name__ == "__main__":
    import uvicorn
    # 这里的 reload=True 可能会导致两次加载，但在开发中很方便
    # 即使你按 Ctrl+C，上面的 lifespan 也会被触发
    uvicorn.run("app.main:app", host="0.0.0.0", port=5000, reload=True)