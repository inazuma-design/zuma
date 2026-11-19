// 作品ページを新しく開いたときは必ず先頭から表示する。
// 一覧の下のほうからカードを押して移動したとき、環境によっては前のスクロール位置が引き継がれ、
// 画像が見切れた状態で始まることがあるため。「戻る」での位置復元は邪魔しない。
(function () {
  try {
    var nav = performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
    var type = nav ? nav.type : "navigate";
    if (type !== "back_forward" && !location.hash) {
      if ("scrollRestoration" in history) history.scrollRestoration = "manual";
      window.scrollTo(0, 0);
      window.addEventListener("load", function () { window.scrollTo(0, 0); });
    }
  } catch (e) { /* 何もしない */ }
})();

// 「この作品を共有」。Web Share API が使えればシェアシートを開き、無ければ URL をコピーする。
(function () {
  var btn = document.querySelector(".share");
  if (!btn) return;
  var note = document.querySelector(".share-note");
  var url = btn.getAttribute("data-share-url");
  var title = btn.getAttribute("data-share-title");
  function say(text) {
    if (!note) return;
    note.textContent = text;
    note.hidden = false;
  }
  btn.addEventListener("click", function () {
    if (navigator.share) {
      navigator.share({ title: title, url: url }).catch(function () { /* キャンセルは何もしない */ });
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () { say("作品のURLをコピーしました"); }, function () { say(url); });
      return;
    }
    say(url);
  });
})();

// 作品ページ: 「画面いっぱいで見る」。ページ内のダイアログに 1600px の画像を出す（別タブは開かない）
(function () {
  var btn = document.querySelector(".open-full");
  var dialog = document.getElementById("work-full");
  if (!btn || !dialog || typeof dialog.showModal !== "function") return;
  var img = dialog.querySelector(".lb-img");
  btn.addEventListener("click", function () {
    img.src = btn.getAttribute("data-full");
    dialog.showModal();
    dialog.querySelector("[data-lb-close]").focus();
  });
  dialog.querySelector("[data-lb-close]").addEventListener("click", function () { dialog.close(); });
  dialog.addEventListener("click", function (e) { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener("close", function () { img.removeAttribute("src"); btn.focus(); });
})();
