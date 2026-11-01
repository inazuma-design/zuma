import { test } from "node:test";
import assert from "node:assert/strict";
import { rowsToWorks, normalizeInstagram, slugFor } from "../src/parse.mjs";

const HEADER = ["タイムスタンプ", "ニックネーム", "作品名", "ひとこと", "作品画像", "Instagram", "講座・期", "表示順", "掲載"];
const DRIVE = (id) => `https://drive.google.com/open?id=${id}`;
const row = (o) => [
  o.ts ?? "2026/11/10 10:00:00",
  o.nick ?? "はなこ",
  o.title ?? "希望",
  o.comment ?? "",
  o.image ?? DRIVE("fileA"),
  o.insta ?? "",
  o.term ?? "デジタル筆文字 2期",
  o.order ?? "",
  o.listed ?? "",
];
const parse = (rows, opt = {}) => rowsToWorks([HEADER, ...rows], { term: "デジタル筆文字 2期", ...opt });

test("1行を Work に変換し、Drive の URL からファイルIDを取り出す", () => {
  const { works, warnings } = parse([row({ comment: "はじめての作品です" })]);
  assert.equal(warnings.length, 0);
  assert.equal(works.length, 1);
  const w = works[0];
  assert.equal(w.id, "fileA");
  assert.equal(w.nickname, "はなこ");
  assert.equal(w.title, "希望");
  assert.equal(w.comment, "はじめての作品です");
  assert.equal(w.instagramUrl, null);
  assert.equal(w.term, "デジタル筆文字 2期");
  assert.ok(w.submittedAt instanceof Date);
});

test("必須項目（ニックネーム・作品名・画像）が欠けた行はスキップして警告する", () => {
  const { works, warnings } = parse([row({ nick: " " }), row({ title: "" , image: DRIVE("b")}), row({ image: "" })]);
  assert.equal(works.length, 0);
  assert.equal(warnings.length, 3);
  assert.match(warnings[0], /行 2/);
});

test("掲載が × の行は除外し、空欄は掲載する", () => {
  const { works } = parse([row({ listed: "×", image: DRIVE("x") }), row({ listed: "", image: DRIVE("y") }), row({ listed: "x", image: DRIVE("z") })]);
  assert.deepEqual(works.map((w) => w.id), ["y"]);
});

test("講座・期が一致しない行は除外する", () => {
  const { works } = parse([row({ term: "ラフ講座 1期", image: DRIVE("r") }), row({ image: DRIVE("ok") })]);
  assert.deepEqual(works.map((w) => w.id), ["ok"]);
});

test("表示順が数値の行を先に昇順で、残りはタイムスタンプ順（同値は入力順）で並べる", () => {
  const { works } = parse([
    row({ ts: "2026/11/12 09:00:00", image: DRIVE("c") }),
    row({ ts: "2026/11/10 09:00:00", image: DRIVE("a"), order: "2" }),
    row({ ts: "2026/11/11 09:00:00", image: DRIVE("b") }),
    row({ ts: "2026/11/11 09:00:00", image: DRIVE("b2") }),
    row({ ts: "2026/11/13 09:00:00", image: DRIVE("d"), order: "1" }),
    row({ ts: "2026/11/09 09:00:00", image: DRIVE("e"), order: "abc" }),
  ]);
  assert.deepEqual(works.map((w) => w.id), ["d", "a", "e", "b", "b2", "c"]);
});

test("同じ画像IDの重複行は後の行をスキップして警告する", () => {
  const { works, warnings } = parse([row({ image: DRIVE("dup") }), row({ image: DRIVE("dup"), nick: "別の人" })]);
  assert.equal(works.length, 1);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /重複/);
});

test("同じニックネームの複数行は掲載したまま警告だけ出す", () => {
  const { works, warnings } = parse([row({ image: DRIVE("p") }), row({ image: DRIVE("q") })]);
  assert.equal(works.length, 2);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /ニックネーム/);
});

test("作品ID列（管理用）があればそれを ID として優先する", () => {
  const rows = [[...HEADER, "作品ID"], [...row({ image: DRIVE("file1") }), "stable-01"]];
  const { works } = rowsToWorks(rows, { term: "デジタル筆文字 2期" });
  assert.equal(works[0].id, "stable-01");
  assert.equal(works[0].driveFileId, "file1");
});

test("列の順番が変わっても見出し名で読む", () => {
  const rows = [["作品名", "ニックネーム", "作品画像", "講座・期", "タイムスタンプ"], ["A", "B", DRIVE("f"), "デジタル筆文字 2期", "2026/11/01 00:00:00"]];
  const { works } = rowsToWorks(rows, { term: "デジタル筆文字 2期" });
  assert.equal(works[0].title, "A");
  assert.equal(works[0].nickname, "B");
});

test("長すぎる文章は切り詰めて警告する", () => {
  const { works, warnings } = parse([row({ comment: "あ".repeat(1001) })]);
  assert.equal(works[0].comment.length, 1000);
  assert.match(warnings[0], /ひとこと/);
});

test("normalizeInstagram は @name と各種URLを正規URLにし、不正は null", () => {
  assert.equal(normalizeInstagram("@hana_ko"), "https://www.instagram.com/hana_ko/");
  assert.equal(normalizeInstagram("hana.ko"), "https://www.instagram.com/hana.ko/");
  assert.equal(normalizeInstagram("https://www.instagram.com/hirac_han?srtk=abc&utm_source=qr"), "https://www.instagram.com/hirac_han/");
  assert.equal(normalizeInstagram("instagram.com/abc/"), "https://www.instagram.com/abc/");
  assert.equal(normalizeInstagram("https://instagram.com/abc/reel/xyz"), "https://www.instagram.com/abc/");
  assert.equal(normalizeInstagram("https://example.com/abc"), null);
  assert.equal(normalizeInstagram("<script>"), null);
  assert.equal(normalizeInstagram(""), null);
  assert.equal(normalizeInstagram("a".repeat(31)), null);
});

test("slugFor は同じIDから常に同じ slug を返し、IDが違えば変わる", () => {
  const s1 = slugFor("fileA");
  assert.equal(s1, slugFor("fileA"));
  assert.notEqual(s1, slugFor("fileB"));
  assert.match(s1, /^[a-z0-9]{10}$/);
});
