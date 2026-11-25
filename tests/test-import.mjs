import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]+)<\/script>/)[1];
const between = (start, end) => {
  const first = script.indexOf(start), last = script.indexOf(end, first);
  assert.ok(first >= 0 && last > first, `Expected inline app source between ${start} and ${end}`);
  return script.slice(first, last);
};

function setup(stored) {
  const context = {
    state: { blueprints: [], bp: {} },
    localStorage: { getItem: () => stored },
    document: {
      getElementById: () => ({ addEventListener: (_, callback) => { context.importFile = callback; } })
    },
    FileReader: class {
      readAsText(file) {
        this.result = file.content;
        this.onload();
      }
    },
    pushHistory3D: () => { context.historyCount++; },
    resetBpHistories: () => {},
    renderAll: () => { context.renderCount++; },
    showToast: message => { context.messages.push(message); },
    historyCount: 0,
    renderCount: 0,
    messages: []
  };
  runInNewContext([
    between('  const MATERIALS = ', '  const STORAGE_KEY = ') + 'const STORAGE_KEY = "testStorageKey";',
    between('  function loadInitialState()', '  /* ='),
    between('  function projectRecord(', "  document.getElementById('btnCopyBom').addEventListener(")
  ].join('\n'), context);
  return context;
}

const piece = overrides => ({
  id: 'p_frame-1',
  name: '前框 "A&B"',
  materialId: 'batten_lauan_8_12x1',
  cutL: 42, cutW: 3.2, x: -7, y: 0, z: 0,
  orientation: 'X', flipSection: true, joinery: 'wood_screw', notes: '<平面>',
  ...overrides
});
const makeSheet = (override = {}) => ({
  id: 'sheet_front',
  name: '正視圖',
  underlay: 'section',
  sectionAxis: 'Y',
  sectionPos: -3.2,
  shapes: [
    { id: 'text_1', type: 'text', x: 5, y: -8, text: '原樣保留 <尺寸>', color: '#333333', width: 2 },
    { id: 'line_1', type: 'line', x1: 0, y1: 0, x2: 42, y2: 0, width: 1 },
    { id: 'free_1', type: 'freehand', points: [{ x: -7, y: 0 }, { x: -2, y: 6 }], dashed: true },
    { id: 'rect_1', type: 'rect', x: 10, y: 20, w: -7, h: -3 },
    { id: 'circle_1', type: 'circle', cx: 4, cy: 10, r: 7 },
    { id: 'dim_1', type: 'dim', x1: 0, y1: 0, x2: 42, y2: 0 }
  ],
  ...override
});
const asJSON = value => JSON.parse(JSON.stringify(value));

test('舊版專案可匯入，保留名稱與長度，補齊缺少的識別碼與材料寬度', () => {
  const { validateImportPayload } = setup();
  const legacy = piece({ id: undefined, cutL: '42', cutW: undefined, x: '-7' });
  const result = validateImportPayload({ version: 1, projectName: '舊案', pieces: [legacy] });
  assert.equal(result.projectName, '舊案');
  assert.match(result.pieces[0].id, /^p_[A-Za-z0-9_]+$/);
  assert.equal(result.pieces[0].cutW, 3.2);
  assert.equal(result.pieces[0].x, -7);
  assert.equal(result.pieces[0].name, legacy.name);
  assert.equal(result.blueprints, null);
});

test('新版保留構件、剖視設定、圖紙參照和圖元', () => {
  const { validateImportPayload } = setup();
  const selected = makeSheet({ id: 'sheet_selected' });
  const project = {
    version: 2, projectName: '新案', pieces: [piece()], blueprints: [makeSheet(), selected],
    activeSheetId: selected.id, refSheetId: 'sheet_front', customPrices: { batten_lauan_8_12x1: 91 }
  };
  const result = validateImportPayload(project);
  assert.deepEqual(asJSON(result.pieces[0]), project.pieces[0]);
  assert.equal(result.activeSheetId, selected.id);
  assert.equal(result.refSheetId, 'sheet_front');
  assert.deepEqual(asJSON(result.customPrices), project.customPrices);
  const restored = result.blueprints[1];
  assert.equal(restored.sectionAxis, 'Y');
  assert.equal(restored.sectionPos, -3.2);
  assert.equal(restored.shapes[0].text, '原樣保留 <尺寸>');
  assert.deepEqual(asJSON(restored.shapes.map(shape => shape.id)), selected.shapes.map(shape => shape.id));
  assert.equal(restored.shapes[3].w, -7);
});

test('不合法或重複的識別碼、未知版本、非數字尺寸與未知材料會被拒絕', () => {
  const { validateImportPayload } = setup();
  for (const badId of ['帶引號"', 'two words', '__proto__', 'constructor']) {
    assert.match(validateImportPayload({ pieces: [piece({ id: badId })] }), /識別碼/);
    assert.match(validateImportPayload({ pieces: [], blueprints: [makeSheet({ id: badId })] }), /識別碼/);
    assert.match(validateImportPayload({ pieces: [], blueprints: [
      makeSheet({ shapes: [{ id: badId, type: 'rect', x: 0, y: 0, w: 6, h: 6 }] })
    ] }), /識別碼/);
  }
  assert.match(validateImportPayload({ version: 9, pieces: [] }), /版本/);
  assert.match(validateImportPayload({ pieces: [piece(), piece()] }), /重複/);
  assert.match(validateImportPayload({ pieces: [], blueprints: [makeSheet(), makeSheet()] }), /重複/);
  assert.match(validateImportPayload({ pieces: [], blueprints: [makeSheet({ shapes: [
    makeSheet().shapes[0], makeSheet().shapes[0]
  ] })] }), /重複/);
  assert.match(validateImportPayload({ pieces: [piece({ cutW: -4 })] }), /尺寸/);
  assert.match(validateImportPayload({ pieces: [piece({ x: null })] }), /座標/);
  assert.match(validateImportPayload({ pieces: [piece({ materialId: 'constructor' })] }), /材料/);
});

test('驗證失敗時匯入流程不改資料或新增復原歷程', () => {
  const context = setup();
  context.state.pieces = [piece()];
  const importFile = content => context.importFile({ target: { files: [{ content }], value: 'project.json' } });
  importFile(JSON.stringify({ version: 2, pieces: [piece({ id: '有空白的 id' })] }));
  importFile('{invalid-json');
  assert.deepEqual(context.state.pieces, [piece()]);
  assert.equal(context.historyCount, 0);
  assert.equal(context.renderCount, 0);
  assert.equal(context.messages.length, 2);
  importFile(JSON.stringify({ version: 2, projectName: '可匯入', pieces: [] }));
  assert.equal(context.state.projectName, '可匯入');
  assert.deepEqual(asJSON(context.state.pieces), []);
  assert.equal(context.historyCount, 1);
  assert.equal(context.renderCount, 1);
});

test('瀏覽器儲存資料走相同驗證，保留合法舊案並避開不合法資料', () => {
  const valid = setup(JSON.stringify({
    savedOnce: true, projectName: '本機舊案', pieces: [piece()],
    blueprints: [makeSheet(), makeSheet({ id: 'sheet_second' })],
    activeSheetId: 'sheet_second', refSheetId: 'sheet_front'
  }));
  assert.equal(valid.loadInitialState(), true);
  assert.equal(valid.state.projectName, '本機舊案');
  assert.equal(valid.state.activeSheetId, 'sheet_second');
  assert.equal(valid.state.refSheetId, 'sheet_front');
  const invalid = setup(JSON.stringify({ pieces: [piece({ id: 'bad id' })] }));
  assert.equal(invalid.loadInitialState(), false);
  assert.equal(invalid.state.pieces.length, 4);
  assert.ok(invalid.state.pieces.every(p => p.id !== 'bad id'));
});
