let dataList = [];
let localData = JSON.parse(localStorage.getItem("local_abbr_items") || "[]");
let currentTitle = "專業英文縮寫查詢";
let currentSource = "data.json";

/**
 * 載入資料
 * @param {string} url - JSON 檔案路徑
 */
async function loadData(url) {
    if (url === "custom") {
        const customUrl = prompt("請輸入 JSON 檔案的 URL:", "https://example.com/data.json");
        if (customUrl) {
            url = customUrl;
        } else {
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
        console.error("Error loading data:", error);
        showTooltip("無法載入資料，請確認路徑正確且支援 CORS");
        document.getElementById("sourceSelect").value = currentSource;
    }
}

/**
 * 更新 UI 標題與列表
 */
function updateUI() {
    document.getElementById("appTitle").textContent = currentTitle;
    document.title = currentTitle;

    // 合併遠端資料與本地新增資料
    const combinedList = [...localData, ...dataList];
    renderList(combinedList);
}

/**
 * 顯示提示訊息
 */
function showTooltip(text) {
    const tooltip = document.getElementById("tooltip");
    tooltip.textContent = text;
    tooltip.style.opacity = 1;
    setTimeout(() => { tooltip.style.opacity = 0; }, 2000);
}

/**
 * 複製內容
 */
function copyText(text) {
    navigator.clipboard.writeText(text).then(() => {
        showTooltip(`已複製: ${text}`);
    });
}

/**
 * 渲染資料列表
 */
function renderList(list) {
    const resultBox = document.getElementById("results");

    if (!list || list.length === 0) {
        resultBox.innerHTML = `<div class="no-result">查與資料</div>`;
        return;
    }

    let html = "";
    list.forEach(item => {
        html += `
            <div class="row">
                <div class="col-abbr">
                    <button class="copy-btn" title="複製" onclick="copyText('${item.abbr}')">
                        <span class="material-icons">content_copy</span>
                    </button>
                    ${item.abbr}
                </div>
                <div class="col-full">
                    <button class="copy-btn" title="複製" onclick="copyText('${item.full}')">
                        <span class="material-icons">content_copy</span>
                    </button>
                    ${item.full}
                </div>
                <div class="col-zh">
                    <button class="copy-btn" title="複製" onclick="copyText('${item.zh}')">
                        <span class="material-icons">content_copy</span>
                    </button>
                    ${item.zh}
                </div>
            </div>
        `;
    });
    resultBox.innerHTML = html;
}

/**
 * 模糊搜尋
 */
function search(keyword, list) {
    keyword = keyword.toLowerCase();
    return list.filter(item =>
        (item.abbr || "").toLowerCase().includes(keyword) ||
        (item.full || "").toLowerCase().includes(keyword) ||
        (item.zh || "").includes(keyword)
    );
}

/**
 * 匯出 CSV
 */
function exportCsv() {
    const combinedList = [...localData, ...dataList];
    if (combinedList.length === 0) {
        showTooltip("沒有可匯出的資料");
        return;
    }

    const header = ["abbr", "full", "zh"];
    const escapeCell = (value) => {
        if (value === null || value === undefined) return "";
        const str = String(value).replace(/"/g, '""');
        return `"${str}"`;
    };

    const rows = combinedList.map(item => [
        escapeCell(item.abbr),
        escapeCell(item.full),
        escapeCell(item.zh)
    ].join(","));

    const csvContent = "\uFEFF" + [header.join(","), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentTitle}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showTooltip("CSV 已匯出");
}

// ------------------------------
// 初始化事件監聽
// ------------------------------
function init() {
    const searchInput = document.getElementById("searchInput");
    const exportBtn = document.getElementById("exportCsvBtn");
    const sourceSelect = document.getElementById("sourceSelect");
    const addItemBtn = document.getElementById("addItemBtn");
    const addModal = document.getElementById("addModal");
    const closeModal = document.querySelector(".close");
    const saveItemBtn = document.getElementById("saveItemBtn");

    searchInput.addEventListener("input", function () {
        const keyword = this.value.trim();
        const combinedList = [...localData, ...dataList];
        if (!keyword) {
            renderList(combinedList);
            return;
        }
        renderList(search(keyword, combinedList));
    });

    exportBtn.addEventListener("click", exportCsv);

    sourceSelect.addEventListener("change", function () {
        loadData(this.value);
    });

    // Modal 邏輯
    addItemBtn.onclick = () => addModal.style.display = "block";
    closeModal.onclick = () => addModal.style.display = "none";
    window.onclick = (event) => {
        if (event.target == addModal) addModal.style.display = "none";
    };

    saveItemBtn.onclick = () => {
        const abbr = document.getElementById("newAbbr").value.trim();
        const full = document.getElementById("newFull").value.trim();
        const zh = document.getElementById("newZh").value.trim();

        if (!abbr || !full || !zh) {
            alert("請填寫所有欄位");
            return;
        }

        const newItem = { abbr, full, zh };
        localData.unshift(newItem);
        localStorage.setItem("local_abbr_items", JSON.stringify(localData));

        // 清空並關閉
        document.getElementById("newAbbr").value = "";
        document.getElementById("newFull").value = "";
        document.getElementById("newZh").value = "";
        addModal.style.display = "none";

        showTooltip("項目已新增");
        updateUI();
    };

    // 初始載入預設資料
    loadData("data.json");
}

window.addEventListener("DOMContentLoaded", init);
