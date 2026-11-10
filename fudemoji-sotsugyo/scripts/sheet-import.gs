/**
 * デジタル筆文字 2期 卒業制作 — フォルダに入れた画像を、自動でスプレッドシートの行にする Apps Script
 *
 * 置き場所: 回答スプレッドシート（デジタル筆文字 2期 卒業制作（回答））の「拡張機能 → Apps Script」
 *
 * 使い方（ZUMA、1 回だけ）
 *   1. スプレッドシートを開く → メニュー「拡張機能」→「Apps Script」
 *   2. 開いたエディタの中身をすべて消して、このファイルの内容を貼り付け → 保存（Ctrl+S）
 *   3. 上のプルダウンで「setup」を選んで「実行」→ 初回は「承認」→ 自分のアカウント → 「許可」
 *   4. これで 10 分ごとにフォルダを見に行き、新しい画像があれば行を足します
 *      スプレッドシートに「作品」メニューも増えるので、「今すぐ取り込む」で手動でも動かせます
 *
 * 動き
 *   - フォルダ直下の JPEG / PNG / WebP を、アップロードされた順に見る
 *   - ファイル名が「ニックネーム_作品名.jpg」なら、ニックネームと作品名を自動で入れる
 *     （区切りは _ か ＿ か 全角スペース。区切りが無ければニックネームだけ入れる）
 *   - すでにシートの「作品画像」にあるファイル名は飛ばす（2 重登録しない）
 *   - 「ひとこと」「Instagram」は空のまま。あとで手で書く
 *   - ファイルをフォルダから消しても行は消えない。その行は「掲載」に × を入れる
 */

var FOLDER_ID = "139mA7utKwxHldd37ESj-92B2XzUpXuqd";
var SHEET_NAME = "フォームの回答 1";
var TERM = "デジタル筆文字 2期";
var IMAGE_TYPES = { "image/jpeg": 1, "image/png": 1, "image/webp": 1 };

function onOpen() {
  SpreadsheetApp.getUi().createMenu("作品").addItem("今すぐ取り込む（フォルダ → シート）", "importFromFolder").addToUi();
}

/** 10 分ごとの自動実行を登録する。何度実行しても 1 つだけになる。 */
function setup() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "importFromFolder") ScriptApp.deleteTrigger(triggers[i]);
  }
  ScriptApp.newTrigger("importFromFolder").timeBased().everyMinutes(10).create();
  var n = importFromFolder();
  SpreadsheetApp.getActive().toast("自動取り込みを設定しました（10 分ごと）。今回 " + n + " 件を追加", "作品", 8);
}

function importFromFolder() {
  var ss = SpreadsheetApp.getActive();
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
  var header = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 7)).getValues()[0];
  var col = function (name) {
    for (var i = 0; i < header.length; i++) if (String(header[i]).indexOf(name) >= 0) return i + 1;
    return 0;
  };
  var cImage = col("作品画像"), cNick = col("ニックネーム"), cTitle = col("作品名"), cTerm = col("講座");
  if (!cImage || !cNick || !cTitle) throw new Error("見出しに「作品画像」「ニックネーム」「作品名」が見つかりません");

  // すでに登録済みのファイル名（Drive のリンクの場合は ID も）
  var known = {};
  var last = sheet.getLastRow();
  if (last >= 2) {
    var vals = sheet.getRange(2, cImage, last - 1, 1).getValues();
    for (var r = 0; r < vals.length; r++) {
      var v = String(vals[r][0] || "").trim();
      if (!v) continue;
      known[v] = true;
      var m = v.match(/[?&]id=([A-Za-z0-9_-]+)/);
      if (m) known[m[1]] = true;
    }
  }

  // フォルダ直下の画像を、アップロードされた順に
  var files = [];
  var it = DriveApp.getFolderById(FOLDER_ID).getFiles();
  while (it.hasNext()) {
    var f = it.next();
    if (!IMAGE_TYPES[f.getMimeType()]) continue;
    if (known[f.getName()] || known[f.getId()]) continue;
    files.push(f);
  }
  files.sort(function (a, b) { return a.getDateCreated() - b.getDateCreated(); });

  var added = 0;
  for (var k = 0; k < files.length; k++) {
    var name = files[k].getName();
    var base = name.replace(/\.[A-Za-z0-9]+$/, "");
    var parts = base.split(/[_＿　]/);
    var nick = parts.shift().trim();
    var title = parts.join(" ").trim();
    var row = [];
    for (var c = 0; c < header.length; c++) row.push("");
    row[cNick - 1] = nick;
    row[cTitle - 1] = title;
    row[cImage - 1] = name;
    if (cTerm) row[cTerm - 1] = TERM;
    sheet.appendRow(row);
    known[name] = true;
    added++;
  }
  return added;
}
