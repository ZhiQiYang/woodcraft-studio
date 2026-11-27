import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

const project = fileURLToPath(new URL('../', import.meta.url));
const repository = 'ZhiQiYang/woodcraft-studio';
const site = 'https://line-work-tools.b10102230.workers.dev/';
const usage = 'node scripts/publish-app.mjs <工具代號> <HTML、靜態網站資料夾或 HTTPS 網址> [--name 顯示名稱] [--description 說明] [--check]';

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

function validateId(id) {
  if (!/^[\p{L}\p{N}][\p{L}\p{N}_-]{0,63}$/u.test(id) || /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i.test(id)) {
    throw new Error('代號請用中英文字、數字、底線或連字號，最多 64 字。');
  }
}

function copyAsset(file) {
  const name = path.basename(file);
  if (name.startsWith('.') || ['node_modules', 'test', 'tests'].includes(name)) return false;
  if (/^(?:test(?:[.-]|$)|.*(?:[-_.]test)\.)/i.test(name) && /\.[cm]?js$/i.test(name)) return false;
  const stat = lstatSync(file);
  if (!stat.isDirectory() && !stat.isFile()) throw new Error(`請改用實際檔案，無法發布連結或特殊檔案：${file}`);
  return true;
}

export function registerApp(root, { id, source, name, description }) {
  validateId(id);
  const catalogPath = path.join(root, 'tools.json');
  const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
  const previous = catalog.find(tool => tool.id?.toLowerCase() === id.toLowerCase());
  if (previous && previous.id !== id) throw new Error(`這個代號已登記為 ${previous.id}，請沿用原來的大小寫。`);
  const folder = path.join(root, 'public', 'apps', id);
  const route = '/apps/' + encodeURIComponent(id) + '/';
  const external = /^https:\/\//i.test(source);
  const url = external ? new URL(source).href : route;
  if (external && (new URL(url).username || new URL(url).password)) throw new Error('請提供可分享的網址，請移除網址中的登入憑證。');
  if (catalog.some(tool => tool !== previous && tool.url === url)) throw new Error(`首頁已有這個網址：${url}`);
  const app = { ...previous, id, name: name ?? previous?.name ?? id, url, stage: previous?.stage === 'active' ? 'active' : 'trial' };
  if (description !== undefined) app.description = description;
  if (external && previous?.url === route) throw new Error('這個代號已有站內網址。要改放外部連結，請用另一個代號。');
  if (!external) {
    const stat = lstatSync(source);
    const directory = stat.isDirectory();
    if (directory ? !existsSync(path.join(source, 'index.html')) : !stat.isFile() || !/\.html?$/i.test(source)) {
      throw new Error('請提供單檔 HTML，或根目錄含 index.html 的已建置網站資料夾。ZIP 可先解壓縮。');
    }
    if (existsSync(path.dirname(folder)) && lstatSync(path.dirname(folder)).isSymbolicLink()) throw new Error('public/apps 必須是一般資料夾。');
    if (existsSync(folder)) {
      if (previous?.url !== route || !lstatSync(folder).isDirectory()) throw new Error(`站內路徑已被使用：${route}`);
      // Only the owned app directory in the disposable checkout is replaced.
      rmSync(folder, { recursive: true });
    }
    mkdirSync(folder, { recursive: true });
    if (directory) {
      cpSync(source, folder, { recursive: true, filter: file => file === source || copyAsset(file) });
    } else {
      cpSync(source, path.join(folder, 'index.html'));
    }
    if (!lstatSync(path.join(folder, 'index.html')).isFile()) throw new Error('找不到可發布的 index.html。');
  }
  if (previous) catalog[catalog.indexOf(previous)] = app;
  else catalog.push(app);
  writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n');
  return app;
}

function cloudflareCheck(sha) {
  const json = execFileSync('gh', ['api', `repos/${repository}/commits/${sha}/check-runs`], { encoding: 'utf8', timeout: 25000 });
  return JSON.parse(json).check_runs.find(check => check.app?.slug === 'cloudflare-workers-and-pages' && check.name === 'Workers Builds: line-work-tools');
}

async function verifyLive(sha, app, root) {
  const entry = new URL(app.url, site);
  const internal = app.url.startsWith('/');
  const href = app.url.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  const index = internal ? readFileSync(path.join(root, 'public/apps', app.id, 'index.html')) : null;
  const deadline = Date.now() + 12 * 60_000;
  let problem = '等候 Cloudflare 接收 main 的更新';
  while (Date.now() < deadline) {
    let check;
    try { check = cloudflareCheck(sha); } catch (error) { problem = error.message; }
    if (check?.status === 'completed') {
      if (check.conclusion !== 'success') throw new Error(`Cloudflare 部署結果為 ${check.conclusion}。請查看 ${check.details_url}`);
      try {
        const options = { cache: 'no-store', signal: AbortSignal.timeout(15000) };
        const home = await fetch(site + '?release=' + sha, options);
        if (!home.ok || !(await home.text()).includes(`href="${href}"`)) throw new Error('正式首頁尚未顯示這個工具');
        const target = new URL(entry);
        if (internal) target.searchParams.set('release', sha);
        if (internal) {
          const response = await fetch(target, { cache: 'no-store', signal: AbortSignal.timeout(15000) });
          if (!response.ok || !Buffer.from(await response.arrayBuffer()).equals(index)) throw new Error('正式入口檔案尚未符合這次提交');
        } else {
          console.log('正式首頁已收錄外部網址；該應用的部署由原網站管理。');
        }
        console.log(`已上線：${entry.href}\nLINE 第三格：${site}`);
        return;
      } catch (error) { problem = error.message; }
    }
    await delay(5000);
  }
  throw new Error(`已提交 ${sha}，尚未確認上線。${problem}。可在 GitHub 檢查部署後重跑相同指令。`);
}

async function main() {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: {
    name: { type: 'string' }, description: { type: 'string' }, check: { type: 'boolean' }, help: { type: 'boolean' }
  } });
  if (values.help) { console.log(usage); return; }
  if (positionals.length !== 2) throw new Error(usage);
  const [id, input] = positionals;
  validateId(id);
  const source = /^https:\/\//i.test(input) ? input : path.resolve(input);
  if (!values.check) execFileSync('gh', ['api', `repos/${repository}`, '--jq', '.full_name'], { stdio: ['ignore', 'ignore', 'inherit'] });
  const temp = mkdtempSync(path.join(tmpdir(), 'line-app-'));
  try {
    // Start from committed files so an unrelated local change cannot be published.
    if (values.check) {
      git(project, 'clone', '-q', '--config', 'core.autocrlf=false', '--no-checkout', '--', project, temp);
      git(temp, 'checkout', '-q', '--detach', git(project, 'rev-parse', 'HEAD'));
    } else {
      git(project, 'clone', '-q', '--config', 'core.autocrlf=false', '--depth=1', '--branch', 'main', '--', `https://github.com/${repository}.git`, temp);
    }
    const app = registerApp(temp, { id, source, name: values.name, description: values.description });
    execFileSync(process.execPath, ['scripts/render-home.mjs'], { cwd: temp, stdio: 'inherit' });
    execFileSync(process.execPath, ['--test'], { cwd: temp, stdio: 'inherit' });
    if (values.check) { console.log(`試跑通過：${app.name} → ${app.url}`); return; }
    git(temp, 'add', '--', 'public/index.html', 'tools.json');
    if (app.url.startsWith('/')) git(temp, 'add', '-f', '--', 'public/apps/' + id);
    if (git(temp, 'diff', '--cached', '--name-only')) {
      git(temp, 'commit', '-qm', `Publish app: ${id}`);
      git(temp, 'push', 'origin', 'HEAD:refs/heads/main');
    }
    const sha = git(temp, 'rev-parse', 'HEAD');
    console.log(`等候 Cloudflare 部署並檢查正式網址：${sha}`);
    await verifyLive(sha, app, temp);
  } finally {
    rmSync(temp, { recursive: true, force: true, maxRetries: 4 });
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
