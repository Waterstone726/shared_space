# 📂 协作空间 (Shared Space) - 项目开发维护指南

这份文档旨在帮助开发者快速理解项目结构，定位核心逻辑，并进行功能的增删改查。

---

## 1. 🗺️ 项目全景结构

```text
shared_space_project/
├── data/
│   └── task_data.json       # [数据层] 核心数据库 (JSON格式)，存储任务、分数、聊天记录
├── templates/
│   └── index.html           # [视图层] 网页骨架，定义 DOM 结构 (div, input, button)
├── static/
│   ├── css/
│   │   └── style.css        # [样式层] 网页皮肤，负责配色、布局、美化
│   └── js/
│       ├── main.js          # [逻辑层] 前端主控，负责 WebSocket 通信、UI 渲染、事件绑定
│       └── charts.js        # [逻辑层] 数据可视化，负责热力图绘制、分数计算算法
├── app/
│   ├── main.py              # [后端-控制器] 程序入口，处理 WebSocket 路由与指令分发
│   ├── service.py           # [后端-服务] 业务逻辑核心，负责数据读写、每日任务生成
│   └── manager.py           # [后端-网络] 连接管理器，维护在线用户列表、消息广播
├── requirements.txt         # [配置] Python 依赖库清单
└── .gitignore               # [配置] Git 忽略规则 (保护数据文件不被上传)
```

---

## 2. 🧩 核心模块职责速查

### 🎨 前端 (Frontend)

| 文件路径 | 主要职责 | 修改场景示例 |
| :--- | :--- | :--- |
| **`templates/index.html`** | **骨架** | 想加一个新的按钮、输入框，或者调整页面板块顺序。 |
| **`static/css/style.css`** | **样式** | 调整热力图对齐、修改背景色、字体大小、间距。 |
| **`static/js/main.js`** | **交互/通信** | 修复点击无反应的 Bug、修改天气显示逻辑、处理 WebSocket 消息。 |
| **`static/js/charts.js`** | **算法/图表** | **修改分数计算规则** (如：工作时长权重)、调整热力图颜色阈值。 |

### ⚙️ 后端 (Backend)

| 文件路径 | 主要职责 | 修改场景示例 |
| :--- | :--- | :--- |
| **`app/main.py`** | **指令调度** | 增加新的操作指令 (如：置顶任务、撤回消息)，在此处添加 `elif action == ...`。 |
| **`app/service.py`** | **数据/业务** | **修改每日任务模板** (如：把“喝水”改成“运动”)、修改数据查找与存储逻辑。 |
| **`app/manager.py`** | **连接管理** | 管理在线/离线状态逻辑，修改广播机制。 |

---

## 3. 🛠️ 常见修改场景指南 (How-To)

### ✅ 场景一：修改“每日任务”的内容
> 需求：我想把自动生成的“使用牙线”改成“背单词”。

1.  打开文件：**`app/service.py`**
2.  定位代码：找到顶部的 `DAILY_TASKS_TEMPLATE` 列表。
3.  操作：
    ```python
    # 修改前
    {"text": "使用牙线", "time_slot": "evening", "id_suffix": "floss2"},
    
    # 修改后
    {"text": "背单词", "time_slot": "evening", "id_suffix": "word1"},
    ```
4.  **注意**：如果是计数类任务（如喝水），需要在前端 `charts.js` 的计分逻辑里也同步修改名称匹配。

### ✅ 场景二：修改“分数计算规则”
> 需求：现在的计分太严格了，我想让每工作 1 小时得 20 分。

1.  打开文件：**`static/js/charts.js`**
2.  定位代码：`function getWorkScore(task)`
3.  操作：
    ```javascript
    // 修改内部的数学公式
    if (durationHours <= 2) score = durationHours * 20; // 改成了 20
    ```

### ✅ 场景三：修复界面布局问题
> 需求：热力图没有居中，或者月份栏没对齐。

1.  打开文件：**`static/css/style.css`**
2.  定位代码：找到对应的 class (如 `.heatmap-container`)。
3.  操作：修改 CSS 属性。
4.  **关键步骤**：保存后，浏览器必须使用 **`Ctrl + F5`** (强制刷新) 才能看到变化，否则会加载旧的缓存。

### ✅ 场景四：增加新功能 (全栈修改流程)
> 需求：给任务增加“备注”功能。

1.  **HTML (`index.html`)**: 添加 `<input id="noteInput">`。
2.  **JS (`main.js`)**: 
    * `addTask()` 中获取输入框的值。
    * 发送 JSON 时带上: `{ action: "add", payload: { ..., note: val } }`。
    * `renderBoard()` 时把 `task.note` 显示出来。
3.  **Python (`app/main.py`)**:
    * 在 `if action == "add":` 处，接收 `payload.get("note")` 并存入字典。

---

## 4. 🚀 运行与维护命令

### 启动服务 (本地开发)
确保终端路径在项目根目录下 (`shared_space_project/`)：

```powershell
# 使用 Python 模块方式启动 (推荐，避免路径报错)
& python -m app.main
```
*(注：如果使用 Anaconda 或特定环境，请使用该环境下的 python.exe 绝对路径)*

### 开启外网访问 (Ngrok)
保持上面的 Python 窗口运行，打开**新终端**窗口：

```powershell
# 端口必须与 Python 启动端口一致 (默认 5000)
ngrok http 5000
```

### 数据备份/迁移
所有数据均存储在：
`data/task_data.json`

* **备份**：直接复制该文件到别处。
* **重置**：删除该文件，重启服务后会自动生成新的空文件。