import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { test } from 'node:test';

const publicRoot = new URL('../public/', import.meta.url);
const homepage = readFileSync(new URL('index.html', publicRoot), 'utf8');

test('首頁的兩個固定入口都能開啟對應工具', () => {
  const links = Array.from(homepage.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g), match => match[1]);
  const tools = [
    ['/woodcraft/', '木工'],
    ['/room-space/', '房間']
  ];
  for (const [path, title] of tools) {
    assert.ok(links.includes(path), `首頁缺少入口 ${path}`);
    const page = readFileSync(new URL(path.slice(1) + 'index.html', publicRoot), 'utf8');
    assert.ok(page.match(/<title>([^<]*)<\/title>/i)?.[1].includes(title), `${path} 應開啟${title}工具`);
  }
});

test('首頁引用的樣式與工具封面均在發布目錄內', () => {
  const stylesheets = Array.from(homepage.matchAll(/<link\b[^>]*\bhref="(\/[^"]+\.css)"/g), match => match[1]);
  const covers = Array.from(homepage.matchAll(/<img\b[^>]*\bsrc="(\/[^"]+)"/g), match => match[1]);
  assert.ok(stylesheets.length > 0, '首頁缺少樣式');
  assert.ok(covers.length >= 2, '首頁缺少工具封面');
  for (const asset of [...stylesheets, ...covers]) {
    const file = statSync(new URL(asset.slice(1), publicRoot));
    assert.ok(file.isFile() && file.size > 0, `缺少資產 ${asset}`);
  }
});
