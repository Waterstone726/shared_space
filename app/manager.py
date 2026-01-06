from fastapi import WebSocket
from typing import Dict, Set
from datetime import date
from app.service import service
import json # 确保引入json

class ConnectionManager:
    def __init__(self):
        # 存放活跃的 WebSocket 连接： {username: WebSocket}
        # 这里的 keys 就是“当前在线”的人
        self.active_connections: Dict[str, WebSocket] = {}
        
        # 存放“今天出现过”的用户，用于过滤前端显示的用户列表
        # 这里的 users 是“今天所有人”，包括离线的
        self.active_today_users: Set[str] = set()
        self.current_day = date.today()

    async def connect(self, websocket: WebSocket, username: str):
        await websocket.accept()
        self.active_connections[username] = websocket
        
        # 日期检查：如果是新的一天，清空活跃用户列表
        today = date.today()
        if today != self.current_day:
            self.active_today_users.clear()
            self.current_day = today
        
        self.active_today_users.add(username)
        
        # 用户上线时，确保当天的日常任务已生成
        service.generate_daily_tasks(username)

    def disconnect(self, username: str):
        if username in self.active_connections:
            del self.active_connections[username]
        # 注意：我们不从 active_today_users 移除用户，
        # 这样即使对方暂时断线，大家依然能看到他的任务栏。

    async def broadcast_state(self):
        # 1. 获取基础数据（任务列表、消息记录等）
        # 这里获取的是 active_today_users (今天所有出现过的人) 的数据
        data = service.get_broadcast_data(self.active_today_users)
        
        # --- 【关键修改】注入在线名单 ---
        # 告诉前端：这些人现在 WebSocket 是连通的
        # 将 dict_keys 转换为 list 才能被 JSON 序列化
        data["online_users"] = list(self.active_connections.keys())
        # ----------------------------
        
        # 2. 序列化
        message = json.dumps(data, ensure_ascii=False)
        
        # 3. 遍历发送，如果有死链接则处理
        to_remove = []
        for username, connection in self.active_connections.items():
            try:
                await connection.send_text(message)
            except Exception:
                to_remove.append(username)
        
        # 清理异常断开的连接
        for username in to_remove:
            self.disconnect(username)

manager = ConnectionManager()