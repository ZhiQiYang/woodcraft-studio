import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { registerApp } from '../scripts/publish-app.mjs';
import { renderHome } from '../scripts/render-home.mjs';

function fixture(t) {
  const base = mkdtempSync(path.join(tmpdir(), 'test-line-app-'));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const root = path.join(base, 'repository');
  const folder = path.join(base, 'website');
  mkdirSync(path.join(root, 'public'), { recursive: true });
  mkdirSync(folder);
  writeFileSync(path.join(root, 'tools.json'), '[]');
  return { root, folder, catalog: () => JSON.parse(readFileSync(path.join(root, 'tools.json'), 'utf8')) };
}

test('單檔 HTML 由同一代號上架及改版，保留網址、顯示名稱和原有其他工具', t => {
  const { root, folder, catalog } = fixture(t);
  const file = path.join(folder, 'first.html');
  writeFileSync(file, '<h1>一</h1>');
  const app = registerApp(root, { id: '備料', source: file, name: '備料清單' });
  assert.equal(app.stage, 'trial');
  assert.equal(app.url, '/apps/' + encodeURIComponent('備料') + '/');
  registerApp(root, { id: 'other', source: 'https://example.org/other' });
  const update = path.join(folder, 'v2.html');
  writeFileSync(update, '<h1>二</h1>');
  assert.deepEqual(registerApp(root, { id: '備料', source: update }), app);
  assert.equal(readFileSync(path.join(root, 'public/apps/備料/index.html'), 'utf8'), '<h1>二</h1>');
  assert.equal(catalog().length, 2);
  assert.ok(renderHome(catalog()).includes('備料清單'));
});

test('靜態網站保留資源子目錄，更新時移除舊資源並保留日常工具狀態', t => {
  const { root, folder, catalog } = fixture(t);
  const assets = path.join(folder, 'assets');
  mkdirSync(assets);
  writeFileSync(path.join(folder, 'index.html'), '<script src="./assets/app.js"></script>');
  writeFileSync(path.join(assets, 'app.js'), 'window.ready=true;');
  writeFileSync(path.join(folder, 'old.css'), '');
  writeFileSync(path.join(folder, '.env'), 'fake-for-test');
  registerApp(root, { id: 'demo', source: folder });
  writeFileSync(path.join(root, 'tools.json'), JSON.stringify([{ ...catalog()[0], stage: 'active' }]));
  rmSync(path.join(folder, 'old.css'));
  registerApp(root, { id: 'demo', source: folder });
  const live = path.join(root, 'public/apps/demo');
  assert.equal(catalog()[0].stage, 'active');
  assert.equal(readFileSync(path.join(live, 'assets/app.js'), 'utf8'), 'window.ready=true;');
  assert.ok(!existsSync(path.join(live, 'old.css')) && !existsSync(path.join(live, '.env')));
});

test('外部應用只登錄網址，可省略說明；相同代號與來源可重跑', t => {
  const { root, catalog } = fixture(t);
  const options = { id: 'notes', source: 'https://example.org/notes?a=1&b=2' };
  registerApp(root, options);
  registerApp(root, options);
  assert.equal(catalog().length, 1);
  assert.ok(renderHome(catalog()).includes('https://example.org/notes?a=1&amp;b=2'));
  assert.ok(!existsSync(path.join(root, 'public/apps')));
});

test('路徑越界、缺少首頁、大小寫衝突與未登錄的既有目錄會停止上架', t => {
  const { root, folder, catalog } = fixture(t);
  assert.throws(() => registerApp(root, { id: '../original', source: folder }), /代號/);
  assert.throws(() => registerApp(root, { id: 'example', source: folder }), /index.html/);
  writeFileSync(path.join(folder, 'index.html'), 'ok');
  mkdirSync(path.join(root, 'public/apps/example'), { recursive: true });
  assert.throws(() => registerApp(root, { id: 'example', source: folder }), /已被使用/);
  registerApp(root, { id: 'Demo', source: 'https://example.org/' });
  assert.throws(() => registerApp(root, { id: 'demo', source: folder }), /大小寫/);
  assert.equal(catalog().length, 1);
});
