# 🏠 Shared Space (协作空间)

> 一个基于 Python FastAPI 和 WebSockets 的极简实时协作任务看板。
> A minimalist real-time collaborative task board built with FastAPI & WebSockets.

![Python](https://img.shields.io/badge/Python-3.9%2B-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.119.0-009688)
![Uvicorn](https://img.shields.io/badge/Uvicorn-0.37.0-purple)

## 📖 项目简介 (Introduction)

**Shared Space** 是一个轻量级的多人协作网页应用。旨在帮助情侣、室友或小团队共同管理日常任务和习惯。

与传统的 Todo 应用不同，它主打 **实时同步 (Real-time Sync)** 和 **生活化 (Lifestyle)**。当你点击完成任务时，另一台设备上的状态会毫秒级同步更新，无需刷新页面。同时集成了天气展示、贡献度热力图和简易聊天板，增加协作的趣味性。

## ✨ 核心功能 (Features)

* **🔄 实时同步**: 基于 WebSocket 技术，多端操作即时响应，状态零延迟。
* **📅 日常习惯打卡**: 内置喝水、站立、使用牙线等每日循环任务，支持计数统计。
* **✅ 任务管理**: 支持分时段（早/中/晚）添加任务、开始计时、完成打卡、点赞互动。
* **📊 贡献度热力图**: 仿 GitHub 风格的 Contribution Heatmap，可视化展示每日活跃度和分数。
* **🌤️ 实时天气**: 集成 Open-Meteo API，自动获取并缓存本地天气信息。
* **💬 留言板**: 简易的实时聊天区域，方便成员沟通。
* **💾 自动持久化**: 数据以 JSON 格式本地存储，并在程序退出时强制保存，防止数据丢失。

## 🛠️ 技术栈 (Tech Stack)

* **后端 (Backend)**: Python, FastAPI, Uvicorn, WebSockets
* **前端 (Frontend)**: 原生 HTML5, CSS3, JavaScript (无繁重框架，极致轻量)
* **数据存储 (Data)**: JSON 文件存储 (轻量级，易迁移)
* **工具 (Tools)**: Ngrok (用于内网穿透演示)

## 📂 项目结构 (Project Structure)

本项目采用前后端分离的代码组织方式（但在同一个服务中托管）：

```text
shared_space_project/
├── app/
│   ├── main.py              # 程序入口，生命周期管理与路由分发
│   ├── manager.py           # WebSocket 连接管理器 (Connection Manager)
│   ├── service.py           # 业务逻辑层 (CRUD, 每日任务生成, 数据读写)
│   └── __init__.py
├── static/                  # 静态资源 (CSS/JS)
│   ├── css/
│   │   └── style.css        # 样式文件
│   └── js/
│       ├── main.js          # 核心前端逻辑与 WS 通信
│       └── charts.js        # 热力图渲染与计分算法
├── templates/
│   └── index.html           # 前端 HTML 模板
├── data/
│   └── task_data.json       # [自动生成] 数据存储文件
├── requirements.txt         # 依赖列表
└── README.md                # 项目说明文档
```

## 🚀 快速开始 (Getting Started)

### 1. 克隆项目
```bash
git clone [https://github.com/你的用户名/shared_space.git](https://github.com/你的用户名/shared_space.git)
cd shared_space
```

### 2. 创建并激活虚拟环境 (可选但推荐)
```bash
# Windows
python -m venv venv
.\venv\Scripts\activate

# Mac/Linux
python3 -m venv venv
source venv/bin/activate
```

### 3. 安装依赖
```bash
pip install -r requirements.txt
```

### 4. 启动服务
**注意**：请使用模块方式启动以避免路径错误。

```bash
python -m app.main
```
或者使用 uvicorn 命令：
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 5000
```

### 5. 访问应用
打开浏览器访问：[http://localhost:5000](http://localhost:5000)

## 🌐 外网访问 (可选)
如果你希望在手机上访问，可以使用 Ngrok 进行内网穿透：

```bash
# 保持 Python 服务运行，新开一个终端窗口
ngrok http 5000
```
复制生成的 HTTPS 链接即可在任何设备访问。

## 📝 开发指南
详细的代码修改与维护指南，请参阅项目中的 `DEVELOPER_GUIDE.md` (如有)。

* **修改分数规则**: 编辑 `static/js/charts.js`
* **修改每日任务模板**: 编辑 `app/service.py`

## 📄 License
MIT License
```