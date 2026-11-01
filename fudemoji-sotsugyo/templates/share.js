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
