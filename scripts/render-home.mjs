import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const root = new URL('../', import.meta.url);
const sections = [
  ['trial', '試用中'],
  ['active', '日常工具']
];

function escapeHtml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function isLocalPath(value) {
  return typeof value === 'string' && /^\/(?!\/)/.test(value) && !/[\\\s]/.test(value);
}

function validateCatalog(tools) {
  const urls = new Set();
  for (const { name, description, url, stage, cover } of tools) {
    if (!name?.trim() || (description !== undefined && typeof description !== 'string')) throw new Error('請填寫工具名稱，說明可省略');
    if (!['active', 'trial', 'archived'].includes(stage)) throw new Error(`「${name}」的 stage 無效`);
    if (!isLocalPath(url) && !(typeof url === 'string' && url.startsWith('https://') && URL.canParse(url))) {
      throw new Error(`「${name}」需要站內路徑或完整 HTTPS 網址`);
    }
    if (urls.has(url)) throw new Error(`工具網址重複：${url}`);
    urls.add(url);
    if (cover !== undefined && !isLocalPath(cover)) throw new Error(`「${name}」的封面需要站內圖片路徑`);
  }
}

function renderCard(tool, id) {
  const title = escapeHtml(tool.name);
  const description = tool.description ? `\n                <p id="${id}-description">${escapeHtml(tool.description)}</p>` : '';
  const image = tool.cover ? `<img src="${escapeHtml(tool.cover)}" alt="" width="900" height="510">` : '';
  return `          <a class="tool" href="${escapeHtml(tool.url)}" aria-labelledby="${id}-title"${description ? ` aria-describedby="${id}-description"` : ''}>
            ${image}<div class="tool-body">
              <div>
                <h3 id="${id}-title">${title}</h3>${description}
              </div>
              <span class="arrow" aria-hidden="true"><svg class="gb-icon" viewBox="0 0 24 24"><path d="M7 17 17 7M7 7h10v10"/></svg></span>
            </div>
          </a>`;
}

export function renderHome(tools) {
  validateCatalog(tools);
  const groups = [];
  for (const [stage, label] of sections) {
    const entries = tools.filter(tool => tool.stage === stage);
    if (!entries.length) continue;
    const cards = entries.map((tool, i) => renderCard(tool, `${stage}-${i}`)).join('\n');
    groups.push(`      <section class="tool-group" aria-labelledby="${stage}-heading">
        <h2 id="${stage}-heading">${label}</h2>
        <nav class="tools" aria-labelledby="${stage}-heading">
${cards}
        </nav>
      </section>`);
  }
  return `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#eef0ec">
  <meta name="description" content="正經工班的日常工具與試用中的應用。">
  <title>工作工具｜正經工班</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <div class="gb shell">
    <header class="masthead">
      <span class="gb-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
      <span>正經工班</span>
    </header>
    <main>
      <h1>工作工具</h1>
${groups.join('\n') || '      <p class="empty">目前沒有上架的工具。</p>'}
    </main>
  </div>
</body>
</html>
`;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const tools = JSON.parse(readFileSync(new URL('tools.json', root), 'utf8'));
  writeFileSync(new URL('public/index.html', root), renderHome(tools));
}
