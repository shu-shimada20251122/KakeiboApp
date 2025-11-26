// IDを持たない古いデータにUUIDを付与してから保持
let entries = normalizeEntries(loadEntries());
saveEntries(entries);

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
const submitBtn = form.querySelector('button[type="submit"]');
const periodLabel = document.getElementById("period-label");
const prevPeriodBtn = document.getElementById("prev-period");
const nextPeriodBtn = document.getElementById("next-period");
const viewMonthBtn = document.getElementById("view-month");
const viewWeekBtn = document.getElementById("view-week");
const newCategoryInput = document.getElementById("new-category");
const addCategoryBtn = document.getElementById("add-category-btn");
const categoryBreakdown = document.getElementById("category-breakdown");
const lastImportLabel = document.getElementById("last-import");
const importUrlInput = document.getElementById("import-url");
const saveImportUrlBtn = document.getElementById("save-import-url");

// Chart.js用の参照
let pieChart, trendChart;
const chartColors = [
  "#2563eb", // blue
  "#f97316", // orange
  "#22c55e", // green
  "#a855f7", // purple
  "#0ea5e9", // sky
  "#ef4444", // red
  "#14b8a6", // teal
  "#f59e0b", // amber
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#10b981", // emerald
];
// 編集中のIDを保持（nullなら新規）
let editingId = null;
// 表示している基準日とビュー種別
let currentDate = new Date();
let currentView = "month"; // "month" | "week"
// カテゴリ管理
const defaultCategories = ["食費", "交通", "日用品", "娯楽", "光熱費", "その他"];
let categories = loadCategories();
// entriesに含まれるカテゴリがあればカテゴリリストに統合
mergeCategoriesFromEntries();
// 最終取り込み日時
let lastImportAt = loadLastImport();
renderLastImport();
let importUrl = loadImportUrl();
renderImportUrl();

// 画面初期描画
renderAll();

// 入力送信イベント
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const base = {
    date: dateInput.value,
    amount: Number(amountInput.value),
    category: categoryInput.value,
    memo: memoInput.value.trim(),
  };
  if (!base.date || !base.amount) return;

  // 新規追加のみフォームで扱う
  entries.push({ id: crypto.randomUUID(), ...base });

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
addCategoryBtn.addEventListener("click", () => {
  const name = (newCategoryInput.value || "").trim();
  if (!name) return;
  if (!categories.includes(name)) {
    categories.push(name);
    saveCategories();
    renderCategoryOptions();
    renderAll();
  }
  newCategoryInput.value = "";
});
saveImportUrlBtn.addEventListener("click", () => {
  const url = (importUrlInput.value || "").trim();
  if (!url) return;
  saveImportUrl(url);
  alert("取り込みURLを保存しました（ローカルのみ）。");
});
// 月/週切り替え
viewMonthBtn.addEventListener("click", () => {
  currentView = "month";
  viewMonthBtn.classList.add("active");
  viewWeekBtn.classList.remove("active");
  renderAll();
});
viewWeekBtn.addEventListener("click", () => {
  currentView = "week";
  viewWeekBtn.classList.add("active");
  viewMonthBtn.classList.remove("active");
  renderAll();
});
prevPeriodBtn.addEventListener("click", () => {
  currentDate = addPeriod(currentDate, currentView, -1);
  renderAll();
});
nextPeriodBtn.addEventListener("click", () => {
  currentDate = addPeriod(currentDate, currentView, 1);
  renderAll();
});
// 一覧の編集/削除ボタン（イベント委譲でクリックを拾う）
listBody.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const id = btn.dataset.id;
  const entry = entries.find((item) => item.id === id);
  if (!entry) return;

  if (btn.dataset.action === "edit") {
    if (editingId === id) {
      // 保存動作
      const row = btn.closest("tr");
      const updated = {
        date: row.querySelector('[data-field="date"]')?.value,
        amount: Number(row.querySelector('[data-field="amount"]')?.value),
        category: row.querySelector('[data-field="category"]')?.value,
        memo: row.querySelector('[data-field="memo"]')?.value.trim(),
      };
      if (!updated.date || !updated.amount) return;
      entries = entries.map((item) => (item.id === id ? { ...item, ...updated } : item));
      editingId = null;
      saveEntries(entries);
      renderAll();
    } else {
      // 編集モードに入る
      editingId = id;
      renderAll();
    }
  }

  if (btn.dataset.action === "delete") {
    editingId = editingId === id ? null : editingId;
    entries = entries.filter((item) => item.id !== id);
    saveEntries(entries);
    renderAll();
  }
});

// ---- 関数群 ----

// localStorage保存/読込
function saveEntries(data) {
  localStorage.setItem("kakeiboEntries", JSON.stringify(data));
}
function loadEntries() {
  const raw = localStorage.getItem("kakeiboEntries");
  return raw ? JSON.parse(raw) : [];
}
// カテゴリ保存/読込
function saveCategories() {
  localStorage.setItem("kakeiboCategories", JSON.stringify(categories));
}
function loadCategories() {
  const raw = localStorage.getItem("kakeiboCategories");
  const loaded = raw ? JSON.parse(raw) : defaultCategories;
  return Array.from(new Set([...defaultCategories, ...loaded]));
}
// 取り込み日時保存/読込
function saveLastImport(value) {
  localStorage.setItem("kakeiboLastImport", value || "");
}
function loadLastImport() {
  return localStorage.getItem("kakeiboLastImport") || "";
}
// 取り込みURL 保存/読込
function saveImportUrl(value) {
  importUrl = value || "";
  localStorage.setItem("kakeiboImportUrl", importUrl);
}
function loadImportUrl() {
  return localStorage.getItem("kakeiboImportUrl") || "";
}
function mergeCategoriesFromEntries() {
  const all = new Set(categories);
  entries.forEach((e) => {
    if (e.category) all.add(e.category);
  });
  categories = Array.from(all);
  saveCategories();
  renderCategoryOptions();
}
// IDがないレコードにUUIDを振る
function normalizeEntries(list) {
  return (list || []).map((e) => (e.id ? e : { ...e, id: crypto.randomUUID() }));
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

// 指定した日付を含む週の開始日（月曜）と終了日（日曜）を返す
function getWeekRange(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0:日曜
  const diffToMonday = (day + 6) % 7; // 月曜を週の始まりとする
  const monday = new Date(d);
  monday.setDate(d.getDate() - diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: monday, end: sunday };
}

// YYYY-MM-DD形式の日付文字列から週ラベルを生成
function getWeekLabel(dateStr) {
  if (!dateStr) return "";
  const { start, end } = getWeekRange(dateStr);
  const fmt = (d) => d.toISOString().slice(0, 10);
  return `${fmt(start)}~${fmt(end)}`;
}

// 現在のビュー（月/週）に応じて基準日を進める
function addPeriod(date, view, delta) {
  const d = new Date(date);
  if (view === "month") {
    d.setMonth(d.getMonth() + delta);
    d.setDate(1);
  } else {
    d.setDate(d.getDate() + delta * 7);
  }
  return d;
}

// 現在ビューに応じた期間フィルタ
function filterByPeriod(list, date, view) {
  const d = new Date(date);
  if (view === "month") {
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return list.filter((e) => e.date?.startsWith(ym));
  } else {
    const { start, end } = getWeekRange(d);
    const startStr = start.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);
    return list.filter((e) => e.date && e.date >= startStr && e.date <= endStr);
  }
}

// 期間ラベル更新
function updatePeriodLabel(date, view) {
  if (!periodLabel) return;
  const d = new Date(date);
  if (view === "month") {
    periodLabel.textContent = `${d.getFullYear()}年 ${d.getMonth() + 1}月`;
  } else {
    const { start, end } = getWeekRange(d);
    const fmt = (day) => `${day.getMonth() + 1}/${day.getDate()}`;
    periodLabel.textContent = `${fmt(start)} - ${fmt(end)}`;
  }
}
// テーブル描画
function renderList(list) {
  listBody.innerHTML = "";
  const scoped = filterByPeriod(list, currentDate, currentView);
  scoped.forEach((e) => {
    const tr = document.createElement("tr");
    const isEditing = editingId === e.id;
    const categorySelect = categories
      .map(
        (c) =>
          `<option value="${c}" ${c === e.category ? "selected" : ""}>${c}</option>`
      )
      .join("");
    tr.innerHTML = `
      <td>${isEditing ? `<input type="date" data-field="date" value="${e.date}">` : e.date}</td>
      <td>${isEditing ? `<select data-field="category">${categorySelect}</select>` : e.category}</td>
      <td>${isEditing ? `<input type="number" data-field="amount" min="0" step="1" value="${e.amount}">` : `${e.amount.toLocaleString()} 円`}</td>
      <td>${isEditing ? `<input type="text" data-field="memo" value="${e.memo || ""}">` : (e.memo || "")}</td>
      <td class="table-actions">
        <button data-action="edit" data-id="${e.id}">${isEditing ? "保存" : "編集"}</button>
        <button class="ghost" data-action="delete" data-id="${e.id}">削除</button>
      </td>
    `;
    listBody.appendChild(tr);
  });
}

// グラフ描画
function renderCharts(filteredList, scopedList) {
  // カテゴリ別は表示中期間のみ
  const byCategory = {};
  scopedList.forEach((e) => {
    byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
  });
  const pieLabels = Object.keys(byCategory);
  const pieData = Object.values(byCategory);

  // 推移グラフは現在のビューに応じて過去4期間
  const trendLabels = [];
  const trendDatasets = [];
  if (currentView === "month") {
    // 現在の月を含む過去4ヶ月
    const months = [];
    let d = new Date(currentDate);
    d.setDate(1);
    for (let i = 0; i < 4; i++) {
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months.push(ym);
      d = addPeriod(d, "month", -1);
    }
    months.reverse();
    months.forEach((ym) => trendLabels.push(ym));
  } else {
    // 現在の週を含む過去4週
    const weeks = [];
    let d = new Date(currentDate);
    for (let i = 0; i < 4; i++) {
      weeks.push(getWeekLabel(d.toISOString().slice(0, 10)));
      d = addPeriod(d, "week", -1);
    }
    weeks.reverse();
    weeks.forEach((wk) => trendLabels.push(wk));
  }

  // ラベルごとにカテゴリ別合計を集計
  categories.forEach((cat, idx) => {
    const data = trendLabels.map((label) => {
      if (currentView === "month") {
        return filteredList
          .filter((e) => e.category === cat && e.date?.startsWith(label))
          .reduce((s, e) => s + e.amount, 0);
      } else {
        return filteredList
          .filter((e) => e.category === cat && getWeekLabel(e.date) === label)
          .reduce((s, e) => s + e.amount, 0);
      }
    });
    trendDatasets.push({
      label: cat,
      data,
      backgroundColor: chartColors[idx % chartColors.length],
      stack: "stack1",
    });
  });

  // 既存グラフを破棄してから再描画
  pieChart?.destroy();
  trendChart?.destroy();
  renderCategoryBreakdown(byCategory);

  const pieCtx = document.getElementById("pie-chart").getContext("2d");
  pieChart = new Chart(pieCtx, {
    type: "pie",
    data: {
      labels: pieLabels,
      datasets: [{
        data: pieData,
        backgroundColor: pieLabels.map((_, idx) => chartColors[idx % chartColors.length]),
      }],
    },
  });

  const trendCtx = document.getElementById("trend-chart").getContext("2d");
  trendChart = new Chart(trendCtx, {
    type: "bar",
    data: {
      labels: trendLabels,
      datasets: trendDatasets,
    },
    options: {
      scales: {
        x: { stacked: true },
        y: { beginAtZero: true, stacked: true },
      },
      datasets: {
        bar: {
          borderRadius: 6,
          barPercentage: 0.65,
          categoryPercentage: 0.55,
          maxBarThickness: 36,
        },
      },
    },
  });
}

// カテゴリ別の内訳リストを描画
function renderCategoryBreakdown(byCategory) {
  if (!categoryBreakdown) return;
  const labels = Object.keys(byCategory);
  if (!labels.length) {
    categoryBreakdown.innerHTML = "<p>データがありません</p>";
    return;
  }
  categoryBreakdown.innerHTML = labels
    .map((label, idx) => {
      const color = chartColors[idx % chartColors.length];
      const amount = byCategory[label].toLocaleString();
      return `<div class="item"><span class="dot" style="background:${color}"></span><span>${label}: ${amount} 円</span></div>`;
    })
    .join("");
}

// 全体を描画するヘルパー
function renderAll() {
  const filtered = getFilteredEntries();
  const scoped = filterByPeriod(filtered, currentDate, currentView);
  updatePeriodLabel(currentDate, currentView);
  renderLastImport();
  renderList(filtered);
  summary.textContent = `合計: ${calcTotal(scoped).toLocaleString()} 円 (${currentView === "month" ? "月" : "週"}表示)`;
  renderCharts(filtered, scoped);
}

function renderLastImport() {
  if (!lastImportLabel) return;
  lastImportLabel.textContent = lastImportAt
    ? `最後の取り込み: ${new Date(lastImportAt).toLocaleString("ja-JP")}`
    : "最後の取り込み: 未実行";
}

// セレクトボックスのカテゴリを更新
function renderCategoryOptions() {
  // 入力用
  categoryInput.innerHTML = categories.map((c) => `<option value="${c}">${c}</option>`).join("");
  // フィルタ用
  filterCategory.innerHTML = `<option value="">すべて</option>` + categories.map((c) => `<option value="${c}">${c}</option>`).join("");
}

// 取り込みURLの入力欄へ反映
function renderImportUrl() {
  if (!importUrlInput) return;
  importUrlInput.value = importUrl || "";
}

async function importFromGmail() {
  try {
    if (!importUrl) {
      alert("Apps ScriptのURLを設定してください");
      return;
    }
    const res = await fetch(importUrl);
    if (!res.ok) throw new Error("fetch failed");
    const data = await res.json();
    if (Array.isArray(data.entries)) {
      const normalized = data.entries.map((item) => {
        const combinedMemo = [item.cardCompany, item.usage, item.memo].filter(Boolean).join(" / ");
        return {
          id: item.id || crypto.randomUUID(),
          date: item.date,
          amount: item.amount,
          category: item.category || "その他",
          memo: combinedMemo || "",
        };
      });
      entries.push(...normalized);
      saveEntries(entries);
      lastImportAt = new Date().toISOString();
      saveLastImport(lastImportAt);
      renderLastImport();
      renderAll();
      alert(`Gmailから${normalized.length}件取り込みました`);
    } else {
      alert("取り込みデータが不正です");
    }
  } catch (err) {
    console.error(err);
    alert("取り込みに失敗しました");
  }
}
