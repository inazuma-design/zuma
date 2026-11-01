// 開発用のダミー画像を作る（本番では使わない）。SVG から PNG/JPEG を生成する。
import sharp from "sharp";
import { writeFile, mkdir } from "node:fs/promises";
const out = "fixtures/sample-images";
await mkdir(out, { recursive: true });
const svg = (w, h, bg, ink, label, alpha = false) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
${alpha ? "" : `<rect width="100%" height="100%" fill="${bg}"/>`}
<path d="M ${w * 0.25} ${h * 0.75} C ${w * 0.3} ${h * 0.2}, ${w * 0.5} ${h * 0.2}, ${w * 0.5} ${h * 0.6} S ${w * 0.75} ${h * 0.9}, ${w * 0.78} ${h * 0.3}" fill="none" stroke="${ink}" stroke-width="${Math.min(w, h) * 0.06}" stroke-linecap="round"/>
<circle cx="${w * 0.8}" cy="${h * 0.22}" r="${Math.min(w, h) * 0.05}" fill="#B5453A"/>
<text x="50%" y="${h - 24}" text-anchor="middle" font-family="sans-serif" font-size="${Math.min(w, h) * 0.07}" fill="${ink}" opacity=".7">SAMPLE ${label}</text>
</svg>`;
const specs = [
  ["sample-01", 1800, 1200, "#F3E9DC", "#2B2620", "A", "png"],
  ["sample-02", 1200, 1800, "#FFFFFF", "#1F3A5F", "B", "jpeg"],
  ["sample-03", 1600, 1600, "#2B2620", "#F2CB9C", "C", "png"],
  ["sample-04", 1400, 1000, null, "#A85A16", "D", "png", true],
  ["sample-05", 2400, 900, "#EAF2EE", "#2E5E4E", "E", "jpeg"],
  ["sample-06", 900, 2000, "#FBEDEB", "#B5453A", "F", "png"],
];
for (const [name, w, h, bg, ink, label, fmt, alpha] of specs) {
  const buf = Buffer.from(svg(w, h, bg, ink, label, alpha));
  const img = sharp(buf);
  await writeFile(`${out}/${name}.${fmt === "jpeg" ? "jpg" : "png"}`, fmt === "jpeg" ? await img.jpeg({ quality: 88 }).toBuffer() : await img.png().toBuffer());
}
console.log("done");
