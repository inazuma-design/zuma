import { test } from "node:test";
import assert from "node:assert/strict";
import { siteUrls } from "../src/urls.mjs";

test("GitHub Pages のサブパス配下で相対パスと絶対URLを組み立てる", () => {
  const u = siteUrls({ baseUrl: "https://inazuma-design.github.io/fudemoji-sotsugyo/" });
  assert.equal(u.basePath, "/fudemoji-sotsugyo/");
  assert.equal(u.path("works/abc/"), "/fudemoji-sotsugyo/works/abc/");
  assert.equal(u.abs("works/abc/"), "https://inazuma-design.github.io/fudemoji-sotsugyo/works/abc/");
  assert.equal(u.abs(""), "https://inazuma-design.github.io/fudemoji-sotsugyo/");
  assert.equal(u.workPath("abc"), "/fudemoji-sotsugyo/works/abc/");
});

test("独自ドメイン直下でも同じ API で動く", () => {
  const u = siteUrls({ baseUrl: "https://sotsugyo.example.com" });
  assert.equal(u.basePath, "/");
  assert.equal(u.path("assets/a.webp"), "/assets/a.webp");
  assert.equal(u.abs("works/abc/"), "https://sotsugyo.example.com/works/abc/");
});

test("customDomain が設定されていれば baseUrl より優先する", () => {
  const u = siteUrls({ baseUrl: "https://inazuma-design.github.io/fudemoji-sotsugyo/", customDomain: "sotsugyo.example.com" });
  assert.equal(u.origin, "https://sotsugyo.example.com");
  assert.equal(u.basePath, "/");
});
