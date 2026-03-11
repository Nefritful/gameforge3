const projectSelect = document.getElementById('projectSelect');
const sceneSelect = document.getElementById('sceneSelect');
const createSceneBtn = document.getElementById('createSceneBtn');
const saveBtn = document.getElementById('saveBtn');
const previewBtn = document.getElementById('previewBtn');
const sceneCanvas = document.getElementById('sceneCanvas');
const sceneTree = document.getElementById('sceneTree');
const createMenu = document.getElementById('createMenu');
const createObjectBtn = document.getElementById('createObjectBtn');
const inspector = document.getElementById('inspectorForm');
const statusText = document.getElementById('statusText');
const fileTree = document.getElementById('fileTree');
const newFolderBtn = document.getElementById('newFolderBtn');
const newFileBtn = document.getElementById('newFileBtn');
const renameEntryBtn = document.getElementById('renameEntryBtn');
const deleteEntryBtn = document.getElementById('deleteEntryBtn');

const owner = 'demo@example.com';
let projectName = 'project1';
let currentSceneName = 'main';
let currentScene = null;
let selectedId = null;
let dragState = null;
let selectedFilePath = null;

const defaultTemplates = {
  object: () => ({
    id: crypto.randomUUID(),
    name: `Object_${currentScene.objects.length + 1}`,
    type: 'object',
    enabled: true,
    visible: true,
    tags: ['interactive'],
    transform: { x: 80, y: 80, width: 120, height: 60, scaleX: 1, scaleY: 1, rotation: 0 },
    physics: { enabled: true, bodyType: 'dynamic', gravityY: 0, collideWorldBounds: false },
    render: { texture: null, frame: null, alpha: 1 },
    animation: { enabled: false, clips: [] },
    variables: {},
    events: []
  }),
  pawn: () => ({
    ...defaultTemplates.object(),
    name: `Pawn_${currentScene.objects.length + 1}`,
    type: 'pawn',
    control: {
      keyboardEnabled: true,
      mouseEnabled: false,
      gamepadEnabled: false,
      moveSpeed: 200,
      jumpForce: 350,
      inputMap: { left: ['A', 'LEFT'], right: ['D', 'RIGHT'], up: ['W', 'UP'], jump: ['SPACE'] }
    },
    camera: { follow: false }
  }),
  area: () => ({
    id: crypto.randomUUID(),
    name: `Area_${currentScene.objects.length + 1}`,
    type: 'area',
    enabled: true,
    visible: true,
    tags: [],
    transform: { x: 140, y: 140, width: 180, height: 90, scaleX: 1, scaleY: 1, rotation: 0 },
    shape: { type: 'rectangle', radius: 0, points: [] },
    areaMode: { trigger: true, collision: false, light: false, spawnZone: false, damageZone: false, audioZone: false },
    effects: { damagePerSecond: 0, cameraZoom: null, musicCue: null },
    debug: { color: '#00ff00', opacity: 0.3, showInEditor: true }
  }),
  ui: () => ({
    id: crypto.randomUUID(),
    name: `Ui_${currentScene.objects.length + 1}`,
    type: 'ui',
    enabled: true,
    visible: true,
    tags: [],
    transform: { x: 32, y: 32, width: 160, height: 48, scaleX: 1, scaleY: 1, rotation: 0 },
    uiType: 'button',
    anchor: { preset: 'top-left', offsetX: 0, offsetY: 0 },
    content: { text: 'Button', icon: null },
    interaction: { clickable: true, hoverable: true, focusable: false }
  })
};

function setStatus(text) {
  statusText.textContent = text;
}

async function api(path, options = {}) {
  const query = `owner=${encodeURIComponent(owner)}&project=${encodeURIComponent(projectName)}`;
  const response = await fetch(`${path}${path.includes('?') ? '&' : '?'}${query}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}));
    throw new Error(errorPayload.error || `API error: ${response.status}`);
  }
  return response.json();
}

function sceneFileToName(fileName) {
  return fileName.replace(/\.scene\.json$/, '');
}

async function loadProject() {
  const payload = await api('/api/project');
  projectName = payload.project.name;
  projectSelect.innerHTML = `<option>${projectName}</option>`;
  sceneSelect.innerHTML = '';

  for (const sceneFile of payload.scenes) {
    const name = sceneFileToName(sceneFile);
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    sceneSelect.appendChild(option);
  }

  const preferred = payload.project.startScene || sceneFileToName(payload.scenes[0] || 'main.scene.json');
  currentSceneName = preferred;
  sceneSelect.value = preferred;
  await Promise.all([loadScene(preferred), refreshFileTree()]);
}

async function loadScene(sceneName) {
  const data = await api(`/api/scene/${encodeURIComponent(sceneName)}`);
  currentSceneName = sceneName;
  currentScene = {
    id: data.id,
    name: data.name,
    layers: data.layers || [],
    objects: data.objects || [],
    logic: data.logic || { graphs: [] }
  };

  selectedId = currentScene.objects[0]?.id || null;
  render();
  setStatus(`Loaded scene: ${sceneName}`);
}

function addObject(type, x = 60, y = 60) {
  const newObj = defaultTemplates[type]();
  newObj.transform.x = x;
  newObj.transform.y = y;
  currentScene.objects.push(newObj);
  selectedId = newObj.id;
  render();
}

function render() {
  sceneCanvas.innerHTML = '';
  sceneTree.innerHTML = '';

  for (const obj of currentScene.objects) {
    const node = document.createElement('div');
    node.className = 'scene-node';
    node.dataset.id = obj.id;
    node.dataset.type = obj.type;
    node.style.left = `${obj.transform.x}px`;
    node.style.top = `${obj.transform.y}px`;
    node.style.width = `${obj.transform.width}px`;
    node.style.height = `${obj.transform.height}px`;
    node.textContent = obj.name;
    node.addEventListener('mousedown', startDrag);
    node.addEventListener('click', () => {
      selectedId = obj.id;
      renderInspector();
      renderTreeSelection();
    });
    sceneCanvas.appendChild(node);

    const item = document.createElement('li');
    item.className = 'tree-item';
    item.dataset.id = obj.id;
    item.textContent = `${obj.type.toUpperCase()} · ${obj.name}`;
    item.addEventListener('click', () => {
      selectedId = obj.id;
      renderInspector();
      renderTreeSelection();
    });
    item.addEventListener('contextmenu', openCreateMenu);
    sceneTree.appendChild(item);
  }

  renderInspector();
  renderTreeSelection();
}

function renderTreeSelection() {
  for (const item of sceneTree.querySelectorAll('.tree-item')) {
    item.classList.toggle('selected', item.dataset.id === selectedId);
  }
}

function renderInspector() {
  const obj = currentScene.objects.find((entry) => entry.id === selectedId);
  if (!obj) {
    inspector.reset();
    return;
  }
  inspector.name.value = obj.name;
  inspector.x.value = obj.transform.x;
  inspector.y.value = obj.transform.y;
  inspector.width.value = obj.transform.width;
  inspector.height.value = obj.transform.height;
  inspector.tag.value = obj.tags?.[0] || '';
}

inspector.addEventListener('input', () => {
  const obj = currentScene.objects.find((entry) => entry.id === selectedId);
  if (!obj) return;
  obj.name = inspector.name.value;
  obj.transform.x = Number(inspector.x.value);
  obj.transform.y = Number(inspector.y.value);
  obj.transform.width = Number(inspector.width.value);
  obj.transform.height = Number(inspector.height.value);
  obj.tags = inspector.tag.value ? [inspector.tag.value] : [];
  render();
});

function startDrag(event) {
  if (event.button !== 0) return;
  const objId = event.target.dataset.id;
  const obj = currentScene.objects.find((entry) => entry.id === objId);
  if (!obj) return;
  selectedId = obj.id;
  dragState = {
    id: obj.id,
    offsetX: event.clientX - obj.transform.x,
    offsetY: event.clientY - obj.transform.y
  };
}

window.addEventListener('mousemove', (event) => {
  if (!dragState) return;
  const obj = currentScene.objects.find((entry) => entry.id === dragState.id);
  if (!obj) return;
  obj.transform.x = event.clientX - dragState.offsetX;
  obj.transform.y = event.clientY - dragState.offsetY;
  render();
});
window.addEventListener('mouseup', () => {
  dragState = null;
});

function openCreateMenu(event) {
  event.preventDefault();
  createMenu.style.display = 'flex';
  createMenu.style.left = `${event.clientX}px`;
  createMenu.style.top = `${event.clientY}px`;
}

sceneCanvas.addEventListener('contextmenu', openCreateMenu);
createObjectBtn.addEventListener('click', (event) => openCreateMenu(event));
window.addEventListener('click', () => {
  createMenu.style.display = 'none';
});

createMenu.addEventListener('click', (event) => {
  const type = event.target.dataset.type;
  if (!type) return;
  const x = parseInt(createMenu.style.left, 10) || 60;
  const y = parseInt(createMenu.style.top, 10) || 60;
  addObject(type, x, y);
  setStatus(`Added ${type} to ${currentSceneName}`);
});

saveBtn.addEventListener('click', async () => {
  await api(`/api/scene/${encodeURIComponent(currentSceneName)}`, {
    method: 'PUT',
    body: JSON.stringify(currentScene)
  });
  await refreshFileTree();
  setStatus(`Saved scene: ${currentSceneName}`);
});

previewBtn.addEventListener('click', () => {
  setStatus('Preview runtime будет следующим этапом (после file explorer).');
});

createSceneBtn.addEventListener('click', async () => {
  const raw = prompt('Введите имя новой сцены (латиница, цифры, _):', `scene_${Date.now()}`);
  const sceneName = (raw || '').trim();
  if (!sceneName) return;

  await api('/api/scene', {
    method: 'POST',
    body: JSON.stringify({
      name: sceneName,
      displayName: sceneName,
      objects: [],
      layers: [
        { id: 'layer_default', name: 'Default' },
        { id: 'layer_ui', name: 'UI' }
      ],
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
    })
  });

  const option = document.createElement('option');
  option.value = sceneName;
  option.textContent = sceneName;
  sceneSelect.appendChild(option);
  sceneSelect.value = sceneName;
  await Promise.all([loadScene(sceneName), refreshFileTree()]);
  setStatus(`Created scene: ${sceneName}`);
});

sceneSelect.addEventListener('change', async () => {
  await loadScene(sceneSelect.value);
});

function renderFileTreeNode(node, parent) {
  const li = document.createElement('li');
  const row = document.createElement('div');
  row.className = 'file-item';
  row.dataset.path = node.path;
  row.dataset.type = node.type;
  row.textContent = `${node.type === 'directory' ? '📁' : '📄'} ${node.name}`;
  if (selectedFilePath === node.path) {
    row.classList.add('selected');
  }

  const pathLabel = document.createElement('span');
  pathLabel.className = 'file-path';
  pathLabel.textContent = node.path;
  row.appendChild(pathLabel);

  row.addEventListener('click', (event) => {
    event.stopPropagation();
    selectedFilePath = node.path;
    refreshFileTree();
  });

  li.appendChild(row);
  if (node.children?.length) {
    const nested = document.createElement('ul');
    nested.className = 'tree';
    for (const child of node.children) {
      renderFileTreeNode(child, nested);
    }
    li.appendChild(nested);
  }
  parent.appendChild(li);
}

async function refreshFileTree() {
  const payload = await api('/api/files');
  fileTree.innerHTML = '';
  for (const node of payload.tree) {
    renderFileTreeNode(node, fileTree);
  }
}

newFolderBtn.addEventListener('click', async () => {
  const raw = prompt('Путь папки относительно проекта:', 'assets/new_folder');
  const targetPath = (raw || '').trim();
  if (!targetPath) return;
  await api('/api/files/folder', {
    method: 'POST',
    body: JSON.stringify({ path: targetPath })
  });
  await refreshFileTree();
  setStatus(`Создана папка: ${targetPath}`);
});

newFileBtn.addEventListener('click', async () => {
  const raw = prompt('Путь файла относительно проекта:', 'scripts/new_script.txt');
  const targetPath = (raw || '').trim();
  if (!targetPath) return;
  await api('/api/files/file', {
    method: 'POST',
    body: JSON.stringify({ path: targetPath, content: '' })
  });
  await refreshFileTree();
  setStatus(`Создан файл: ${targetPath}`);
});

renameEntryBtn.addEventListener('click', async () => {
  if (!selectedFilePath) {
    setStatus('Сначала выберите файл/папку в проводнике.');
    return;
  }
  const renamed = prompt('Новое имя/путь:', selectedFilePath);
  const toPath = (renamed || '').trim();
  if (!toPath) return;
  await api('/api/files/rename', {
    method: 'PUT',
    body: JSON.stringify({ from: selectedFilePath, to: toPath })
  });
  selectedFilePath = toPath;
  await refreshFileTree();
  setStatus(`Переименовано: ${selectedFilePath}`);
});

deleteEntryBtn.addEventListener('click', async () => {
  if (!selectedFilePath) {
    setStatus('Сначала выберите файл/папку в проводнике.');
    return;
  }
  const ok = confirm(`Удалить ${selectedFilePath}?`);
  if (!ok) return;
  await api(`/api/files?path=${encodeURIComponent(selectedFilePath)}`, {
    method: 'DELETE'
  });
  selectedFilePath = null;
  await refreshFileTree();
  setStatus('Элемент удален.');
});

loadProject().catch((error) => {
  console.error(error);
  setStatus(`Ошибка загрузки проекта: ${error.message}`);
});
