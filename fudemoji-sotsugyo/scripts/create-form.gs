/**
 * デジタル筆文字 2期 卒業制作 — 登録フォームと回答スプレッドシートを一括で作る Apps Script
 *
 * 使い方（ZUMA の Google アカウントで、1 回だけ）
 *   1. https://script.google.com/ を開き「新しいプロジェクト」
 *   2. 中身をすべて消して、このファイルの内容を貼り付けて保存
 *   3. 上のプルダウンで「createGraduationForm」を選び「実行」
 *   4. 初回は「承認が必要です」→ 自分のアカウントを選び「許可」
 *   5. 下の「実行ログ」に出る 3 行（フォームURL／シートID／gid）を控える
 *
 * 作られるもの
 *   - Google フォーム「デジタル筆文字 2期 卒業制作 登録フォーム」（質問 6 つ。画像は 1 枚・10MB まで）
 *   - 回答スプレッドシート「デジタル筆文字 2期 卒業制作（回答）」。回答シートの H〜J 列に「表示順」「掲載」「作品ID」
 *   - Drive フォルダ「デジタル筆文字 2期 卒業制作」。フォームとシートはこの中に入る
 *
 * 2 回実行しても同じ名前のものがもう 1 組できるだけで、壊れません。不要なら Drive で削除してください。
 */

var FOLDER_NAME = "デジタル筆文字 2期 卒業制作";
var FORM_TITLE = "デジタル筆文字 2期 卒業制作 登録フォーム";
var SHEET_TITLE = "デジタル筆文字 2期 卒業制作（回答）";
var TERM = "デジタル筆文字 2期";

function createGraduationForm() {
  var folder = DriveApp.createFolder(FOLDER_NAME);

  // ---- フォーム ----
  var form = FormApp.create(FORM_TITLE);
  form.setDescription(
    "受講生 1 人につき 1 作品を登録します。\n" +
    "ニックネーム・作品名・ひとことは、受講生が LINE ノートに書いたものをそのまま入力してください。\n" +
    "画像は JPEG か PNG を 1 枚（10MB まで）。"
  );
  form.setCollectEmail(false);
  form.setAllowResponseEdits(false);
  form.setConfirmationMessage("登録しました。サイトには毎日 0 時すぎと 12 時すぎに反映されます（公開日 12/1 より前は表に出ません）。");

  form.addTextItem().setTitle("ニックネーム").setHelpText("講座で使っている呼び名。本名は入れない").setRequired(true);
  form.addTextItem().setTitle("作品名").setRequired(true);
  form.addParagraphTextItem().setTitle("ひとこと").setHelpText("受講生のコメント。無ければ空欄でよい");

  // ファイルアップロード質問は API で作れないため、後から手で 1 つ追加する（下の手順）。
  var instagram = form.addTextItem().setTitle("Instagram").setHelpText("本人が載せてよいと言った場合だけ。@名前 か URL");
  instagram.setRequired(false);

  form.addListItem().setTitle("講座・期").setChoiceValues([TERM]).setRequired(true);

  // ---- 回答スプレッドシート ----
  var ss = SpreadsheetApp.create(SHEET_TITLE);
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  SpreadsheetApp.flush();
  ss = SpreadsheetApp.openById(ss.getId());
  var sheet = null;
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getName().indexOf("フォームの回答") === 0 || sheets[i].getName().indexOf("Form Responses") === 0) sheet = sheets[i];
  }
  if (!sheet) sheet = sheets[sheets.length - 1];

  // 管理用の列。フォームの列（A〜G、画像列を足した後）に続けて H〜J に置く
  var lastCol = Math.max(sheet.getLastColumn(), 7);
  var headers = ["表示順", "掲載", "作品ID"];
  sheet.getRange(1, lastCol + 1, 1, headers.length).setValues([headers]).setFontWeight("bold");
  sheet.setFrozenRows(1);

  // ---- フォルダに移す ----
  DriveApp.getFileById(form.getId()).moveTo(folder);
  DriveApp.getFileById(ss.getId()).moveTo(folder);

  Logger.log("==== 控えてください ====");
  Logger.log("フォーム（編集用）: " + form.getEditUrl());
  Logger.log("フォーム（ゆゆさんに渡す回答用）: " + form.getPublishedUrl());
  Logger.log("FUDEMOJI_SHEET_ID: " + ss.getId());
  Logger.log("FUDEMOJI_SHEET_GID: " + sheet.getSheetId());
  Logger.log("フォルダ: " + folder.getUrl());
  Logger.log("");
  Logger.log("次に手で 1 つだけ: フォーム（編集用）を開き、「ひとこと」と「Instagram」の間に");
  Logger.log("「ファイルのアップロード」の質問を追加 → タイトル「作品画像」→ 必須 → 特定のファイル形式のみ許可: 画像 → 最大ファイル数 1 → 最大サイズ 10MB");
}
