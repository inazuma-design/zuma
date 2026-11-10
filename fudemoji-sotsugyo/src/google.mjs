import { createSign } from "node:crypto";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly", "https://www.googleapis.com/auth/drive.readonly"];

const b64url = (obj) => Buffer.from(typeof obj === "string" ? obj : JSON.stringify(obj)).toString("base64url");

/** サービスアカウントの JSON 鍵から、トークン取得用の JWT（RS256）を作る。 */
export function createServiceAccountJwt(sa, scopes, now = new Date()) {
  const iat = Math.floor(now.getTime() / 1000);
  const header = b64url({ alg: "RS256", typ: "JWT" });
  const payload = b64url({ iss: sa.client_email, scope: scopes.join(" "), aud: sa.token_uri || "https://oauth2.googleapis.com/token", iat, exp: iat + 3600 });
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${payload}`);
  const signature = signer.sign(sa.private_key).toString("base64url");
  return { jwt: `${header}.${payload}.${signature}`, tokenUri: sa.token_uri || "https://oauth2.googleapis.com/token" };
}

async function expectOk(res, what) {
  if (res.ok) return res;
  let detail = "";
  try { detail = (await res.text()).slice(0, 300); } catch { /* ignore */ }
  throw new Error(`${what} に失敗しました: HTTP ${res.status} ${res.statusText} ${detail}`.trim());
}

/**
 * 本番の推奨。GitHub Secrets のサービスアカウント鍵で Sheets API / Drive API を読み取り専用で使う。
 * スプレッドシートと画像フォルダは、サービスアカウントのメールアドレスに「閲覧者」として共有しておく。
 */
export function serviceAccountSource({ serviceAccount, sheetId, gid, fetchImpl = fetch }) {
  if (!serviceAccount?.client_email || !serviceAccount?.private_key) throw new Error("サービスアカウントの JSON に client_email / private_key がありません");
  let tokenPromise = null;
  const token = () => {
    tokenPromise ??= (async () => {
      const { jwt, tokenUri } = createServiceAccountJwt(serviceAccount, SCOPES);
      const body = new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt });
      const res = await expectOk(await fetchImpl(tokenUri, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body }), "アクセストークンの取得");
      const json = await res.json();
      if (!json.access_token) throw new Error("アクセストークンが返されませんでした");
      return json.access_token;
    })();
    return tokenPromise;
  };
  const get = async (url, what) => expectOk(await fetchImpl(url, { headers: { Authorization: `Bearer ${await token()}` } }), what);

  return {
    name: "service-account",
    async loadRows() {
      const meta = await (await get(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}?fields=sheets.properties`, "スプレッドシート情報の取得")).json();
      const sheet = (meta.sheets || []).find((s) => String(s.properties?.sheetId) === String(gid));
      if (!sheet) throw new Error(`gid=${gid} のシートが見つかりません`);
      const range = encodeURIComponent(`'${sheet.properties.title.replace(/'/g, "''")}'`);
      const data = await (await get(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values/${range}?majorDimension=ROWS`, "シートの値の取得")).json();
      return (data.values || []).map((r) => r.map((c) => String(c ?? "")));
    },
    async loadImage(ref) {
      // ファイル ID は英数字と - _ だけ。ドットや日本語を含むならファイル名として共有フォルダ内を探す
      let fileId = ref;
      if (/[^A-Za-z0-9_-]/.test(ref)) {
        const q = encodeURIComponent(`name = '${ref.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}' and trashed = false`);
        const found = await (await get(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,size)&includeItemsFromAllDrives=true&supportsAllDrives=true&pageSize=10`, `画像「${ref}」の検索`)).json();
        const files = found.files || [];
        if (files.length === 0) throw new Error(`画像「${ref}」が共有フォルダに見つかりません（ファイル名を確認してください）`);
        if (files.length > 1) throw new Error(`画像「${ref}」が ${files.length} 件あります（同名のファイルを片方消すか、名前を変えてください）`);
        fileId = files[0].id;
      }
      const id = encodeURIComponent(fileId);
      const info = await (await get(`https://www.googleapis.com/drive/v3/files/${id}?fields=mimeType,size,name&supportsAllDrives=true`, `画像 ${fileId} の情報取得`)).json();
      if (!IMAGE_MIME.has(info.mimeType)) throw new Error(`対応していないファイル形式です: ${info.mimeType}（JPEG/PNG のみ）`);
      if (Number(info.size) > MAX_IMAGE_BYTES) throw new Error(`画像が 10MB を超えています（${info.size} bytes）`);
      const res = await get(`https://www.googleapis.com/drive/v3/files/${id}?alt=media&supportsAllDrives=true`, `画像 ${fileId} のダウンロード`);
      return Buffer.from(await res.arrayBuffer());
    },
  };
}

/**
 * 代替案。スプレッドシートを「リンクを知っている全員が閲覧可」で公開し、gviz の CSV を読む。
 * 画像も公開フォルダに置く必要がある。管理者（ZUMA）の同意のもとで使う。
 */
export function publicCsvSource({ sheetId, gid, fetchImpl = fetch }) {
  return {
    name: "public-csv",
    async loadRows() {
      const { parseCsv } = await import("./csv.mjs");
      const res = await expectOk(await fetchImpl(`https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}/gviz/tq?tqx=out:csv&gid=${encodeURIComponent(gid)}`), "公開 CSV の取得");
      const text = await res.text();
      if (/<html/i.test(text.slice(0, 200))) throw new Error("スプレッドシートが公開されていないため CSV を取得できません（ログインページが返されました）");
      return parseCsv(text);
    },
    async loadImage(fileId) {
      const res = await expectOk(await fetchImpl(`https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=download`), `画像 ${fileId} のダウンロード`);
      const type = res.headers.get("content-type") || "";
      if (/text\/html/i.test(type)) throw new Error(`画像 ${fileId} は公開されていないか、ダウンロード確認画面が返されました`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > MAX_IMAGE_BYTES) throw new Error("画像が 10MB を超えています");
      return buf;
    },
  };
}
