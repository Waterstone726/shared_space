from fastapi import WebSocket
from typing import Dict, Set
from datetime import date
from app.service import service

class ConnectionManager:
    def __init__(self):
        # 存放活跃的 WebSocket 连接： {username: WebSocket}
        self.active_connections: Dict[str, WebSocket] = {}
        # 存放“今天出现过”的用户，用于过滤前端显示的用户列表
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
        # 获取要发送的数据（仅包含今天活跃的用户）
        data = service.get_broadcast_data(self.active_today_users)
        
        # 序列化一次，发送给所有人
        import json
        message = json.dumps(data, ensure_ascii=False)
        
        # 遍历发送，如果有死链接则处理
        to_remove = []
        for username, connection in self.active_connections.items():
            try:
                await connection.send_text(message)
            except Exception:
                to_remove.append(username)
        
        for username in to_remove:
            self.disconnect(username)

manager = ConnectionManager()