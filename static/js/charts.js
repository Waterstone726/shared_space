// --- 热力图状态管理 ---
let heatmapState = {
    daysToShow: 28, // 默认 4 周
    offsetWeeks: 0, // 0 表示显示到现在，负数表示往回看
    isCollapsed: false
};
let cachedTasksForHeatmap = {}; // 本地缓存任务数据

// --- 核心：分数计算逻辑 ---
function getWorkScore(task) {
    if (!task.completed || !task.started_at || !task.completed_at || task.is_daily) return 0;
    const start = new Date(task.started_at);
    const end = new Date(task.completed_at);
    const durationHours = (end - start) / (1000 * 60 * 60);
    if (durationHours > 3) return 0;
    let score = 0;
    if (durationHours <= 2) score = durationHours * 10;
    else score = 20 + (durationHours - 2) * 5;
    return score;
}

function calculateDailyScore(tasks, targetDateStr) {
    if (!tasks) return 0;
    const dayTasks = tasks.filter(t => {
        if (t.is_daily) return t.id.includes(targetDateStr);
        return t.completed_at && t.completed_at.startsWith(targetDateStr);
    });

    let totalScore = 0;
    let waterCount = 0; let standCount = 0; let flossCount = 0;

    dayTasks.forEach(task => {
        if (task.is_daily) {
            if (task.text === '喝水') waterCount += (task.completed || 0);
            if (task.text === '站立') standCount += (task.completed || 0);
            if (task.text === '使用牙线' && task.completed) flossCount += 1;
        } else {
            totalScore += getWorkScore(task);
        }
    });

    const effectiveWater = Math.min(waterCount, 3);
    const effectiveStand = Math.min(standCount, 3);
    const effectiveFloss = Math.min(flossCount, 2);

    totalScore += (effectiveWater * 3);
    totalScore += (effectiveStand * 3);
    totalScore += (effectiveFloss * 1);

    return Math.min(Math.floor(totalScore), 100);
}

// --- 热力图控制 ---
function toggleHeatmapRange() {
    heatmapState.daysToShow = heatmapState.daysToShow === 28 ? 90 : 28;
    document.getElementById('expandBtn').innerText = heatmapState.daysToShow === 28 ? "展开" : "收起";
    if (window.currentAppUsername) {
        renderHeatmap(cachedTasksForHeatmap, window.currentAppUsername);
    }
}

function toggleHeatmapCollapse() {
    const content = document.getElementById('heatmapContent');
    heatmapState.isCollapsed = !heatmapState.isCollapsed;
    content.style.display = heatmapState.isCollapsed ? 'none' : 'block';
}

function moveHeatmap(direction) {
    if (direction === 1 && heatmapState.offsetWeeks >= 0) return;
    heatmapState.offsetWeeks += direction;
    if (window.currentAppUsername) {
        renderHeatmap(cachedTasksForHeatmap, window.currentAppUsername);
    }
}

// --- 核心修改：多用户循环渲染逻辑 ---
function renderHeatmap(tasksByUser, currentUsername) {
    cachedTasksForHeatmap = tasksByUser;
    window.currentAppUsername = currentUsername;

    const contentContainer = document.getElementById('heatmapContent');
    if (!contentContainer) return;

    // 1. 清空容器
    contentContainer.innerHTML = "";

    // 2. 准备时间轴数据
    const today = new Date();
    const baseEndDate = new Date(today);
    baseEndDate.setDate(today.getDate() + (heatmapState.offsetWeeks * 7));
    const currentDayOfWeek = baseEndDate.getDay();
    const viewEndDate = new Date(baseEndDate);
    viewEndDate.setDate(baseEndDate.getDate() + (6 - currentDayOfWeek));
    const totalWeeks = Math.ceil(heatmapState.daysToShow / 7);
    const totalDaysToRender = totalWeeks * 7;
    const startDate = new Date(viewEndDate);
    startDate.setDate(viewEndDate.getDate() - totalDaysToRender + 1);

    // 3. 遍历每个用户，生成独立的热力图
    for (const [user, tasks] of Object.entries(tasksByUser)) {
        createHeatmapForUser(contentContainer, user, tasks, startDate, totalDaysToRender, totalWeeks);
    }
}

// --- 辅助函数：生成单个用户的 DOM ---
function createHeatmapForUser(container, user, tasks, startDate, totalDaysToRender, totalWeeks) {
    // 容器
    const block = document.createElement('div');
    block.className = 'user-heatmap-block';

    // 头部信息
    const header = document.createElement('div');
    header.className = 'user-heatmap-header';
    const todayStr = new Date().toISOString().split('T')[0];
    const todayScore = calculateDailyScore(tasks, todayStr);
    header.innerHTML = `<span>${user}</span><span class="user-score-tag">今日: ${todayScore}分</span>`;
    block.appendChild(header);

    // 热力图包裹层
    const heatmapWrapper = document.createElement('div');
    heatmapWrapper.className = 'heatmap-container';

    // 动态月份栏
    const monthsRow = document.createElement('div');
    monthsRow.className = 'dynamic-months-row';
    // 核心修复：强制对齐宽度
    monthsRow.style.width = `${(totalWeeks * 12) - 2}px`;
    heatmapWrapper.appendChild(monthsRow);

    // 网格主体
    const body = document.createElement('div');
    body.className = 'heatmap-body';

    // 星期列
    const weekCol = document.createElement('div');
    weekCol.className = 'week-days-col';
    weekCol.innerHTML = `
        <div class="day-label-hidden">Sun</div><div>Mon</div><div class="day-label-hidden">Tue</div>
        <div>Wed</div><div class="day-label-hidden">Thu</div><div>Fri</div><div class="day-label-hidden">Sat</div>
    `;
    body.appendChild(weekCol);

    // 网格数据
    const grid = document.createElement('div');
    grid.className = 'heatmap-grid';

    let currentMonth = -1;
    for (let i = 0; i < totalDaysToRender; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        const score = calculateDailyScore(tasks, dateStr);

        const cell = document.createElement('div');
        cell.className = 'day-cell';
        if (score >= 90) cell.classList.add('level-4');
        else if (score >= 70) cell.classList.add('level-3');
        else if (score >= 40) cell.classList.add('level-2');
        else if (score > 0) cell.classList.add('level-1');
        else cell.classList.add('level-0');

        cell.title = `${user} - ${dateStr}: ${score}分`;
        if (dateStr === todayStr) cell.style.border = "1px solid #333";

        grid.appendChild(cell);

        // 处理月份标签
        if (i % 7 === 0) {
            if (d.getMonth() !== currentMonth) {
                currentMonth = d.getMonth();
                const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                const label = document.createElement('span');
                label.className = 'month-label';
                label.innerText = monthNames[currentMonth];
                const colIndex = Math.floor(i / 7);
                label.style.left = `${colIndex * 12}px`;
                monthsRow.appendChild(label);
            }
        }
    }

    body.appendChild(grid);
    heatmapWrapper.appendChild(body);
    block.appendChild(heatmapWrapper);
    container.appendChild(block);
}