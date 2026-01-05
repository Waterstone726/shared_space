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
    // 筛选逻辑：如果是日常任务，看ID里的日期；如果是工作任务，看完成时间
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
    // 注意：这里需要依赖外部传入的 username，由于这是回调，我们稍后在 main.js 里处理，
    // 或者利用全局变量。为了兼容原逻辑，我们暂时假设 renderHeatmap 会被正确调用
    // 这里我们触发一个自定义事件或者直接重新渲染，为了简单，我们在 main.js 暴露一个全局刷新函数，或者在这里暂存 username
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
    // direction 1: 向后(未来)， -1: 向前(过去)
    if (direction === 1 && heatmapState.offsetWeeks >= 0) return;
    heatmapState.offsetWeeks += direction;
    if (window.currentAppUsername) {
        renderHeatmap(cachedTasksForHeatmap, window.currentAppUsername);
    }
}

function renderHeatmap(tasksByUser, currentUsername) {
    cachedTasksForHeatmap = tasksByUser;
    // 将 username 挂载到 window 上以便 toggle 按钮使用
    window.currentAppUsername = currentUsername;

    const myTasks = tasksByUser[currentUsername] || [];
    const grid = document.getElementById('heatmapGrid');
    const monthsContainer = document.getElementById('heatmapMonths');
    const todayScoreDisplay = document.getElementById('todayScoreDisplay');

    if (!grid) return; // 防止页面元素未加载报错

    grid.innerHTML = "";
    monthsContainer.innerHTML = "";

    const today = new Date();
    const baseEndDate = new Date(today);
    baseEndDate.setDate(today.getDate() + (heatmapState.offsetWeeks * 7));

    const currentDayOfWeek = baseEndDate.getDay(); // 0-6
    const viewEndDate = new Date(baseEndDate);
    viewEndDate.setDate(baseEndDate.getDate() + (6 - currentDayOfWeek));

    const totalWeeks = Math.ceil(heatmapState.daysToShow / 7);
    const totalDaysToRender = totalWeeks * 7;
    monthsContainer.style.width = `${(totalWeeks * 12) - 2}px`;

    const startDate = new Date(viewEndDate);
    startDate.setDate(viewEndDate.getDate() - totalDaysToRender + 1);

    let currentMonth = -1;

    for (let i = 0; i < totalDaysToRender; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        const score = calculateDailyScore(myTasks, dateStr);

        const cell = document.createElement('div');
        cell.className = 'day-cell';
        if (score >= 90) cell.classList.add('level-4');
        else if (score >= 70) cell.classList.add('level-3');
        else if (score >= 40) cell.classList.add('level-2');
        else if (score > 0) cell.classList.add('level-1');
        else cell.classList.add('level-0');

        cell.title = `${dateStr}: ${score}分`;
        grid.appendChild(cell);

        if (i % 7 === 0) {
            if (d.getMonth() !== currentMonth) {
                currentMonth = d.getMonth();
                const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                const label = document.createElement('span');
                label.className = 'month-label';
                label.innerText = monthNames[currentMonth];
                const colIndex = Math.floor(i / 7);
                label.style.left = `${colIndex * 12}px`;
                monthsContainer.appendChild(label);
            }
        }

        if (dateStr === today.toISOString().split('T')[0]) {
            todayScoreDisplay.innerText = `今日: ${score}分`;
            cell.style.border = "1px solid #333";
        }
    }
}