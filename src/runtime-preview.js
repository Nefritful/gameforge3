const runtimeCanvas = document.getElementById('runtimeCanvas');
const runtimeMeta = document.getElementById('runtimeMeta');
const runtimeInfo = document.getElementById('runtimeInfo');
const previewStatus = document.getElementById('previewStatus');
const sceneRaw = document.getElementById('sceneRaw');
const reloadBtn = document.getElementById('reloadBtn');

const params = new URLSearchParams(window.location.search);
const owner = params.get('owner') || 'demo@example.com';
const project = params.get('project') || 'project1';
const sceneName = params.get('scene') || 'main';

let runtimeNodes = [];
let runtimeScene = null;
let controlledPawn = null;
const keys = new Set();

function setStatus(text) {
  previewStatus.textContent = text;
}

async function loadScene() {
  setStatus('Loading runtime scene...');
  const response = await fetch(`/api/scene/${encodeURIComponent(sceneName)}?owner=${encodeURIComponent(owner)}&project=${encodeURIComponent(project)}`);
  if (!response.ok) {
    throw new Error(`Cannot load scene: ${response.status}`);
  }
  runtimeScene = await response.json();
  runtimeMeta.textContent = `${owner} / ${project} / ${sceneName}`;
  runtimeInfo.textContent = `Objects: ${runtimeScene.objects?.length || 0}. Runtime mode: 2D preview.`;
  sceneRaw.textContent = JSON.stringify(runtimeScene, null, 2);
  renderScene();
  setStatus(`Scene started: ${runtimeScene.name || sceneName}`);
  console.info('[Runtime] Scene Start:', runtimeScene.name || sceneName);
}

function renderScene() {
  runtimeCanvas.innerHTML = '';
  runtimeNodes = [];
  controlledPawn = null;

  for (const object of runtimeScene.objects || []) {
    const node = document.createElement('div');
    node.className = `runtime-node ${object.type || 'object'}`;
    node.style.left = `${object.transform?.x || 0}px`;
    node.style.top = `${object.transform?.y || 0}px`;
    node.style.width = `${object.transform?.width || 64}px`;
    node.style.height = `${object.transform?.height || 64}px`;
    node.style.opacity = `${object.render?.alpha ?? object.debug?.opacity ?? 1}`;
    node.textContent = object.name || object.type || 'Object';
    runtimeCanvas.appendChild(node);

    const entity = { object, node };
    runtimeNodes.push(entity);

    if (!controlledPawn && object.type === 'pawn') {
      controlledPawn = entity;
      node.style.boxShadow = '0 0 0 2px rgba(163,190,140,0.5)';
    }
  }
}

function updatePawn(deltaSeconds) {
  if (!controlledPawn) return;
  const obj = controlledPawn.object;
  const moveSpeed = obj.control?.moveSpeed || 200;
  const dx = (keys.has('ArrowRight') || keys.has('KeyD') ? 1 : 0) - (keys.has('ArrowLeft') || keys.has('KeyA') ? 1 : 0);
  const dy = (keys.has('ArrowDown') || keys.has('KeyS') ? 1 : 0) - (keys.has('ArrowUp') || keys.has('KeyW') ? 1 : 0);

  obj.transform.x += dx * moveSpeed * deltaSeconds;
  obj.transform.y += dy * moveSpeed * deltaSeconds;

  controlledPawn.node.style.left = `${obj.transform.x}px`;
  controlledPawn.node.style.top = `${obj.transform.y}px`;
}

let lastTime = performance.now();
function tick(now) {
  const deltaSeconds = Math.min((now - lastTime) / 1000, 0.033);
  lastTime = now;
  updatePawn(deltaSeconds);
  requestAnimationFrame(tick);
}

window.addEventListener('keydown', (event) => keys.add(event.code));
window.addEventListener('keyup', (event) => keys.delete(event.code));
reloadBtn.addEventListener('click', async () => {
  await loadScene();
});

loadScene()
  .then(() => requestAnimationFrame(tick))
  .catch((error) => {
    console.error(error);
    setStatus(`Runtime error: ${error.message}`);
    runtimeInfo.textContent = `Ошибка: ${error.message}`;
  });
