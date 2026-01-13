let dataList = [];
let localData = JSON.parse(localStorage.getItem("local_abbr_items") || "[]");
let searchHistory = JSON.parse(localStorage.getItem("search_history") || "[]");
let currentTitle = "專業英文縮寫查詢";
let currentSource = "data.json";

/**
 * 載入資料
 */
async function loadData(url) {
    if (url === "custom") {
        const customUrl = prompt("請輸入 JSON 檔案的 URL:", "https://example.com/data.json");
        if (customUrl) url = customUrl;
        else {
            document.getElementById("sourceSelect").value = currentSource;
            return;
        }
    }

    try {
        const response = await fetch(url);
        const data = await response.json();
        dataList = data.items;
        currentTitle = data.title || "專業英文縮寫查詢";
        currentSource = url;
        updateUI();
    } catch (error) {
        console.error("Error:", error);
        showTooltip("無法載入資料");
        document.getElementById("sourceSelect").value = currentSource;
    }
}

function updateUI() {
    document.getElementById("appTitle").textContent = currentTitle;
    document.title = currentTitle;

    const combined = [...localData, ...dataList];
    renderList(combined);
    renderIndex(combined);
    renderHistory();
}

function showTooltip(text) {
    const tooltip = document.getElementById("tooltip");
    tooltip.textContent = text;
    tooltip.style.opacity = 1;
    setTimeout(() => { tooltip.style.opacity = 0; }, 2000);
}

function copyText(text) {
    navigator.clipboard.writeText(text).then(() => showTooltip(`已複製: ${text}`));
}

/**
 * 渲染資料列表 (按字母分組)
 */
function renderList(list) {
    const box = document.getElementById("results");
    if (!list || list.length === 0) {
        box.innerHTML = `<div class="no-result">查無資料</div>`;
        return;
    }

    // 排序
    list.sort((a, b) => (a.abbr || "").localeCompare(b.abbr || ""));

    // 分組
    const groups = {};
    list.forEach(item => {
        let firstChar = (item.abbr || "#").charAt(0).toUpperCase();
        if (!/[A-Z]/.test(firstChar)) firstChar = "#";
        if (!groups[firstChar]) groups[firstChar] = [];
        groups[firstChar].push(item);
    });

    let html = "";
    Object.keys(groups).sort().forEach(group => {
        html += `<div class="group-header" id="group-${group}">${group}</div>`;
        groups[group].forEach(item => {
            html += `
                <div class="row">
                    <div class="col-abbr">
                        <button class="copy-btn" onclick="copyText('${item.abbr}')"><span class="material-icons">content_copy</span></button>
                        ${item.abbr}
                    </div>
                    <div class="col-full">
                        <button class="copy-btn" onclick="copyText('${item.full}')"><span class="material-icons">content_copy</span></button>
                        ${item.full}
                    </div>
                    <div class="col-zh">
                        <button class="copy-btn" onclick="copyText('${item.zh}')"><span class="material-icons">content_copy</span></button>
                        ${item.zh}
                    </div>
                </div>
            `;
        });
    });
    box.innerHTML = html;
}

/**
 * 渲染左側索引
 */
function renderIndex(list) {
    const indexCard = document.getElementById("indexCard");
    const chars = new Set();
    list.forEach(i => {
        let c = (i.abbr || "#").charAt(0).toUpperCase();
        chars.add(/[A-Z]/.test(c) ? c : "#");
    });

    const sortedChars = Array.from(chars).sort();
    indexCard.innerHTML = sortedChars.map(c => `
        <div class="index-letter" onclick="scrollToGroup('${c}')">${c}</div>
    `).join("");
}

function scrollToGroup(id) {
    const el = document.getElementById(`group-${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth" });
}

/**
 * 搜尋紀錄邏輯
 */
function renderHistory() {
    const historyList = document.getElementById("historyList");
    historyList.innerHTML = searchHistory.map(h => `
        <div class="history-item" onclick="quickSearch('${h}')">${h}</div>
    `).join("");
}

function addToHistory(keyword) {
    if (!keyword) return;
    searchHistory = searchHistory.filter(h => h !== keyword);
    searchHistory.unshift(keyword);
    if (searchHistory.length > 10) searchHistory.pop();
    localStorage.setItem("search_history", JSON.stringify(searchHistory));
    renderHistory();
}

function quickSearch(keyword) {
    document.getElementById("searchInput").value = keyword;
    performSearch(keyword);
}

function performSearch(kw) {
    const fullList = [...localData, ...dataList];
    renderList(kw ? search(kw, fullList) : fullList);
}

function search(keyword, list) {
    keyword = keyword.toLowerCase();
    return list.filter(item =>
        (item.abbr || "").toLowerCase().includes(keyword) ||
        (item.full || "").toLowerCase().includes(keyword) ||
        (item.zh || "").includes(keyword)
    );
}

function exportCsv() {
    const combined = [...localData, ...dataList];
    const header = ["abbr", "full", "zh"];
    const escape = v => `"${String(v || '').replace(/"/g, '""')}"`;
    const rows = combined.map(i => [escape(i.abbr), escape(i.full), escape(i.zh)].join(","));
    downloadFile("\uFEFF" + [header.join(","), ...rows].join("\r\n"), `${currentTitle}.csv`, "text/csv");
}

function exportJson() {
    const output = { title: currentTitle, items: [...localData, ...dataList] };
    downloadFile(JSON.stringify(output, null, 2), "data.json", "application/json");
}

function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type: `${type};charset=utf-8;` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showTooltip("檔案已導出");
}

function init() {
    const sel = id => document.getElementById(id);
    const addModal = sel("addModal");
    const exportModal = sel("exportModal");

    sel("searchInput").onchange = (e) => {
        const kw = e.target.value.trim();
        addToHistory(kw);
    };

    sel("searchInput").oninput = (e) => {
        performSearch(e.target.value.trim());
    };

    sel("sourceSelect").onchange = (e) => loadData(e.target.value);
    sel("addItemBtn").onclick = () => addModal.style.display = "block";
    sel("showExportBtn").onclick = () => exportModal.style.display = "block";

    sel("clearHistory").onclick = () => {
        searchHistory = [];
        localStorage.setItem("search_history", "[]");
        renderHistory();
    };

    document.querySelectorAll(".close").forEach(btn => {
        btn.onclick = () => {
            addModal.style.display = "none";
            exportModal.style.display = "none";
        };
    });

    window.onclick = (e) => {
        if (e.target == addModal) addModal.style.display = "none";
        if (e.target == exportModal) exportModal.style.display = "none";
    };

    sel("exportCsvBtn").onclick = () => { exportCsv(); exportModal.style.display = "none"; };
    sel("exportJsonBtn").onclick = () => { exportJson(); exportModal.style.display = "none"; };

    sel("saveItemBtn").onclick = () => {
        const abbr = sel("newAbbr").value.trim();
        const full = sel("newFull").value.trim();
        const zh = sel("newZh").value.trim();
        if (!abbr || !full || !zh) return alert("請完整填寫項目內容");

        localData.unshift({ abbr, full, zh });
        localStorage.setItem("local_abbr_items", JSON.stringify(localData));
        sel("newAbbr").value = sel("newFull").value = sel("newZh").value = "";
        addModal.style.display = "none";
        updateUI();
        showTooltip("項目已新增");
    };

    loadData("data.json");
}

window.addEventListener("DOMContentLoaded", init);
