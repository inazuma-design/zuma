import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCsv } from "../src/csv.mjs";

test("カンマ区切りの単純な行を配列にする", () => {
  assert.deepEqual(parseCsv("a,b,c\n1,2,3\n"), [["a", "b", "c"], ["1", "2", "3"]]);
});

test("引用符で囲まれたフィールド内のカンマ・改行・二重引用符を保持する", () => {
  const text = 'name,comment\n"山田","こんにちは, 世界\n2行目 ""引用"" です"\n';
  assert.deepEqual(parseCsv(text), [
    ["name", "comment"],
    ["山田", 'こんにちは, 世界\n2行目 "引用" です'],
  ]);
});

test("CRLF と BOM を扱い、末尾の空行を無視する", () => {
  assert.deepEqual(parseCsv("﻿a,b\r\n1,2\r\n\r\n"), [["a", "b"], ["1", "2"]]);
});

test("空フィールドと絵文字を壊さない", () => {
  assert.deepEqual(parseCsv("a,,c\n🙆‍♂️,,\n"), [["a", "", "c"], ["🙆‍♂️", "", ""]]);
});
