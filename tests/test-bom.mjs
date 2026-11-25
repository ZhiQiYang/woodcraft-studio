import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const extract = name => {
  const match = html.match(new RegExp(`^  function ${name}\\([^]*?^  }`, 'm'));
  assert.ok(match, `Expected ${name} in the application`);
  return match[0];
};
const source = [
  'computeBOM', 'formatCutSize', 'describeExcludedCut', 'renderBOM', 'copyBomText'
].map(extract).join('\n');
const materials = {
  batten: { id: 'batten', category: 'batten', name: '角材', stockL: 243, stockW: 3, unit: '支', taiwanSpec: '8尺' },
  board: { id: 'board', category: 'blockboard', name: '木心板', stockL: 244, stockW: 122, unit: '片', taiwanSpec: '4×8尺' }
};
const prices = { batten: 86, board: 725 };

function runBOM(pieces) {
  const output = { text: '', dynamic: { innerHTML: '' } };
  const container = {
    innerHTML: '',
    querySelector: () => output.dynamic
  };
  const escapeHtml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  const bom = runInNewContext(`${source}\nrenderBOM(container); copyBomText(); computeBOM();`, {
    state: { projectName: '裁切驗收', kerfCm: 0.3, pieces },
    MAT_MAP: materials,
    JOINERY_MAP: { nail: { label: '釘合', pointsPerPiece: 2 } },
    getPrice: id => prices[id],
    navigator: {},
    fallbackCopy: text => { output.text = text; },
    escapeHtml,
    container
  });
  return { bom, copiedText: output.text, panelHtml: output.dynamic.innerHTML };
}

const batten = (id, length, name = id) => ({ id, name, materialId: 'batten', cutL: length, joinery: 'nail' });
const board = (id, length, width, name = id) => ({ id, name, materialId: 'board', cutL: length, cutW: width, joinery: 'nail' });

test('超長角材和過寬板材只列為問題，不影響裁切或採購統計', () => {
  const valid = [batten('短角材', 140), batten('第二根角材', 100), board('可裁板材', 200, 100)];
  const large = [batten('超長角材', 300, '<超長角材>'), board('過寬板材', 200, 130)];
  const base = runBOM(valid).bom;
  const { bom, copiedText, panelHtml } = runBOM(valid.concat(large));
  assert.equal(bom.excludedPieces.length, 2);
  assert.equal(bom.cutPieces.length, 3);
  assert.equal(bom.grandTotalCost, 811);
  assert.equal(bom.grandTotalCost, base.grandTotalCost);
  assert.equal(bom.totalCuts, base.totalCuts);
  assert.notEqual(bom.totalCuts, 0);
  assert.equal(JSON.stringify(bom.summaryRows), JSON.stringify(base.summaryRows));
  assert.equal(bom.battenPlans[0].bins[0].used, 240.3);
  assert.equal(bom.sheetPlans[0].sheets[0].rects.length, 1);
  assert.equal(bom.joinerySummary.nail.count, 3);
  assert.match(copiedText, /預估總計（只計入可裁切構件） NT\$811/);
  const [cutList, excludedList] = copiedText.split('三、超出單件原料尺寸的構件');
  assert.doesNotMatch(cutList, /超長角材|過寬板材/);
  assert.match(excludedList, /超長角材.*構件 300 cm，原料 243 cm/);
  assert.match(excludedList, /過寬板材.*構件 200 × 130 cm，原料 244 × 122 cm/);
  assert.match(panelHtml, /&lt;超長角材&gt;.*構件 300 cm，原料 243 cm/);
  assert.doesNotMatch(panelHtml, /<超長角材>/);
});

test('全部超尺寸時清楚說明無採購估算，仍列出各自尺寸', () => {
  const { bom, copiedText, panelHtml } = runBOM([batten('超長', 244), board('過寬', 250, 123)]);
  assert.equal(bom.grandTotalCost, 0);
  assert.equal(bom.totalCuts, 0);
  assert.equal(bom.summaryRows.length, 0);
  assert.equal(bom.battenPlans.length, 0);
  assert.equal(bom.sheetPlans.length, 0);
  assert.equal(bom.excludedPieces.length, 2);
  assert.match(copiedText, /尚無採購估算/);
  assert.doesNotMatch(copiedText, /NT\$0|預估總計/);
  assert.match(panelHtml, /尚無採購估算/);
  assert.doesNotMatch(panelHtml, /kpi-grid|裁切排版圖/);
});

test('旋轉後剛好放入原料的板材可採購與排版', () => {
  const { bom } = runBOM([board('旋轉滿版', 122, 244)]);
  const [rect] = bom.sheetPlans[0].sheets[0].rects;
  assert.equal(rect.rot, true);
  assert.equal(rect.w, 244);
  assert.equal(rect.h, 122);
  assert.equal(bom.totalCuts, 0);
  assert.equal(bom.excludedPieces.length, 0);
  assert.equal(bom.summaryRows[0].utilPct, 100);
  assert.equal(bom.summaryRows[0].qty, 1);
});

test('兩段各自合格的角材仍按原有鋸路規則分成兩支', () => {
  const { bom } = runBOM([batten('甲', 143), batten('乙', 100)]);
  assert.equal(bom.excludedPieces.length, 0);
  assert.equal(bom.summaryRows[0].qty, 2);
  assert.equal(bom.grandTotalCost, 172);
});
