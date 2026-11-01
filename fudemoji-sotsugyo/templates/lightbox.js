// 作品一覧のライトボックス。ネイティブ <dialog> を使い、前後移動・Esc・フォーカス復元に対応する。
(function () {
  var dialog = document.getElementById("lightbox");
  if (!dialog || typeof dialog.showModal !== "function") return;
  var cards = Array.prototype.slice.call(document.querySelectorAll(".work-card"));
  var items = cards.map(function (card) {
    var img = card.querySelector(".work-frame img");
    return {
      slug: card.querySelector(".work-zoom").getAttribute("data-lightbox"),
      full: img.getAttribute("data-full"),
      alt: img.getAttribute("alt"),
      title: card.querySelector(".work-title").textContent,
      author: card.querySelector(".work-author").textContent,
      href: card.querySelector(".work-link").getAttribute("href")
    };
  });
  var img = dialog.querySelector(".lb-img");
  var title = dialog.querySelector(".lb-title");
  var author = dialog.querySelector(".lb-author");
  var link = dialog.querySelector(".lb-link:not(.lb-full)");
  var fullLink = dialog.querySelector(".lb-full");
  var prevBtn = dialog.querySelector("[data-lb-prev]");
  var nextBtn = dialog.querySelector("[data-lb-next]");
  var current = -1;
  var opener = null;

  function show(i) {
    if (i < 0 || i >= items.length) return;
    current = i;
    var it = items[i];
    img.src = it.full;
    img.alt = it.alt;
    title.textContent = it.title;
    author.textContent = it.author;
    link.href = it.href;
    fullLink.href = it.full;
    prevBtn.hidden = i === 0;
    nextBtn.hidden = i === items.length - 1;
  }
  function open(i, button) {
    opener = button;
    show(i);
    dialog.showModal();
    dialog.querySelector("[data-lb-close]").focus();
  }
  cards.forEach(function (card, i) {
    card.querySelector(".work-zoom").addEventListener("click", function (e) { open(i, e.currentTarget); });
  });
  dialog.querySelector("[data-lb-close]").addEventListener("click", function () { dialog.close(); });
  prevBtn.addEventListener("click", function () { show(current - 1); });
  nextBtn.addEventListener("click", function () { show(current + 1); });
  dialog.addEventListener("click", function (e) { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") { show(current - 1); e.preventDefault(); }
    if (e.key === "ArrowRight") { show(current + 1); e.preventDefault(); }
  });
  // スマホ: 左右スワイプで前後の作品へ
  var touchX = null;
  dialog.addEventListener("touchstart", function (e) { touchX = e.touches.length === 1 ? e.touches[0].clientX : null; }, { passive: true });
  dialog.addEventListener("touchend", function (e) {
    if (touchX === null) return;
    var dx = e.changedTouches[0].clientX - touchX;
    touchX = null;
    if (Math.abs(dx) < 50) return;
    show(dx < 0 ? current + 1 : current - 1);
  }, { passive: true });
  dialog.addEventListener("close", function () {
    img.removeAttribute("src");
    if (opener && typeof opener.focus === "function") opener.focus();
  });
})();
