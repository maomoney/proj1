import {
  Application,
  AnimatedSprite,
  Container,
  Graphics,
  Rectangle,
  Texture,
  Assets,
  FederatedPointerEvent,
} from 'pixi.js';
import spriteSheetUrl from './img/images.jpeg';

const BOX_SIZE = 120;

// Base (design) resolution — all positions and sizes are authored here.
// The scene container is scaled to match the chosen resolution at runtime.
const BASE_W = 640;
const BASE_H = 420;

// 5 toggle states: idle + one walk row each.
const STATES = [
  { fill: 0x4e73df, row: null },  // 0: idle — paused on frame 0
  { fill: 0x1cc88a, row: 0 },     // 1: row 0 (front)
  { fill: 0xe74c3c, row: 1 },     // 2: row 1 (back)
  { fill: 0xf39c12, row: 2 },     // 3: row 2 (left)
  { fill: 0x9b59b6, row: 3 },     // 4: row 3 (right)
] as const;

// All presets share the same 32:21 aspect ratio → uniform scale.
const RESOLUTIONS = [
  { label: '320 × 210',  w: 320,  h: 210  },
  { label: '640 × 420',  w: 640,  h: 420  },
  { label: '960 × 630',  w: 960,  h: 630  },
  { label: '1280 × 840', w: 1280, h: 840  },
] as const;

async function main() {
  const app = new Application();
  await app.init({ width: BASE_W, height: BASE_H, background: 0x16213e, antialias: true });

  const appEl = document.getElementById('app')!;

  // Resolution dropdown — injected before the canvas.
  const sel = document.createElement('select');
  sel.id = 'res-select';
  for (const res of RESOLUTIONS) {
    const opt = document.createElement('option');
    opt.value = `${res.w}x${res.h}`;
    opt.textContent = res.label;
    if (res.w === BASE_W) opt.selected = true;
    sel.appendChild(opt);
  }
  appEl.appendChild(sel);
  appEl.appendChild(app.canvas);

  // Load spritesheet and slice into rowFrames[row][col].
  const sheet = await Assets.load<Texture>(spriteSheetUrl);
  const COLS = 4;
  const ROWS = 4;
  const frameW = Math.floor(sheet.width / COLS);
  const frameH = Math.floor(sheet.height / ROWS);
  const rowFrames: Texture[][] = Array.from({ length: ROWS }, (_, row) =>
    Array.from({ length: COLS }, (_, col) =>
      new Texture({
        source: sheet.source,
        frame: new Rectangle(col * frameW, row * frameH, frameW, frameH),
      }),
    ),
  );

  // scene scales with the chosen resolution; all game coordinates are BASE_W×BASE_H.
  const scene = new Container();
  app.stage.addChild(scene);

  const box = new Container();
  box.x = (BASE_W - BOX_SIZE) / 2;
  box.y = (BASE_H - BOX_SIZE) / 2;

  const rect = new Graphics();
  const sprite = new AnimatedSprite(rowFrames[0]);
  sprite.anchor.set(0.5);
  sprite.scale.set((BOX_SIZE * 0.78) / frameH);
  sprite.x = BOX_SIZE / 2;
  sprite.y = BOX_SIZE / 2 - 6;
  sprite.animationSpeed = 0.12;
  sprite.gotoAndStop(0);
  box.addChild(rect, sprite);
  scene.addChild(box);

  let stateIdx = 0;

  function render() {
    const s = STATES[stateIdx];
    rect.clear().roundRect(0, 0, BOX_SIZE, BOX_SIZE, 12).fill(s.fill);
    if (s.row === null) {
      sprite.gotoAndStop(0);
    } else {
      sprite.textures = rowFrames[s.row];
      sprite.play();
    }
  }
  render();

  // Resize renderer + scale scene to fill the new canvas.
  // All presets share the same aspect ratio so sx === sy (uniform).
  function applyResolution(w: number, h: number) {
    app.renderer.resize(w, h);
    scene.scale.set(w / BASE_W, h / BASE_H);
    // Re-clamp box in case it's outside the now-smaller canvas.
    box.x = Math.min(box.x, BASE_W - BOX_SIZE);
    box.y = Math.min(box.y, BASE_H - BOX_SIZE);
    app.stage.hitArea = app.screen;
  }

  sel.addEventListener('change', () => {
    const [w, h] = sel.value.split('x').map(Number);
    applyResolution(w, h);
  });

  // Interaction — pointer events arrive in screen/stage space;
  // toLocal() converts them into scene coords for correct drag at any scale.
  box.eventMode = 'static';
  box.cursor = 'pointer';

  const DRAG_THRESHOLD = 4; // screen pixels
  let dragging = false;
  let moved = false;
  let startScreenX = 0;
  let startScreenY = 0;
  let offsetX = 0; // scene coords
  let offsetY = 0;

  function onPointerDown(event: FederatedPointerEvent) {
    dragging = true;
    moved = false;
    startScreenX = event.global.x;
    startScreenY = event.global.y;
    const local = scene.toLocal(event.global);
    offsetX = local.x - box.x;
    offsetY = local.y - box.y;
    box.alpha = 0.85;
    app.stage.on('pointermove', onPointerMove);
  }

  function onPointerMove(event: FederatedPointerEvent) {
    if (!dragging) return;
    if (
      Math.abs(event.global.x - startScreenX) > DRAG_THRESHOLD ||
      Math.abs(event.global.y - startScreenY) > DRAG_THRESHOLD
    ) {
      moved = true;
    }
    const local = scene.toLocal(event.global);
    box.x = Math.min(Math.max(0, local.x - offsetX), BASE_W - BOX_SIZE);
    box.y = Math.min(Math.max(0, local.y - offsetY), BASE_H - BOX_SIZE);
  }

  function onPointerUp() {
    if (!dragging) return;
    dragging = false;
    box.alpha = 1;
    app.stage.off('pointermove', onPointerMove);
    if (!moved) {
      stateIdx = (stateIdx + 1) % STATES.length;
      render();
    }
  }

  box.on('pointerdown', onPointerDown);
  app.stage.eventMode = 'static';
  app.stage.hitArea = app.screen;
  app.stage.on('pointerup', onPointerUp);
  app.stage.on('pointerupoutside', onPointerUp);
}

main();
