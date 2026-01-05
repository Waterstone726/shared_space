import json
import os
from datetime import datetime, date
from typing import Dict, Any, List

# 数据文件路径
DATA_FILE = os.path.join("data", "task_data.json")

# 每日任务模板 (常量)
DAILY_TASKS_TEMPLATE = [
    {"text": "喝水", "time_slot": "morning", "id_suffix": "water1"},
    {"text": "喝水", "time_slot": "afternoon", "id_suffix": "water2"},
    {"text": "喝水", "time_slot": "evening", "id_suffix": "water3"},
    {"text": "站立", "time_slot": "morning", "id_suffix": "stand1"},
    {"text": "站立", "time_slot": "afternoon", "id_suffix": "stand2"},
    {"text": "站立", "time_slot": "evening", "id_suffix": "stand3"},
    {"text": "使用牙线", "time_slot": "afternoon", "id_suffix": "floss1"},
    {"text": "使用牙线", "time_slot": "evening", "id_suffix": "floss2"},
]

class DataService:
    def __init__(self):
        # 初始化状态
        self.state: Dict[str, Any] = {"tasks_by_user": {}, "messages": [], "next_id": 1}
        self.ensure_data_dir()
        self.load_data()

    def ensure_data_dir(self):
        if not os.path.exists("data"):
            os.makedirs("data")

    def load_data(self):
        if os.path.exists(DATA_FILE):
            try:
                with open(DATA_FILE, "r", encoding="utf-8") as f:
                    loaded = json.load(f)
                    self.state.update(loaded)
                    print("✅ 数据加载成功。")
            except Exception as e:
                print(f"⚠️ 数据加载失败: {e}")

    def save_data(self):
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(self.state, f, ensure_ascii=False, indent=4)

    def generate_daily_tasks(self, username: str):
        today_str = date.today().isoformat()
        if username not in self.state["tasks_by_user"]:
            self.state["tasks_by_user"][username] = []
        
        user_tasks = self.state["tasks_by_user"][username]
        existing_ids = {t['id'] for t in user_tasks if t.get("is_daily")}

        new_tasks = []
        for tmpl in DAILY_TASKS_TEMPLATE:
            tid = f"daily-{username}-{tmpl['id_suffix']}-{today_str}"
            if tid not in existing_ids:
                is_counter = tmpl["text"] in ["喝水", "站立"]
                new_tasks.append({
                    "id": tid, "text": tmpl["text"], "time_slot": tmpl["time_slot"],
                    "completed": 0 if is_counter else False,
                    "created_at": datetime.now().isoformat(), "completed_at": None,
                    "started_at": None, "likes": 0, "is_daily": True
                })
        
        if new_tasks:
            self.state["tasks_by_user"][username].extend(new_tasks)
            self.save_data()

    def get_broadcast_data(self, active_users: set):
        # 只发送在线用户的数据，减少包大小
        filtered_tasks = {
            u: t for u, t in self.state["tasks_by_user"].items() 
            if u in active_users
        }
        return {
            "tasks_by_user": filtered_tasks,
            "messages": self.state["messages"],
            "next_id": self.state["next_id"]
        }

    # 简单的任务查找辅助函数
    def find_task(self, task_id):
        # 1. 把我们要找的目标 ID 强制转为字符串
        target_str = str(task_id)
        
        for user, tasks in self.state["tasks_by_user"].items():
            for task in tasks:
                # 2. 把当前任务的 ID 也转为字符串进行比对
                # 这样 '1' == '1' 就成立了，'daily-xxx' == 'daily-xxx' 也成立
                if str(task["id"]) == target_str:
                    return user, task
        return None, None

# 创建全局单例
service = DataService()