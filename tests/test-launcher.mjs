import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { test } from 'node:test';
import { renderHome } from '../scripts/render-home.mjs';

const publicRoot = new URL('../public/', import.meta.url);
const homepage = readFileSync(new URL('index.html', publicRoot), 'utf8');
const catalog = JSON.parse(readFileSync(new URL('../tools.json', import.meta.url), 'utf8'));

test('發布的靜態首頁與工具清單同步', () => {
  assert.equal(homepage.replaceAll('\r\n', '\n'), renderHome(catalog), '請執行 node scripts/render-home.mjs 並提交首頁');
});

test('所有上架的站內工具路徑都有可發布的檔案', () => {
  for (const tool of catalog.filter(tool => tool.stage !== 'archived' && tool.url.startsWith('/'))) {
    const target = new URL(tool.url.slice(1), publicRoot);
    const entry = target.pathname.endsWith('/') ? new URL('index.html', target) : target;
    assert.ok(statSync(entry).isFile(), tool.url);
  }
});

test('原有工具的固定網址可直接開啟', () => {
  const tools = [
    ['/woodcraft/', '木工'],
    ['/room-space/', '房間']
  ];
  for (const [path, title] of tools) {
    const page = readFileSync(new URL(path.slice(1) + 'index.html', publicRoot), 'utf8');
    assert.ok(page.match(/<title>([^<]*)<\/title>/i)?.[1].includes(title), `${path} 應開啟${title}工具`);
  }
});

test('首頁引用的樣式與工具封面均在發布目錄內', () => {
  const stylesheets = Array.from(homepage.matchAll(/<link\b[^>]*\bhref="(\/[^"]+\.css)"/g), match => match[1]);
  const covers = Array.from(homepage.matchAll(/<img\b[^>]*\bsrc="(\/[^"]+)"/g), match => match[1]);
  assert.ok(stylesheets.length > 0, '首頁缺少樣式');
  for (const asset of [...stylesheets, ...covers]) {
    const file = statSync(new URL(asset.slice(1), publicRoot));
    assert.ok(file.isFile() && file.size > 0, `缺少資產 ${asset}`);
  }
});

test('同一個工具可試用、轉正、下架；沒有封面與外部 HTTPS 連結都可使用', () => {
  const prototype = { name: '備料 A & B', description: '在工地測試', url: '/apps/prep/', stage: 'trial' };
  const external = { name: '備料 B', description: '另一版', url: 'https://example.org/prep', stage: 'active' };
  const trial = renderHome([external, prototype]);
  assert.ok(trial.indexOf('試用中</h2>') < trial.indexOf('日常工具</h2>'));
  assert.match(trial, /試用中<\/h2>[\s\S]*href="\/apps\/prep\/"[\s\S]*日常工具<\/h2>/);
  assert.match(trial, /備料 A &amp; B/);
  assert.match(trial, /href="https:\/\/example\.org\/prep"/);
  assert.doesNotMatch(trial, /<img\b/);
  const promoted = renderHome([{ ...prototype, stage: 'active' }]);
  assert.match(promoted, /日常工具<\/h2>[\s\S]*href="\/apps\/prep\/"/);
  assert.doesNotMatch(promoted, /試用中<\/h2>/);
  const archived = renderHome([{ ...prototype, stage: 'archived' }]);
  assert.doesNotMatch(archived, /href="\/apps\/prep\/"/);
  assert.match(archived, /目前沒有上架的工具/);
});
