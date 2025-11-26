// ===== 設定値 =====
// 許可メールアドレス（空配列ならチェックしない）
const ALLOW_EMAILS = []; // 例: ["your@mail.com"]
// 簡易トークン。空文字ならチェックしない。使う場合はURLに ?token=... を付ける
const ACCESS_TOKEN = "";

// 店名に応じてカテゴリを決める簡易ルール
function guessCategory(shop) {
  const rules = [
    { keyword: /HOKKAIDOGASU|ｻﾂﾎﾟﾛｼｽｲﾄﾞｳｷﾖｸ/i, category: "光熱費" },
    { keyword: /AMAZON|SAPPORO DRAGSTORE/i, category: "日用品" },
    { keyword: /MYB|MVF|マック|MCD/i, category: "食費" },
    { keyword: /JR|PASMO|SUICA|バス/i, category: "交通" },
  ];
  const text = (shop || "").toLowerCase();
  for (const r of rules) {
    if (r.keyword.test(text)) return r.category;
  }
  return "その他";
}

function doGet(e) {
  // 1) 認可チェック（メール or トークン）
  if (ALLOW_EMAILS.length) {
    const user = Session.getActiveUser().getEmail();
    if (!ALLOW_EMAILS.includes(user)) {
      return createError("forbidden", e);
    }
  }
  if (ACCESS_TOKEN && (!e || e.parameter.token !== ACCESS_TOKEN)) {
    return createError("forbidden", e);
  }

  // 2) データ生成
  const query = 'from:post_master@netbk.co.jp subject:"【デビットカード】ご利用のお知らせ(住信SBIネット銀行)" newer_than:120d';
  let threads;
  try {
    threads = GmailApp.search(query, 0, 50);
  } catch (err) {
    return createError(err.message || "search failed", e);
  }

  const entries = [];
  threads.forEach((th) => {
    const msg = th.getMessages().pop();
    const body = msg.getPlainBody() || msg.getBody() || "";
    const date = msg.getDate();

    const shopMatch = body.match(/利用加盟店\s*：\s*([^\r\n]+)/);
    const amountMatch = body.match(/引落金額\s*：\s*([0-9,]+(?:\.[0-9]+)?)/);

    const shop = shopMatch ? shopMatch[1].trim() : "";
    const amount = amountMatch ? Math.round(Number(amountMatch[1].replace(/,/g, ""))) : null;
    const category = guessCategory(shop);

    if (amount) {
      entries.push({
        id: msg.getId(),
        date: Utilities.formatDate(date, "Asia/Tokyo", "yyyy-MM-dd"),
        amount,
        category,
        memo: shop,
        cardCompany: "VNEOBANKデビット",
      });
    }
  });

  const json = JSON.stringify({ entries });
  const cb = e && e.parameter && e.parameter.callback;
  if (cb) {
    if (!/^[A-Za-z0-9_]+$/.test(cb)) {
      return createError("invalid callback", e);
    }
    return ContentService.createTextOutput(`${cb}(${json});`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService.createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function createError(message, e) {
  const payload = JSON.stringify({ error: message });
  const cb = e && e.parameter && e.parameter.callback;
  if (cb && /^[A-Za-z0-9_]+$/.test(cb)) {
    return ContentService.createTextOutput(`${cb}(${payload});`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(payload)
    .setMimeType(ContentService.MimeType.JSON);
}
