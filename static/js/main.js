let ws;
let username = '';
const PROTOCOL = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

// --- 天气功能 ---
async function fetchWeather() {
    const weatherCard = document.getElementById('weatherCard');
    const tempEl = document.getElementById('weatherTemp');
    const descEl = document.getElementById('weatherDesc');
    const iconEl = document.getElementById('weatherIcon');
    const cityEl = document.getElementById('weatherCity');

    const CACHE_KEY = 'weather_data_v3';
    const CACHE_TIME = 1000 * 60 * 10;

    const cachedStr = localStorage.getItem(CACHE_KEY);
    if (cachedStr) {
        const cached = JSON.parse(cachedStr);
        if (Date.now() - cached.timestamp < CACHE_TIME) {
            updateUI(cached.data);
            weatherCard.style.display = 'flex';
            return;
        }
    }

    const mainUrl = `https://api.open-meteo.com/v1/forecast?latitude=32.06&longitude=118.79&current_weather=true&timezone=auto`;
    weatherCard.style.display = 'flex';

    try {
        const response = await fetch(mainUrl);
        if (!response.ok) throw new Error("API Limit");
        const data = await response.json();
        const weatherData = parseOpenMeteo(data);
        localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: weatherData }));
        updateUI(weatherData);
    } catch (e) {
        updateUI({ temp: "--", icon: "🌥️", desc: "暂无数据", wind: "0", source: "Offline" });
    }

    function parseOpenMeteo(data) {
        const w = data.current_weather;
        const code = w.weathercode;
        let icon = '❓'; let desc = '未知';
        if (code === 0) { icon = '☀️'; desc = '晴朗'; }
        else if (code <= 3) { icon = '⛅'; desc = '多云'; }
        else if (code <= 48) { icon = '🌫️'; desc = '雾'; }
        else if (code <= 67) { icon = '🌧️'; desc = '有雨'; }
        else if (code <= 77) { icon = '❄️'; desc = '有雪'; }
        else { icon = '⛈️'; desc = '风暴'; }
        return { temp: w.temperature, icon: icon, desc: desc, wind: w.windspeed, source: 'Open-Meteo' };
    }

    function updateUI(data) {
        tempEl.innerText = `${data.temp}°C`;
        iconEl.innerText = data.icon;
        descEl.innerHTML = `${data.desc} <span style='font-size:12px'>(${data.wind}km/h)</span>`;
        cityEl.innerText = `南京 • ${data.source}`;
    }
}

// --- 登录与连接 ---
function login() {
    const input = document.getElementById("usernameInput");
    if (!input.value.trim()) { alert("名字不能为空！"); return; }
    username = input.value.trim();
    document.getElementById("loginOverlay").style.display = "none";
    connectWs();
    fetchWeather();
}

function connectWs() {
    const wsUrl = `${PROTOCOL}//${location.host}/ws?username=${encodeURIComponent(username)}`;
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log("Connected to WebSocket");
    };

    ws.onmessage = (event) => {
        const state = JSON.parse(event.data);
        renderBoard(state.tasks_by_user || {});
        // 调用 charts.js 中的函数，并传入当前用户名
        if (typeof renderHeatmap === 'function') {
            renderHeatmap(state.tasks_by_user || {}, username);
        }
        renderMessages(state.messages || []);
    };

    ws.onclose = () => {
        console.log("Disconnected. Reconnecting in 3s...");
        setTimeout(connectWs, 3000); // 简单的断线重连
    };
}

function sendMessage(action, payload) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action, payload }));
    }
}

// --- 渲染任务列表 ---
function renderBoard(tasksByUser) {
    const container = document.getElementById("mainContainer");
    container.innerHTML = "";
    const currentSlot = new Date().getHours() < 12 ? 'morning' : (new Date().getHours() < 18 ? 'afternoon' : 'evening');
    let colorIndex = 0;
    const colorClasses = ['user-column-a', 'user-column-b'];
    const todayStr = new Date().toISOString().split('T')[0];

    for (const user in tasksByUser) {
        const column = document.createElement("div");
        column.className = `user-column ${colorClasses[colorIndex++ % 2]}`;
        column.innerHTML = `<div class="user-header">${user}</div>`;

        const visibleTasks = tasksByUser[user].filter(t => {
            if (t.is_daily && t.id.includes(todayStr)) return true;
            if (!t.is_daily && !t.completed) return true;
            if (!t.is_daily && t.completed && t.completed_at && t.completed_at.startsWith(todayStr)) return true;
            return false;
        });

        const slots = { morning: [], afternoon: [], evening: [] };
        visibleTasks.forEach(t => { if (slots[t.time_slot]) slots[t.time_slot].push(t); });

        ['morning', 'afternoon', 'evening'].forEach(slotKey => {
            const slotDiv = document.createElement("div");
            slotDiv.className = `time-slot ${slotKey !== currentSlot ? 'collapsed' : ''}`;
            const title = { 'morning': '🌞 上午', 'afternoon': '☀️ 下午', 'evening': '🌙 晚上' }[slotKey];

            slotDiv.innerHTML = `<div class="time-slot-header" onclick="this.parentElement.classList.toggle('collapsed')">
                <h4>${title}</h4><span class="toggle-icon"></span></div>`;

            const ul = document.createElement("ul");
            const listContainer = document.createElement("div");
            listContainer.className = "task-list-container";

            if (slots[slotKey]) {
                slots[slotKey].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)).forEach(task => {
                    const li = document.createElement("li");
                    if (task.completed) li.classList.add("completed");
                    if (task.is_daily) li.classList.add("daily-task");

                    let controlsHtml = '';
                    if (task.is_daily && ['喝水', '站立'].includes(task.text)) {
                        const icon = task.text === '喝水' ? '💧' : '🧍';
                        controlsHtml = `<button class="water-btn" onclick="toggleTask('${task.id}')">${icon}</button>
                                        <span class="water-count">${task.completed || 0}</span>`;
                    } else if (task.is_daily || task.started_at) {
                        controlsHtml = `<input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTask('${task.id}')">`;
                    } else {
                        controlsHtml = `<button class="start-btn" onclick="startTask('${task.id}')">▶</button>`;
                    }

                    let textHtml = `<span class="task-text ${task.is_daily ? 'water-task-text' : ''}">${task.text}</span>`;
                    if (task.text === '使用牙线') textHtml = `<span class="task-text">🦷 ${task.text}</span>`;

                    let metaHtml = '';
                    if (!task.is_daily) {
                        let scoreHtml = '';
                        // getWorkScore 在 charts.js 中定义，确保加载顺序正确
                        if (task.completed && task.started_at && typeof getWorkScore === 'function') {
                            const s = getWorkScore(task);
                            scoreHtml = ` <span style='color:${s > 0 ? "#28a745" : "#d73a49"}'>[${s.toFixed(0)}分]</span>`;
                        }
                        metaHtml = `<div class="task-meta">
                            <div class="timestamps">
                                ${formatTime(task.created_at)} 
                                ${task.completed ? '| 完成 ' + formatTime(task.completed_at) + scoreHtml : ''}
                            </div>
                            <div><button class="like-btn" onclick="likeTask('${task.id}')">👍 ${task.likes || 0}</button></div>
                        </div>`;
                    }

                    li.innerHTML = `<div class="task-header"><div class="task-controls">${controlsHtml}</div>
                                    ${textHtml} <button class="delete-btn" onclick="deleteTask('${task.id}')">×</button></div>${metaHtml}`;
                    ul.appendChild(li);
                });
            }
            listContainer.appendChild(ul);
            slotDiv.appendChild(listContainer);
            column.appendChild(slotDiv);
        });
        container.appendChild(column);
    }
}

function renderMessages(messages) {
    const c = document.getElementById("messagesContainer");
    c.innerHTML = messages.map((m, i) =>
        `<div class="message"><div class="author ${i % 2 ? 'user-b' : 'user-a'}">${m.username}</div>
        <div class="text">${m.text}</div><div class="time">${formatTime(m.timestamp)}</div></div>`
    ).join('');
    c.scrollTop = c.scrollHeight;
}

function formatTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return `${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getDate().toString().padStart(2, '0')} ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
}

// --- 交互 Action ---
function addTask() {
    const input = document.getElementById("taskInput");
    const slot = document.getElementById("timeSlotSelect").value;
    if (input.value) { sendMessage("add", { text: input.value, time_slot: slot }); input.value = ""; }
}
function toggleTask(id) { sendMessage("toggle", { id }); }
function deleteTask(id) { sendMessage("delete", { id }); }
function likeTask(id) { sendMessage("like", { id }); }
function startTask(id) { sendMessage("start", { id }); }
function postMessage() {
    const i = document.getElementById("messageInput");
    if (i.value) { sendMessage("post_message", { text: i.value }); i.value = ""; }
}