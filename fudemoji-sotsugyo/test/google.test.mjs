import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, createVerify } from "node:crypto";
import { createServiceAccountJwt, serviceAccountSource, publicCsvSource } from "../src/google.mjs";

const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048, privateKeyEncoding: { type: "pkcs8", format: "pem" }, publicKeyEncoding: { type: "spki", format: "pem" } });
const sa = { client_email: "bot@example.iam.gserviceaccount.com", private_key: privateKey, token_uri: "https://oauth2.googleapis.com/token" };

test("サービスアカウントの JWT は RS256 で署名され、必要なクレームを持つ", () => {
  const { jwt } = createServiceAccountJwt(sa, ["https://www.googleapis.com/auth/drive.readonly"], new Date("2026-11-01T00:00:00Z"));
  const [h, p, s] = jwt.split(".");
  assert.deepEqual(JSON.parse(Buffer.from(h, "base64url")), { alg: "RS256", typ: "JWT" });
  const payload = JSON.parse(Buffer.from(p, "base64url"));
  assert.equal(payload.iss, sa.client_email);
  assert.equal(payload.aud, sa.token_uri);
  assert.equal(payload.scope, "https://www.googleapis.com/auth/drive.readonly");
  assert.equal(payload.exp - payload.iat, 3600);
  const { publicKey } = generateKeyPairSync("rsa", { modulusLength: 1024, publicKeyEncoding: { type: "spki", format: "pem" }, privateKeyEncoding: { type: "pkcs8", format: "pem" } });
  const v = createVerify("RSA-SHA256"); v.update(`${h}.${p}`);
  assert.equal(v.verify(publicKey, Buffer.from(s, "base64url")), false, "別の鍵では検証に失敗する");
});

test("service-account ソースはトークンを取り、gid からシート名を引いて値を読み、Drive の画像を取得する", async () => {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url: String(url), auth: init.headers?.Authorization });
    const u = String(url);
    if (u.startsWith("https://oauth2.googleapis.com/token")) return new Response(JSON.stringify({ access_token: "tok", expires_in: 3600 }));
    if (u.includes("/spreadsheets/SHEET?")) return new Response(JSON.stringify({ sheets: [{ properties: { sheetId: 0, title: "別のシート" } }, { properties: { sheetId: 526291811, title: "フォームの回答 1" } }] }));
    if (u.includes("/values/")) {
      assert.ok(u.includes(encodeURIComponent("'フォームの回答 1'")), u);
      return new Response(JSON.stringify({ values: [["ニックネーム", "作品名"], ["A", "B"]] }));
    }
    if (u.includes("/drive/v3/files/IMG?") && u.includes("fields=")) return new Response(JSON.stringify({ mimeType: "image/png", size: "123", name: "a.png" }));
    if (u.includes("/drive/v3/files/IMG?alt=media")) return new Response(Buffer.from("PNGDATA"));
    throw new Error("unexpected " + u);
  };
  const src = serviceAccountSource({ serviceAccount: sa, sheetId: "SHEET", gid: "526291811", fetchImpl });
  assert.deepEqual(await src.loadRows(), [["ニックネーム", "作品名"], ["A", "B"]]);
  assert.equal((await src.loadImage("IMG")).toString(), "PNGDATA");
  assert.ok(calls.filter((c) => c.url.startsWith("https://oauth2")).length === 1, "トークンは1回だけ取る");
  assert.ok(calls.filter((c) => !c.url.startsWith("https://oauth2")).every((c) => c.auth === "Bearer tok"));
});

test("service-account ソースは 10MB 超や画像以外の Drive ファイルを拒否する", async () => {
  const fetchImpl = async (url) => {
    const u = String(url);
    if (u.startsWith("https://oauth2")) return new Response(JSON.stringify({ access_token: "tok" }));
    if (u.includes("/files/BIG?")) return new Response(JSON.stringify({ mimeType: "image/jpeg", size: String(11 * 1024 * 1024) }));
    if (u.includes("/files/HEIC?")) return new Response(JSON.stringify({ mimeType: "image/heic", size: "100" }));
    throw new Error("unexpected " + u);
  };
  const src = serviceAccountSource({ serviceAccount: sa, sheetId: "S", gid: "0", fetchImpl });
  await assert.rejects(src.loadImage("BIG"), /10MB/);
  await assert.rejects(src.loadImage("HEIC"), /image\/heic/);
});

test("API がエラーを返したら理由つきで例外にする", async () => {
  const fetchImpl = async (url) => {
    if (String(url).startsWith("https://oauth2")) return new Response(JSON.stringify({ access_token: "tok" }));
    return new Response("Forbidden", { status: 403, statusText: "Forbidden" });
  };
  const src = serviceAccountSource({ serviceAccount: sa, sheetId: "S", gid: "0", fetchImpl });
  await assert.rejects(src.loadRows(), /403/);
});

test("public-csv ソースは gviz の CSV を読み、Drive の公開ダウンロード URL から画像を取る", async () => {
  const fetchImpl = async (url) => {
    const u = String(url);
    if (u.startsWith("https://docs.google.com/spreadsheets/d/S/gviz/tq?tqx=out:csv&gid=7")) return new Response('"a","b"\n"1","2"\n');
    if (u.startsWith("https://drive.usercontent.google.com/download?id=IMG&export=download")) return new Response(Buffer.from("JPG"), { headers: { "content-type": "image/jpeg" } });
    if (u.includes("id=HTML")) return new Response("<html>login</html>", { headers: { "content-type": "text/html" } });
    throw new Error("unexpected " + u);
  };
  const src = publicCsvSource({ sheetId: "S", gid: "7", fetchImpl });
  assert.deepEqual(await src.loadRows(), [["a", "b"], ["1", "2"]]);
  assert.equal((await src.loadImage("IMG")).toString(), "JPG");
  await assert.rejects(src.loadImage("HTML"), /公開されていない/);
});

test("service-account ソースはファイル名を渡されたら共有フォルダ内を名前で探してダウンロードする", async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    const u = String(url); calls.push(u);
    if (u.startsWith("https://oauth2")) return new Response(JSON.stringify({ access_token: "tok" }));
    if (u.startsWith("https://www.googleapis.com/drive/v3/files?")) {
      assert.ok(u.includes(encodeURIComponent("name = 'はなこ_希望.jpg'")), u);
      return new Response(JSON.stringify({ files: [{ id: "FOUND1", name: "はなこ_希望.jpg", mimeType: "image/jpeg", size: "100" }] }));
    }
    if (u.includes("/files/FOUND1?") && u.includes("fields=")) return new Response(JSON.stringify({ mimeType: "image/jpeg", size: "100" }));
    if (u.includes("/files/FOUND1?alt=media")) return new Response(Buffer.from("JPG"));
    throw new Error("unexpected " + u);
  };
  const src = serviceAccountSource({ serviceAccount: sa, sheetId: "S", gid: "0", fetchImpl });
  assert.equal((await src.loadImage("はなこ_希望.jpg")).toString(), "JPG");
});

test("service-account ソースは名前で見つからない・複数見つかるとき理由つきで失敗する", async () => {
  const mk = (files) => async (url) => {
    const u = String(url);
    if (u.startsWith("https://oauth2")) return new Response(JSON.stringify({ access_token: "tok" }));
    if (u.startsWith("https://www.googleapis.com/drive/v3/files?")) return new Response(JSON.stringify({ files }));
    throw new Error("unexpected " + u);
  };
  await assert.rejects(serviceAccountSource({ serviceAccount: sa, sheetId: "S", gid: "0", fetchImpl: mk([]) }).loadImage("ない.jpg"), /見つかりません/);
  await assert.rejects(serviceAccountSource({ serviceAccount: sa, sheetId: "S", gid: "0", fetchImpl: mk([{ id: "a" }, { id: "b" }]) }).loadImage("重複.jpg"), /2 件/);
});
