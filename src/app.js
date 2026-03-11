const sceneCanvas = document.getElementById('sceneCanvas');
const sceneTree = document.getElementById('sceneTree');
const createMenu = document.getElementById('createMenu');
const createObjectBtn = document.getElementById('createObjectBtn');
const inspector = document.getElementById('inspectorForm');

const objects = [];
let selectedId = null;
let dragState = null;

const defaultTemplates = {
  object: () => ({
    id: crypto.randomUUID(),
    name: `Object_${objects.length + 1}`,
    type: 'object',
    transform: { x: 80, y: 80, width: 120, height: 60 },
    tags: ['interactive'],
    physics: { enabled: true, bodyType: 'dynamic', gravityY: 0 },
    render: { texture: null, alpha: 1 },
    animation: { enabled: false, clips: [] },
    variables: {}
  }),
  pawn: () => ({
    ...defaultTemplates.object(),
    name: `Pawn_${objects.length + 1}`,
    type: 'pawn',
    control: {
      keyboardEnabled: true,
      mouseEnabled: false,
      moveSpeed: 200,
      jumpForce: 350,
      inputMap: { left: ['A', 'LEFT'], right: ['D', 'RIGHT'], jump: ['SPACE'] }
    }
  }),
  area: () => ({
    id: crypto.randomUUID(),
    name: `Area_${objects.length + 1}`,
    type: 'area',
    transform: { x: 140, y: 140, width: 180, height: 90 },
    shape: { type: 'rectangle' },
    areaMode: { trigger: true, collision: false, light: false, damageZone: false },
    debug: { color: '#00ff00', opacity: 0.3, showInEditor: true }
  }),
  ui: () => ({
    id: crypto.randomUUID(),
    name: `Ui_${objects.length + 1}`,
    type: 'ui',
    transform: { x: 32, y: 32, width: 160, height: 48 },
    uiType: 'button',
    anchor: { preset: 'top-left', offsetX: 0, offsetY: 0 },
    content: { text: 'Button' },
    interaction: { clickable: true }
  })
};

function addObject(type, x = 60, y = 60) {
  const newObj = defaultTemplates[type]();
  newObj.transform.x = x;
  newObj.transform.y = y;
  objects.push(newObj);
  selectedId = newObj.id;
  render();
}

function render() {
  sceneCanvas.innerHTML = '';
  sceneTree.innerHTML = '';

  for (const obj of objects) {
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
    item.addEventListener('contextmenu', (event) => openCreateMenu(event));
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
  const obj = objects.find((entry) => entry.id === selectedId);
  if (!obj) return;
  inspector.name.value = obj.name;
  inspector.x.value = obj.transform.x;
  inspector.y.value = obj.transform.y;
  inspector.width.value = obj.transform.width;
  inspector.height.value = obj.transform.height;
  inspector.tag.value = obj.tags?.[0] || '';
}

inspector.addEventListener('input', () => {
  const obj = objects.find((entry) => entry.id === selectedId);
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
  const obj = objects.find((entry) => entry.id === objId);
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
  const obj = objects.find((entry) => entry.id === dragState.id);
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
});

document.getElementById('saveBtn').addEventListener('click', () => {
  const payload = JSON.stringify({ objects }, null, 2);
  localStorage.setItem('gf_scene_main', payload);
  alert('Сцена сохранена в localStorage (MVP).');
});

document.getElementById('previewBtn').addEventListener('click', () => {
  alert('Preview runtime будет отдельным шагом (MVP shell готов).');
});

document.getElementById('createSceneBtn').addEventListener('click', () => {
  alert('Создание нескольких сцен будет на следующем этапе.');
});

addObject('pawn', 120, 140);
addObject('object', 300, 220);
addObject('area', 460, 180);
addObject('ui', 48, 52);
