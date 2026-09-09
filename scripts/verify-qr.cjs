/* 用純 JS 解碼 site-qr.png，確認掃得出新網址 */
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const jsQR = require('jsqr');

const root = path.join(__dirname, '..');

function decode(rel) {
  const p = path.join(root, rel);
  const png = PNG.sync.read(fs.readFileSync(p));
  const r = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  return r ? r.data : null;
}

const expected = 'https://www.hauterglobal.com/';

const targets = [
  ['新 QR（要上線）  ', 'assets/images/site-qr.png'],
  ['舊 QR（備份對照）', 'assets/images/site-qr.old-vercel.png'],
];

for (const [label, rel] of targets) {
  const d = decode(rel);
  console.log(label + ' ：' + (d ? JSON.stringify(d) : '(解碼失敗)'));
}

const got = decode('assets/images/site-qr.png');
console.log('\n預期           ：' + JSON.stringify(expected));
console.log(got === expected
  ? '✅ 實際解碼成功，內容正確 — 這張 QR 掃得到新網址'
  : '❌ 內容不符或掃不出來');
process.exit(got === expected ? 0 : 1);
