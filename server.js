const http = require('http');
const fs = require('fs/promises');
const path = require('path');
const { URL } = require('url');

const ROOT = process.cwd();
const STORAGE_ROOT = path.join(ROOT, 'storage', 'user_projects');
const DEFAULT_OWNER = 'demo@example.com';
const DEFAULT_PROJECT = 'project1';
const PORT = Number(process.env.PORT || 4173);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': MIME['.json'] });
  res.end(JSON.stringify(data, null, 2));
}

async function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => resolve(body));
  });
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function writeJson(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

function getProjectDir(owner = DEFAULT_OWNER, project = DEFAULT_PROJECT) {
  return path.join(STORAGE_ROOT, owner, project);
}

function safeProjectPath(projectDir, relativePath = '') {
  const normalized = path.normalize(relativePath).replace(/^([/\\])+/, '');
  const resolved = path.resolve(projectDir, normalized);
  if (!resolved.startsWith(projectDir)) {
    throw new Error('Unsafe path');
  }
  return resolved;
}

async function listDirRecursive(dirPath, basePath = '') {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const result = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const relative = path.join(basePath, entry.name).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      const children = await listDirRecursive(path.join(dirPath, entry.name), relative);
      result.push({ name: entry.name, type: 'directory', path: relative, children });
    } else {
      result.push({ name: entry.name, type: 'file', path: relative });
    }
  }
  return result;
}

async function listScenes(owner, project) {
  const scenesDir = path.join(getProjectDir(owner, project), 'scenes');
  await fs.mkdir(scenesDir, { recursive: true });
  const files = await fs.readdir(scenesDir);
  return files.filter((name) => name.endsWith('.scene.json')).sort();
}

async function ensureProject(owner = DEFAULT_OWNER, project = DEFAULT_PROJECT) {
  const projectDir = getProjectDir(owner, project);
  const projectFile = path.join(projectDir, 'project.json');
  try {
    await fs.access(projectFile);
  } catch {
    await fs.mkdir(path.join(projectDir, 'scenes'), { recursive: true });
    await writeJson(projectFile, {
      name: project,
      owner,
      engine: 'phaser2',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      startScene: 'main',
      storageVersion: 1
    });
    await writeJson(path.join(projectDir, 'scenes', 'main.scene.json'), {
      id: 'scene_main',
      name: 'Main',
      layers: [
        { id: 'layer_default', name: 'Default' },
        { id: 'layer_ui', name: 'UI' }
      ],
      objects: [],
      logic: {
        graphs: [
          {
            id: 'graph_main',
            name: 'Main Logic',
            blocks: [],
            connections: []
          }
        ]
      }
    });
  }

  const requiredDirs = ['assets', 'scenes', 'scripts', 'ui', 'data', 'exports'];
  for (const dir of requiredDirs) {
    await fs.mkdir(path.join(projectDir, dir), { recursive: true });
  }
}

async function handleApi(req, res, urlObj) {
  const owner = urlObj.searchParams.get('owner') || DEFAULT_OWNER;
  const project = urlObj.searchParams.get('project') || DEFAULT_PROJECT;
  const projectDir = getProjectDir(owner, project);
  await ensureProject(owner, project);

  if (req.method === 'GET' && urlObj.pathname === '/api/project') {
    const projectFile = path.join(projectDir, 'project.json');
    const projectData = await readJson(projectFile);
    const scenes = await listScenes(owner, project);
    return sendJson(res, 200, { project: projectData, scenes });
  }

  if (req.method === 'GET' && urlObj.pathname === '/api/scenes') {
    const scenes = await listScenes(owner, project);
    return sendJson(res, 200, { scenes });
  }

  if (req.method === 'GET' && urlObj.pathname.startsWith('/api/scene/')) {
    const sceneName = decodeURIComponent(urlObj.pathname.replace('/api/scene/', ''));
    const sceneFile = path.join(projectDir, 'scenes', `${sceneName}.scene.json`);
    const sceneData = await readJson(sceneFile);
    return sendJson(res, 200, sceneData);
  }

  if (req.method === 'POST' && urlObj.pathname === '/api/scene') {
    try {
      const payload = JSON.parse((await readBody(req)) || '{}');
      if (!payload.name) {
        return sendJson(res, 400, { error: 'Scene name is required' });
      }
      const sceneFile = path.join(projectDir, 'scenes', `${payload.name}.scene.json`);
      const sceneData = {
        id: payload.id || `scene_${payload.name}`,
        name: payload.displayName || payload.name,
        layers: payload.layers || [
          { id: 'layer_default', name: 'Default' },
          { id: 'layer_ui', name: 'UI' }
        ],
        objects: payload.objects || [],
        logic: payload.logic || { graphs: [{ id: 'graph_main', name: 'Main Logic', blocks: [], connections: [] }] }
      };
      await writeJson(sceneFile, sceneData);
      return sendJson(res, 201, { ok: true, scene: `${payload.name}.scene.json` });
    } catch (error) {
      return sendJson(res, 500, { error: error.message });
    }
  }

  if (req.method === 'PUT' && urlObj.pathname.startsWith('/api/scene/')) {
    try {
      const sceneName = decodeURIComponent(urlObj.pathname.replace('/api/scene/', ''));
      const payload = JSON.parse((await readBody(req)) || '{}');
      const sceneFile = path.join(projectDir, 'scenes', `${sceneName}.scene.json`);
      await writeJson(sceneFile, payload);
      return sendJson(res, 200, { ok: true });
    } catch (error) {
      return sendJson(res, 500, { error: error.message });
    }
  }

  if (req.method === 'GET' && urlObj.pathname === '/api/files') {
    try {
      const tree = await listDirRecursive(projectDir);
      return sendJson(res, 200, { tree });
    } catch (error) {
      return sendJson(res, 500, { error: error.message });
    }
  }

  if (req.method === 'POST' && urlObj.pathname === '/api/files/folder') {
    try {
      const payload = JSON.parse((await readBody(req)) || '{}');
      const target = safeProjectPath(projectDir, payload.path || '');
      await fs.mkdir(target, { recursive: true });
      return sendJson(res, 201, { ok: true });
    } catch (error) {
      return sendJson(res, 500, { error: error.message });
    }
  }

  if (req.method === 'POST' && urlObj.pathname === '/api/files/file') {
    try {
      const payload = JSON.parse((await readBody(req)) || '{}');
      const target = safeProjectPath(projectDir, payload.path || '');
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, payload.content || '', 'utf8');
      return sendJson(res, 201, { ok: true });
    } catch (error) {
      return sendJson(res, 500, { error: error.message });
    }
  }

  if (req.method === 'PUT' && urlObj.pathname === '/api/files/rename') {
    try {
      const payload = JSON.parse((await readBody(req)) || '{}');
      const from = safeProjectPath(projectDir, payload.from || '');
      const to = safeProjectPath(projectDir, payload.to || '');
      await fs.mkdir(path.dirname(to), { recursive: true });
      await fs.rename(from, to);
      return sendJson(res, 200, { ok: true });
    } catch (error) {
      return sendJson(res, 500, { error: error.message });
    }
  }

  if (req.method === 'DELETE' && urlObj.pathname === '/api/files') {
    try {
      const relativePath = urlObj.searchParams.get('path') || '';
      const target = safeProjectPath(projectDir, relativePath);
      await fs.rm(target, { recursive: true, force: true });
      return sendJson(res, 200, { ok: true });
    } catch (error) {
      return sendJson(res, 500, { error: error.message });
    }
  }

  return sendJson(res, 404, { error: 'Not found' });
}

async function handleStatic(req, res, urlObj) {
  const pathname = urlObj.pathname === '/' ? '/index.html' : urlObj.pathname;
  const filePath = path.join(ROOT, pathname);
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  try {
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) {
      res.writeHead(404);
      return res.end('Not found');
    }
    const ext = path.extname(filePath);
    const mime = MIME[ext] || 'application/octet-stream';
    const content = await fs.readFile(filePath);
    res.writeHead(200, { 'Content-Type': mime });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const urlObj = new URL(req.url, `http://${req.headers.host}`);
    if (urlObj.pathname.startsWith('/api/')) {
      return await handleApi(req, res, urlObj);
    }
    return await handleStatic(req, res, urlObj);
  } catch (error) {
    return sendJson(res, 500, { error: error.message });
  }
});

server.listen(PORT, () => {
  console.log(`GameForge dev server started on http://0.0.0.0:${PORT}`);
});
