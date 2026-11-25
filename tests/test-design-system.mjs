import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { test } from 'node:test';

const repoRoot = new URL('../', import.meta.url);
const canonicalRaw = readFileSync(new URL('design/gongban.css', repoRoot), 'utf8').trim();
const canonicalCss = canonicalRaw.replaceAll('url("fonts/', 'url("/fonts/');

const START_MARKER = '/* gb:start — 正經工班 工具系統,與 design/gongban.css 同步,不要在這裡手改 */';
const END_MARKER = '/* gb:end */';

function extractGbBlock(filePath) {
  const content = readFileSync(new URL(filePath, repoRoot), 'utf8');
  const startIdx = content.indexOf(START_MARKER);
  assert.ok(startIdx !== -1, `${filePath} 缺少 gb:start 標記`);
  const endIdx = content.indexOf(END_MARKER, startIdx + START_MARKER.length);
  assert.ok(endIdx !== -1, `${filePath} 缺少 gb:end 標記`);
  return content.slice(startIdx + START_MARKER.length, endIdx).trim();
}

test('三個頁面的 gb:start–gb:end 區塊完全一致且與 design/gongban.css 同步', () => {
  const targets = [
    'public/styles.css',
    'public/woodcraft/index.html',
    'public/room-space/index.html'
  ];
  const blocks = targets.map(t => [t, extractGbBlock(t)]);
  for (const [file, block] of blocks) {
    assert.equal(block, canonicalCss, `${file} 的設計系統樣式與 design/gongban.css 不同步`);
  }
});

test('數字字體檔案皆存在於 public/fonts/', () => {
  const fonts = [
    'public/fonts/barlow-semi-condensed-latin-500-normal.woff2',
    'public/fonts/barlow-semi-condensed-latin-600-normal.woff2'
  ];
  for (const font of fonts) {
    const stat = statSync(new URL(font, repoRoot));
    assert.ok(stat.isFile() && stat.size > 0, `缺少字體檔 ${font}`);
  }
});
