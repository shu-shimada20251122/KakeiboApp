// 保存する配列（起動時にlocalStorageから読む）
let entries = loadEntries();

// DOM取得
const form = document.getElementById("entry-form");
const dateInput = document.getElementById("date");
const amountInput = document.getElementById("amount");
const categoryInput = document.getElementById("category");
const memoInput = document.getElementById("memo");
const listBody = document.getElementById("entry-list");
const summary = document.getElementById("summary");
const startDateInput = document.getElementById("start-date");
const endDateInput = document.getElementById("end-date");
const filterCategory = document.getElementById("filter-category");
const clearFiltersBtn = document.getElementById("clear-filters");
const importBtn = document.getElementById("import-gmail");

// Chart.js用の参照
let pieChart, barChart;

// 画面初期描画
renderAll();

// 入力送信イベント
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const entry = {
    id: crypto.randomUUID(),
    date: dateInput.value,
    amount: Number(amountInput.value),
    category: categoryInput.value,
    memo: memoInput.value.trim(),
  };
  if (!entry.date || !entry.amount) return;
  entries.push(entry);
  saveEntries(entries);
  form.reset();
  renderAll();
});

// フィルタ変更イベント
[startDateInput, endDateInput, filterCategory].forEach((el) => {
  el.addEventListener("change", renderAll);
});
clearFiltersBtn.addEventListener("click", () => {
  startDateInput.value = "";
  endDateInput.value = "";
  filterCategory.value = "";
  renderAll();
});
importBtn.addEventListener("click", importFromGmail);

// ---- 関数群 ----

// localStorage保存/読込
function saveEntries(data) {
  localStorage.setItem("kakeiboEntries", JSON.stringify(data));
}
function loadEntries() {
  const raw = localStorage.getItem("kakeiboEntries");
  return raw ? JSON.parse(raw) : [];
}

// フィルタをかけた結果を返す
function getFilteredEntries() {
  return entries.filter((e) => {
    const okCategory = !filterCategory.value || e.category === filterCategory.value;
    const okStart = !startDateInput.value || e.date >= startDateInput.value;
    const okEnd = !endDateInput.value || e.date <= endDateInput.value;
    return okCategory && okStart && okEnd;
  });
}

// 合計を計算
function calcTotal(list) {
  return list.reduce((sum, e) => sum + e.amount, 0);
}

// テーブル描画
function renderList(list) {
  listBody.innerHTML = "";
  list.forEach((e) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${e.date}</td>
      <td>${e.category}</td>
      <td>${e.amount.toLocaleString()} 円</td>
      <td>${e.memo || ""}</td>
    `;
    listBody.appendChild(tr);
  });
}

// グラフ描画
function renderCharts(list) {
  const byCategory = {};
  const byMonth = {};

  list.forEach((e) => {
    byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
    const month = e.date?.slice(0, 7) || "";
    if (month) byMonth[month] = (byMonth[month] || 0) + e.amount;
  });

  const pieLabels = Object.keys(byCategory);
  const pieData = Object.values(byCategory);

  const barLabels = Object.keys(byMonth).sort();
  const barData = barLabels.map((m) => byMonth[m]);

  // 既存グラフを破棄してから再描画
  pieChart?.destroy();
  barChart?.destroy();

  const pieCtx = document.getElementById("pie-chart").getContext("2d");
  pieChart = new Chart(pieCtx, {
    type: "pie",
    data: {
      labels: pieLabels,
      datasets: [{ data: pieData, backgroundColor: ["#4f46e5","#10b981","#f59e0b","#ef4444","#6366f1","#22c55e"] }],
    },
  });

  const barCtx = document.getElementById("bar-chart").getContext("2d");
  barChart = new Chart(barCtx, {
    type: "bar",
    data: {
      labels: barLabels,
      datasets: [{ label: "月別合計", data: barData, backgroundColor: "#2d7ff9" }],
    },
    options: {
      scales: { y: { beginAtZero: true } },
    },
  });
}

// 全体を描画するヘルパー
function renderAll() {
  const filtered = getFilteredEntries();
  renderList(filtered);
  summary.textContent = `合計: ${calcTotal(filtered).toLocaleString()} 円`;
  renderCharts(filtered);
}

// Gmailから取り込む（Apps ScriptのURLを設定して使う）
const IMPORT_URL = "https://script.google.com/macros/s/AKfycbw7AVRWBX9QAA0u12NsAtjcywYpzHrruVCT0I_S6xFLEAUfDDu_G-AoaLKvfF1119Ra/exec";

async function importFromGmail() {
  try {
    const res = await fetch(IMPORT_URL);
    if (!res.ok) throw new Error("fetch failed");
    const data = await res.json();
    if (Array.isArray(data.entries)) {
      entries.push(...data.entries);
      saveEntries(entries);
      renderAll();
      alert(`Gmailから${data.entries.length}件取り込みました`);
    } else {
      alert("取り込みデータが不正です");
    }
  } catch (err) {
    console.error(err);
    alert("取り込みに失敗しました");
  }
}
