// PROTOTYPE - NOT FOR PRODUCTION
// Question: vasculhar a cidade só de cueca, sob a pressão do barulho, do frio e da fome, e montar uma base barricada é tenso e divertido por 20 minutos?
// Date: 2026-11-17
// The 3D view: the same world the rules run on, drawn with three.js from above. One tile is one
// unit (x = i, z = j, y up). The ground is one mesh whose shader picks a photographed surface per
// tile; each building's walls are merged into a few meshes and rebuilt cut low when you are inside;
// doors, windows, fences and built walls are small meshes kept in step with their state.
// The 2D canvas stays on top for the HUD. Kept as an option: it runs only with ?look=3d.
'use strict';

const R3 = { on: false };
const WH3 = 1.35, CUT3 = 0.22, WT3 = 0.12, DOOR3 = 1.02, SILL3 = 0.42, HEAD3 = 1.02; // wall height, cut height, thickness, door and window heights
const ZH3 = 0.033; // the 2D views' heights (art pixels) to units
// ground types, by cell of assets/tex/ground_atlas.jpg (4 by 4, read left to right, top to bottom)
const GROUND_CELL = { grama: 0, asfalto: 1, calcada: 2, terra: 3, campo: 4, madeira: 5, piso: 6, azulejo: 7, hosp: 8, concreto: 9, carpete: 10, areia: 11, agua: 12, terraRua: 13, faixaV: 14, faixaH: 15 };

/** Starts the 3D view when three.js has loaded and the device can draw it; false keeps the 2D view. */
function r3Init() {
  const T = window.THREE;
  if (!T || params.get('look') !== '3d') return false; // pixel art is the game's look; 3D only when asked for
  let renderer;
  try { renderer = new T.WebGLRenderer({ canvas: document.getElementById('g3d'), antialias: true, powerPreference: 'high-performance' }); }
  catch (e) { return false; }
  R3.T = T; R3.renderer = renderer;
  renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  R3.q = Math.min(window.devicePixelRatio || 1, 1.5); // drawing resolution; lowered automatically on a slow device
  R3.scene = new T.Scene(); R3.scene.background = new T.Color('#8ea4b4');
  R3.cam = new T.PerspectiveCamera(38, W / H, 0.5, 400);
  R3.hemi = new T.HemisphereLight('#d8e6ff', '#5a5640', 1.7); R3.scene.add(R3.hemi);
  R3.sun = new T.DirectionalLight('#fff0d8', 3.0); R3.sun.castShadow = true;
  R3.sun.shadow.mapSize.set(2048, 2048); Object.assign(R3.sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 120 });
  R3.sun.shadow.bias = -0.0004; R3.sun.shadow.normalBias = 0.03;
  R3.scene.add(R3.sun, R3.sun.target);
  // the night's lights: a fixed pool (the count never changes, so no shader rebuilds), given to the nearest lamps, fires and rooms
  R3.pool = []; for (let k = 0; k < 6; k++) { const l = new T.PointLight('#ffb060', 0, 7, 1.6); R3.pool.push(l); R3.scene.add(l); }
  R3.torch = new T.SpotLight('#fff2d8', 0, 16, 0.5, 0.45, 1.2); R3.torch.castShadow = true; R3.torch.shadow.mapSize.set(1024, 1024); R3.scene.add(R3.torch, R3.torch.target);
  R3.sky = { day: new T.Color('#8ea4b4'), dusk: new T.Color('#c08a64'), night: new T.Color('#0a0e18') };
  // textures
  const TL = new T.TextureLoader(), tex = (n, srgb, rep = 1) => { const t = TL.load('assets/tex/' + n + '.jpg'); t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 8; if (srgb) t.colorSpace = T.SRGBColorSpace; t.repeat.set(rep, rep); return t; };
  R3.atlas = TL.load('assets/tex/ground_atlas.jpg'); R3.atlas.colorSpace = T.SRGBColorSpace; R3.atlas.flipY = false; R3.atlas.anisotropy = 8;
  const surf = (n, o = {}) => new T.MeshStandardMaterial(Object.assign({ map: tex(n + '_diff', true), normalMap: tex(n + '_nor'), roughness: 0.92 }, o));
  // the outward face of each building style, its roof, and the inside paint
  R3.ext = {
    tijolo: surf('brick_wall_02'), concreto: surf('concrete_block_wall'), amarelo: surf('painted_plaster_wall', { color: '#e8cc84' }),
    branco: surf('white_plaster_rough_02'), azul: surf('blue_plaster_weathered'), hospital: surf('white_plaster_rough_02', { color: '#e4ecee' }),
    metal: surf('corrugated_iron', { metalness: 0.5, roughness: 0.6 }), celeiro: surf('distressed_painted_planks', { color: '#b0402c' }), madeira: surf('brown_planks_05'),
  };
  R3.roofs = {
    telha: surf('clay_roof_tiles'), escura: surf('grey_roof_tiles', { color: '#b0b0b6' }), cinza: surf('corrugated_iron_02', { metalness: 0.4, roughness: 0.55 }),
    verde: surf('grey_roof_tiles', { color: '#7a9a78' }),
  };
  R3.plaster = { map: tex('white_plaster_rough_02_diff', true), normalMap: tex('white_plaster_rough_02_nor') };
  R3.inner = {}; // by colour
  R3.mats = {
    wood: surf('brown_planks_05'), door: new T.MeshStandardMaterial({ color: '#6a4a30', roughness: 0.7 }), frame: new T.MeshStandardMaterial({ color: '#e8e4da', roughness: 0.6 }),
    glass: new T.MeshStandardMaterial({ color: '#9ab4c8', roughness: 0.05, metalness: 0.6, transparent: true, opacity: 0.45 }),
    glassLit: new T.MeshStandardMaterial({ color: '#ffd8a0', emissive: '#ffb860', emissiveIntensity: 1.4, roughness: 0.2 }),
    plank: new T.MeshStandardMaterial({ color: '#8a6440', roughness: 0.9 }), fence: new T.MeshStandardMaterial({ color: '#6e5a44', roughness: 0.95 }),
    player: new T.MeshStandardMaterial({ color: '#d8a888' }), zombie: new T.MeshStandardMaterial({ color: '#7a8a62' }),
  };
  R3.fm = r3MatTable(T); R3.models = new Map();
  // leaves and roofs between the camera and you open a dithered window around you
  R3.hole = { uP: { value: new T.Vector2(-999, -999) }, uR: { value: 90 }, uZ: { value: 1 } };
  const holed = m => { m.onBeforeCompile = sh => { Object.assign(sh.uniforms, R3.hole); sh.fragmentShader = 'uniform vec2 uP; uniform float uR; uniform float uZ;\n' + sh.fragmentShader.replace('void main() {', 'void main() {\n  { vec2 dd = gl_FragCoord.xy - uP; float r = length(dd); if (r < uR && gl_FragCoord.z < uZ) { float th = r / uR; float bay = fract(dot(floor(gl_FragCoord.xy), vec2(0.5, 0.25)) + 0.125); if (bay > th * th) discard; } }'); }; m.customProgramCacheKey = () => 'hole'; };
  for (const k of ['leaf0', 'leaf1', 'leaf2', 'leafHi', 'bark']) holed(R3.fm[k]);
  R3.fade = new Map(); // faded copies of materials, for buildings between the camera and you
  R3.ray = new T.Raycaster(); R3.v = new T.Vector3(); R3.plane = new T.Plane(new T.Vector3(0, 1, 0), 0);
  R3.on = true;
  // what the HUD and the mouse use, in 3D
  isoV = r3IsoV; screenToWorld = r3ScreenToWorld;
  r3Resize();
  return true;
}
function r3Resize() {
  if (!R3.on) return;
  const c2 = document.getElementById('game'), c3 = document.getElementById('g3d'), w = parseFloat(c2.style.width), h = parseFloat(c2.style.height);
  c3.style.width = w + 'px'; c3.style.height = h + 'px'; c3.style.left = c2.offsetLeft + 'px'; c3.style.top = c2.offsetTop + 'px';
  R3.renderer.setPixelRatio(R3.q); R3.renderer.setSize(w, h, false);
  R3.cam.aspect = w / h; R3.cam.updateProjectionMatrix();
}

// ---- geometry helpers: boxes with world-scaled UVs, merged by material ----------------------------
/** Collects boxes into one geometry; UVs follow world position so a texture keeps its scale. */
function r3Geo() { return { p: [], n: [], u: [], s: 0.5 }; }
function r3Box(g, x0, y0, z0, x1, y1, z1, us = 0.5) {
  const F = [ // normal, then the four corners
    [[1, 0, 0], [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], [[-1, 0, 0], [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]],
    [[0, 1, 0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], [[0, -1, 0], [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]],
    [[0, 0, 1], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], [[0, 0, -1], [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]],
  ];
  for (const [nn, a, b, c, d] of F) r3Quad(g, a, b, c, d, nn, us);
}
function r3Quad(g, a, b, c, d, nn, us = 0.5) {
  const uv = q => Math.abs(nn[0]) > 0.5 ? [q[2] * us, q[1] * us] : Math.abs(nn[2]) > 0.5 ? [q[0] * us, q[1] * us] : [q[0] * us, q[2] * us];
  for (const q of [a, b, c, a, c, d]) { g.p.push(q[0], q[1], q[2]); g.n.push(nn[0], nn[1], nn[2]); g.u.push(...uv(q)); }
}
function r3Mesh(g, mat, shadow = true) {
  if (!g.p.length) return null;
  const T = R3.T, geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(g.p, 3)); geo.setAttribute('normal', new T.Float32BufferAttribute(g.n, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(g.u, 2));
  geo.computeBoundingSphere();
  const m = new T.Mesh(geo, mat); m.castShadow = shadow; m.receiveShadow = true; m.matrixAutoUpdate = false; return m;
}
function r3Inner(col) {
  if (!R3.inner[col]) R3.inner[col] = new R3.T.MeshStandardMaterial(Object.assign({ color: col, roughness: 0.95 }, R3.plaster));
  return R3.inner[col];
}
function r3Faded(mat) {
  let f = R3.fade.get(mat); if (!f) { f = mat.clone(); f.transparent = true; f.opacity = 0.28; f.depthWrite = false; R3.fade.set(mat, f); } return f;
}

// ---- the world --------------------------------------------------------------------------------------
/** Builds the 3D world from world (after generateWorld). */
function r3Build() {
  if (!R3.on) return;
  const T = R3.T;
  if (R3.root) { R3.root.traverse(o => { if (o.geometry) o.geometry.dispose(); }); R3.scene.remove(R3.root); }
  R3.root = new T.Group(); R3.scene.add(R3.root);
  R3.edges = new Map(); R3.bmesh = []; R3.cutKey = ''; R3.edgeT = 0; R3.chunks = new Map(); R3.chunkT = 0; R3.last = null;
  r3Ground();
  for (const b of world.buildings) { R3.bmesh[b.id] = r3BuildingMeshes(b, null); r3Roof(b); }
  r3PeopleInit(T);
  R3.items = []; R3.blood = []; R3.iconTex = new Map();
}

// ---- things on tiles, merged per 16 by 16 chunk ----------------------------------------------------
const CK3 = 16;
function r3FState(f) {
  if (f.t === 'fogueira') return f.fuel > 0 ? 'on' : '';
  return furnState(f);
}
function r3Model(t, v, st) {
  const vv = t === 'arvore' ? v % 15 : t === 'arbusto' ? v % 3 : v % 4, key = t + '|' + vv + '|' + st;
  let m = R3.models.get(key); if (!m) { m = r3FurnModel(R3.T, t, vv, st); R3.models.set(key, m); } return m;
}
// the side with a wall behind it: furniture turns its back to it
function r3Facing(f) {
  const i = f.i, j = f.j, w = e => e && (e.kind === 'ext' || e.kind === 'int' || e.kind === 'wood') && !e.door;
  if (w(getH(i, j))) return 0; if (w(getH(i, j + 1))) return Math.PI; if (w(getV(i, j))) return Math.PI / 2; if (w(getV(i + 1, j))) return -Math.PI / 2;
  return (f.v % 4) * Math.PI / 2;
}
function r3Chunk(cx, cy) {
  const sig = [], items = [];
  for (let i = cx * CK3; i < (cx + 1) * CK3; i++) for (let j = cy * CK3; j < (cy + 1) * CK3; j++) {
    const f = world.furn[idx(i, j)]; if (!f) continue;
    if (f.big) { if (i !== f.i || j !== f.j) continue; sig.push(f.t + i + ',' + j); items.push(f); continue; }
    const st = r3FState(f); sig.push(f.t + st + i + ',' + j); items.push(f);
  }
  return { sig: sig.join(';'), items };
}
function r3BuildChunk(cx, cy, info) {
  const T = R3.T, acc = new Map(); // material -> {p, n}
  const add = (parts, ox, oz, rot, oy = 0) => {
    const c = Math.cos(rot), s = Math.sin(rot);
    for (const [mk, g] of parts) {
      let a = acc.get(mk); if (!a) { a = { p: [], n: [] }; acc.set(mk, a); }
      const P = g.p, Nn = g.n;
      for (let k = 0; k < P.length; k += 3) {
        const x = P[k], y = P[k + 1], z = P[k + 2];
        a.p.push(x * c + z * s + ox, y + oy, -x * s + z * c + oz);
        a.n.push(Nn[k] * c + Nn[k + 2] * s, Nn[k + 1], -Nn[k] * s + Nn[k + 2] * c);
      }
    }
  };
  for (const f of info.items) {
    if (f.big) {
      const w = f.w || 1, d = f.d || 1, along = f.dir === 'J' || d > w;
      const key = 'car|' + f.t + '|' + (f.col || ''); let m = R3.models.get(key);
      if (!m) { m = r3CarModel(T, f.t, CAR_PAINT[f.col] || 'paint0'); R3.models.set(key, m); }
      const rot = (along ? 0 : Math.PI / 2) + ((f.i + f.j) % 2 ? Math.PI : 0) + (hash2(f.i, f.j) - 0.5) * 0.25;
      add(m, f.i + w / 2, f.j + d / 2, rot); continue;
    }
    const st = r3FState(f), m = r3Model(f.t, f.v, st);
    const tree = f.t === 'arvore' || f.t === 'arbusto';
    const ox = tree ? (hash2(f.i, f.j, 3) - 0.5) * 0.4 : 0, oz = tree ? (hash2(f.i, f.j, 4) - 0.5) * 0.4 : 0;
    add(m, f.i + 0.5 + ox, f.j + 0.5 + oz, tree ? hash2(f.i, f.j, 5) * 6.28 : r3Facing(f));
  }
  const meshes = [];
  for (const [mk, a] of acc) {
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(a.p, 3)); geo.setAttribute('normal', new T.Float32BufferAttribute(a.n, 3)); geo.computeBoundingSphere();
    const m = new T.Mesh(geo, R3.fm[mk] || R3.fm.crate); m.castShadow = mk !== 'blood'; m.receiveShadow = true; m.matrixAutoUpdate = false; R3.root.add(m); meshes.push(m);
  }
  return meshes;
}
function r3UpdateChunks() {
  const p = state.p, R = Math.ceil((22 / ZOOM + 8) / CK3), pcx = Math.floor(p.x / CK3), pcy = Math.floor(p.y / CK3);
  for (let cx = Math.max(0, pcx - R); cx <= Math.min(N / CK3 - 1, pcx + R); cx++) for (let cy = Math.max(0, pcy - R); cy <= Math.min(N / CK3 - 1, pcy + R); cy++) {
    const key = cx * 64 + cy, had = R3.chunks.get(key), info = r3Chunk(cx, cy);
    if (had && had.sig === info.sig) continue;
    if (had) for (const m of had.meshes) { R3.root.remove(m); m.geometry.dispose(); }
    R3.chunks.set(key, { sig: info.sig, meshes: r3BuildChunk(cx, cy, info) });
  }
}
// items lying on the ground: their icons, standing up as little cards
function r3Icon(id) {
  let t = R3.iconTex.get(id); if (t) return t;
  const d = itemDef(id), c = iconImg2(d.icon, d.tint), T = R3.T; t = new T.SpriteMaterial({ map: new T.CanvasTexture(c), transparent: true }); t.map.colorSpace = T.SRGBColorSpace; t.map.magFilter = T.NearestFilter;
  R3.iconTex.set(id, t); return t;
}
function r3UpdateItems() {
  const T = R3.T, p = state.p; let k = 0;
  for (const [key, g] of world.ground) {
    if (!g || !g.length) continue; const i = Math.floor(key / N), j = key % N;
    if (Math.abs(i - p.x) > 22 || Math.abs(j - p.y) > 22) continue;
    for (let q = 0; q < Math.min(3, g.length); q++) {
      let s = R3.items[k]; if (!s) { s = new T.Sprite(R3.fm.crate); R3.root.add(s); R3.items.push(s); }
      s.material = r3Icon(g[q].id); s.visible = true; s.scale.set(0.34, 0.34, 1); s.position.set(i + 0.35 + q * 0.15, 0.2, j + 0.5 + q * 0.08); k++;
    }
  }
  for (; k < R3.items.length; k++) R3.items[k].visible = false;
  // blood on the ground
  let b = 0;
  for (const d of state.decals) {
    if (Math.abs(d.x - p.x) > 24 || Math.abs(d.y - p.y) > 24) continue;
    let m = R3.blood[b]; if (!m) { m = new T.Mesh(new T.CircleGeometry(1, 14).rotateX(-Math.PI / 2), R3.fm.blood); m.renderOrder = 1; R3.root.add(m); R3.blood.push(m); }
    m.visible = true; m.position.set(d.x, 0.012, d.y); const r = (d.r || 3) * 0.06; m.scale.set(r * 1.3, 1, r); b++;
  }
  for (; b < R3.blood.length; b++) R3.blood[b].visible = false;
}
function r3Ground() {
  const T = R3.T;
  const data = new Uint8Array(N * N);
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const c = GROUND_CELL[world.floor[idx(i, j)]]; data[j * N + i] = c === undefined ? 0 : c; }
  const typ = new T.DataTexture(data, N, N, T.RedFormat, T.UnsignedByteType); typ.magFilter = typ.minFilter = T.NearestFilter; typ.needsUpdate = true;
  R3.typeTex = typ;
  const mat = new T.MeshStandardMaterial({ map: R3.atlas, roughness: 0.92 });
  mat.onBeforeCompile = sh => {
    sh.uniforms.uType = { value: typ };
    sh.vertexShader = 'varying vec3 vWp;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = 'varying vec3 vWp;\nuniform sampler2D uType;\nfloat gty(vec2 t){ return floor(texture2D(uType, (t + 0.5) / ' + N.toFixed(1) + ').r * 255.0 + 0.5); }\n' +
      'float hsh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }\nfloat vno(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hsh(i), hsh(i + vec2(1, 0)), f.x), mix(hsh(i + vec2(0, 1)), hsh(i + vec2(1, 1)), f.x), f.y); }\n' +
      sh.fragmentShader
        .replace('#include <map_fragment>', `
          vec2 wp = vWp.xz, tc = floor(wp);
          float ty = gty(tc), road = (ty == 1.0 || ty == 14.0 || ty == 15.0) ? 1.0 : 0.0;
          float cellT = road > 0.5 ? 1.0 : ty;
          float sc = (road > 0.5 || ty == 0.0 || ty == 3.0 || ty == 13.0 || ty == 4.0) ? 4.0 : 2.0;
          vec2 g = wp / sc, lp = fract(g);
          vec2 cell = vec2(mod(cellT, 4.0), floor(cellT / 4.0));
          vec2 auv = (cell + 0.015 + lp * 0.97) / 4.0, gg = g * 0.97 / 4.0;
          vec4 tx = textureGrad(map, auv, dFdx(gg), dFdy(gg));
          float big = vno(wp * 0.06) * 0.6 + vno(wp * 0.21) * 0.4;
          tx.rgb *= 0.82 + 0.34 * big;
          if (ty == 0.0) tx.rgb *= vec3(0.8, 1.08, 0.62); // a greener grass
          if (ty == 12.0) tx.rgb = vec3(0.10, 0.17, 0.20) + vec3(0.03, 0.05, 0.06) * vno(wp * 1.5);
          vec2 f = fract(wp);
          // the yellow double line down the middle of a road, white lines at its edges
          if (ty == 14.0 && abs(abs(f.x - 0.5) - 0.07) < 0.025) tx.rgb = vec3(0.78, 0.6, 0.18);
          if (ty == 15.0 && abs(abs(f.y - 0.5) - 0.07) < 0.025) tx.rgb = vec3(0.78, 0.6, 0.18);
          if (road > 0.5) {
            float nl = gty(tc + vec2(-1.0, 0.0)), nr = gty(tc + vec2(1.0, 0.0)), nu = gty(tc + vec2(0.0, -1.0)), nd = gty(tc + vec2(0.0, 1.0));
            bool edgeL = !(nl == 1.0 || nl == 14.0 || nl == 15.0), edgeR = !(nr == 1.0 || nr == 14.0 || nr == 15.0), edgeU = !(nu == 1.0 || nu == 14.0 || nu == 15.0), edgeD = !(nd == 1.0 || nd == 14.0 || nd == 15.0);
            if ((edgeL && abs(f.x - 0.14) < 0.03) || (edgeR && abs(f.x - 0.86) < 0.03) || (edgeU && abs(f.y - 0.14) < 0.03) || (edgeD && abs(f.y - 0.86) < 0.03)) tx.rgb = mix(tx.rgb, vec3(0.82, 0.8, 0.76), 0.85);
          }
          diffuseColor *= tx;`)
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nif (ty == 12.0) roughnessFactor = 0.06; else if (ty == 5.0 || ty == 6.0 || ty == 7.0 || ty == 8.0) roughnessFactor = 0.55;');
  };
  const g = new T.Mesh(new T.PlaneGeometry(N, N).rotateX(-Math.PI / 2), mat); g.position.set(N / 2, 0, N / 2); g.receiveShadow = true; R3.root.add(g); R3.groundMesh = g;
  // beyond the map: plain grass to the horizon
  const far = new T.Mesh(new T.PlaneGeometry(N * 6, N * 6).rotateX(-Math.PI / 2), new T.MeshStandardMaterial({ color: '#3e4a26', roughness: 1 })); far.position.set(N / 2, -0.02, N / 2); R3.root.add(far);
}
function r3Dynamic(e) { return !!(e.door || e.win || e.kind === 'fence' || e.kind === 'wood'); }
// one edge's static wall pieces into the geometry lists: an outward half and an inward half
function r3WallPieces(e, b, G, cut) {
  const h = cut ? CUT3 : WH3, L = e.dir === 'V', ht = WT3 / 2;
  const a0 = (L ? e.j : e.i) - ht, a1 = (L ? e.j : e.i) + 1 + ht, c = L ? e.i : e.j;
  // which side is inside the building
  let inSide = 1;
  if (e.kind === 'ext') { const ti = L ? e.i : e.i, tj = L ? e.j : e.j; inSide = inMap(ti, tj) && world.bld[idx(ti, tj)] === b.id ? 1 : -1; }
  const spans = []; // [y0, y1] pieces along the full length
  if (e.door) { if (!cut) spans.push([DOOR3, h]); }
  else if (e.win) { spans.push([0, Math.min(h, SILL3)]); if (!cut) spans.push([HEAD3, h]); }
  else spans.push([0, h]);
  for (const [y0, y1] of spans) {
    if (y1 <= y0) continue;
    for (const side of [1, -1]) {
      const k0 = side > 0 ? c : c - ht, k1 = side > 0 ? c + ht : c;
      const list = (e.kind === 'ext' && side !== inSide) ? G.ext : G.inn;
      if (L) r3Box(list, k0, y0, a0, k1, y1, a1); else r3Box(list, a0, y0, k0, a1, y1, k1);
    }
  }
}
// a building's walls, merged: one mesh for its outward face and one for its inside paint
function r3BuildingMeshes(b, cutFn) {
  const G = { ext: r3Geo(), inn: r3Geo() };
  const each = (fn) => {
    for (let i = b.x0; i <= b.x1; i++) for (let j = b.y0; j <= b.y1; j++) {
      const v = getV(i, j), hh = getH(i, j);
      if (v && v.b === b.id && j < b.y1) fn(v); if (hh && hh.b === b.id && i < b.x1) fn(hh);
    }
  };
  each(e => { if (e.kind === 'ext' || e.kind === 'int') r3WallPieces(e, b, G, cutFn ? cutFn(e) : false); });
  const o = { ext: r3Mesh(G.ext, R3.ext[b.ext] || R3.ext.tijolo), inn: r3Mesh(G.inn, r3Inner(b.inner || '#e2dccb')) };
  for (const m of [o.ext, o.inn]) if (m) { m.updateMatrix(); m.userData.base = m.material; R3.root.add(m); }
  return o;
}
function r3DropBuilding(id) { const o = R3.bmesh[id]; if (!o) return; for (const m of [o.ext, o.inn]) if (m) { R3.root.remove(m); m.geometry.dispose(); } }
// a gable roof over the long side, with eaves, its two ends closed in the wall colour
function r3Roof(b) {
  const T = R3.T, w = b.x1 - b.x0, d = b.y1 - b.y0, ov = 0.28, along = w >= d, span = (along ? d : w) / 2 + ov;
  const rise = b.ext === 'metal' ? span * 0.28 : span * 0.62, y0 = WH3, g = r3Geo(), gEnd = r3Geo(), cx = (b.x0 + b.x1) / 2, cz = (b.y0 + b.y1) / 2;
  const L0 = (along ? b.x0 : b.y0) - ov, L1 = (along ? b.x1 : b.y1) + ov, P = (a, s, y) => along ? [a, y, (along ? cz : cx) + s] : [(along ? cz : cx) + s, y, a];
  const us = 0.5, slope = Math.hypot(span, rise);
  for (const sd of [-1, 1]) {
    const a = P(L0, sd * span, y0 - 0.05), bb = P(L1, sd * span, y0 - 0.05), c = P(L1, 0, y0 + rise), dd = P(L0, 0, y0 + rise);
    const nn = along ? [0, span / slope, sd * rise / slope] : [sd * rise / slope, span / slope, 0];
    // UVs along the slope, so the tiles run down the roof
    const push = (q, uu, vv) => { g.p.push(...q); g.n.push(...nn); g.u.push(uu * us, vv * us); };
    const order = sd > 0 ? [[a, 0, 0], [bb, L1 - L0, 0], [c, L1 - L0, slope], [a, 0, 0], [c, L1 - L0, slope], [dd, 0, slope]] : [[bb, L1 - L0, 0], [a, 0, 0], [dd, 0, slope], [bb, L1 - L0, 0], [dd, 0, slope], [c, L1 - L0, slope]];
    for (const [q, uu, vv] of order) push(q, uu, vv);
    // the underside, so the roof is solid from below
    const nb = nn.map(x => -x); for (const [q, uu, vv] of order.slice().reverse()) { g.p.push(q[0], q[1] - 0.06, q[2]); g.n.push(...nb); g.u.push(uu * us, vv * us); }
  }
  // gable ends
  for (const e of [along ? b.x0 : b.y0, along ? b.x1 : b.y1]) {
    const s = span - ov, a = P(e, -s, y0), bb = P(e, s, y0), c = P(e, 0, y0 + rise * s / span);
    for (const q of [a, bb, c, c, bb, a]) { gEnd.p.push(...q); gEnd.n.push(along ? (e === b.x0 ? -1 : 1) : 0, 0, along ? 0 : (e === b.y0 ? -1 : 1)); gEnd.u.push((along ? q[2] : q[0]) * 0.5, q[1] * 0.5); }
  }
  const roof = r3Mesh(g, R3.roofs[b.roof] || R3.roofs.telha), end = r3Mesh(gEnd, R3.ext[b.ext] || R3.ext.tijolo);
  for (const m of [roof, end]) { if (!m) continue; m.updateMatrix(); m.userData.base = m.material; R3.root.add(m); }
  R3.bmesh[b.id].roof = roof; R3.bmesh[b.id].end = end;
}

// ---- doors, windows, fences, built walls: small meshes that follow their state -------------------
function r3Lit(e) { const B = world.buildings[e.b]; return !!(B && B.powered && daylight() < 0.5); }
function r3EdgeKey(e, cut) { return [r3Lit(e) ? 'L' : '', e.kind, e.door ? (e.broken ? 'x' : e.open ? 'o' : 'c') : '', e.win ? e.glass : '', e.barr || 0, cut ? 1 : 0].join(); }
function r3EdgeObj(e, cut) {
  const T = R3.T, grp = new T.Group(), L = e.dir === 'V', c = L ? e.i : e.j, a = L ? e.j : e.i;
  const box = (mat, k0, y0, s0, k1, y1, s1) => { const g = r3Geo(); if (L) r3Box(g, k0, y0, s0, k1, y1, s1); else r3Box(g, s0, y0, k0, s1, y1, k1); const m = r3Mesh(g, mat); grp.add(m); return m; };
  const ht = WT3 / 2;
  if (e.kind === 'fence') {
    if (e.door && e.open) return grp;
    for (const s of [a + 0.06, a + 0.94]) box(R3.mats.fence, c - 0.04, 0, s - 0.04, c + 0.04, 0.62, s + 0.04);
    for (const y of [0.22, 0.48]) box(R3.mats.fence, c - 0.025, y, a, c + 0.025, y + 0.07, a + 1);
    return grp;
  }
  if (e.kind === 'wood') { box(R3.mats.wood, c - ht, 0, a - ht, c + ht, cut ? CUT3 : WH3, a + 1 + ht); return grp; }
  if (e.door) {
    if (!e.broken) {
      const leaf = new T.Group(), g = r3Geo();
      if (L) r3Box(g, -0.025, 0, 0, 0.025, DOOR3 - 0.02, 0.9); else r3Box(g, 0, 0, -0.025, 0.9, DOOR3 - 0.02, 0.025);
      const m = r3Mesh(g, R3.mats.door); m.matrixAutoUpdate = true; leaf.add(m);
      leaf.position.set(L ? c : a + 0.05, 0, L ? a + 0.05 : c);
      if (e.open) leaf.rotation.y = L ? -Math.PI / 2 : Math.PI / 2;
      grp.add(leaf);
    }
  } else if (e.win) {
    const top = cut ? Math.min(CUT3, SILL3) : HEAD3;
    if (!cut) {
      box(R3.mats.frame, c - ht, SILL3, a, c + ht, SILL3 + 0.05, a + 1); box(R3.mats.frame, c - ht, HEAD3 - 0.05, a, c + ht, HEAD3, a + 1);
      box(R3.mats.frame, c - ht, SILL3, a, c + ht, HEAD3, a + 0.06); box(R3.mats.frame, c - ht, SILL3, a + 0.94, c + ht, HEAD3, a + 1);
      if (e.glass === 'ok') box(r3Lit(e) ? R3.mats.glassLit : R3.mats.glass, c - 0.01, SILL3 + 0.05, a + 0.06, c + 0.01, HEAD3 - 0.05, a + 0.94);
    }
    void top;
  }
  // barricade planks across the opening, on both faces
  const n = Math.min(4, e.barr || 0), hTop = e.door ? DOOR3 : HEAD3, hBot = e.door ? 0.05 : SILL3;
  for (let k = 0; k < n; k++) {
    const y = hBot + (k + 0.5) * (hTop - hBot) / 4, pl = box(R3.mats.plank, c - ht - 0.04, y - 0.06, a - 0.05, c + ht + 0.04, y + 0.06, a + 1.05);
    pl.matrixAutoUpdate = true; pl.rotation.set(0, 0, 0);
  }
  return grp;
}
function r3UpdateEdges(force) {
  const p = state.p, R = 34, i0 = Math.max(0, Math.floor(p.x - R)), i1 = Math.min(N, Math.ceil(p.x + R)), j0 = Math.max(0, Math.floor(p.y - R)), j1 = Math.min(N, Math.ceil(p.y + R));
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) for (const e of [getV(i, j), getH(i, j)]) {
    if (!e || !r3Dynamic(e)) continue;
    const cut = r3EdgeCut(e), key = r3EdgeKey(e, cut), id = e.dir + eidx(e.i, e.j), had = R3.edges.get(id);
    if (had && had.key === key && !force) continue;
    if (had) { R3.root.remove(had.obj); had.obj.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
    const obj = r3EdgeObj(e, cut); obj.userData.b = e.b; R3.root.add(obj); R3.edges.set(id, { key, obj, e });
  }
  // a cleared edge (a wall taken down) loses its mesh
  for (const [id, r] of R3.edges) { const e = r.e, now = e.dir === 'V' ? getV(e.i, e.j) : getH(e.i, e.j); if (now !== e) { R3.root.remove(r.obj); R3.edges.delete(id); } }
}
// walls on the camera's side of you are cut low inside a building, as in the 2D view
function r3EdgeCut(e) {
  const p = state.p, b = R3.curB;
  if (e.b >= 0 && e.b === b) return e.dir === 'V' ? e.i > p.x : e.j > p.y;
  if (e.kind === 'wood' && (e.dir === 'V' ? e.i > p.x : e.j > p.y) && Math.hypot((e.dir === 'V' ? e.i : e.i + 0.5) - p.x, (e.dir === 'V' ? e.j + 0.5 : e.j) - p.y) < 2.6) return true;
  return false;
}

// ---- each frame -------------------------------------------------------------------------------------
/** Draws the 3D view for this frame. */
function r3Draw() {
  const T = R3.T, p = state.p;
  const inGame = scene === 'play' || scene === 'pause';
  const b = inGame ? buildingAt(p.x, p.y) : null, cb = b ? b.id : -1; // the opening sees the town whole, roofs on
  // inside a building: its walls are rebuilt cut on your camera side, its roof hidden
  const key = cb + ':' + Math.floor(p.x) + ':' + Math.floor(p.y);
  if (key !== R3.cutKey) {
    const was = R3.curB; R3.curB = cb;
    if (was !== undefined && was >= 0 && was !== cb) { r3DropBuilding(was); const o = r3BuildingMeshes(world.buildings[was], null); Object.assign(R3.bmesh[was], { ext: o.ext, inn: o.inn }); }
    if (cb >= 0) { r3DropBuilding(cb); const o = r3BuildingMeshes(b, r3EdgeCut); Object.assign(R3.bmesh[cb], { ext: o.ext, inn: o.inn }); }
    R3.cutKey = key; r3UpdateEdges(true);
  }
  R3.edgeT -= 1 / 60; if (R3.edgeT <= 0) { R3.edgeT = 0.25; r3UpdateEdges(false); }
  const jump = !R3.last || Math.abs(R3.last[0] - p.x) + Math.abs(R3.last[1] - p.y) > 6; // a new game, or a long way since
  if (jump) { R3.last = [p.x, p.y]; R3.chunkT = 0; r3UpdateEdges(true); }
  R3.chunkT -= 1 / 60; if (R3.chunkT <= 0) { R3.last = [p.x, p.y]; R3.chunkT = 0.3; r3UpdateChunks(); r3UpdateItems(); }
  // roofs: hidden over you; buildings between the camera and you fade
  // a building fades when the line from your head to the camera passes through it
  const cx = R3.cam.position.x - p.x, cy = R3.cam.position.y - 0.9, cz = R3.cam.position.z - p.y;
  for (const B of world.buildings) {
    const o = R3.bmesh[B.id]; if (!o) continue;
    const near = Math.abs(B.x0 - p.x) < 18 && Math.abs(B.y0 - p.y) < 18;
    const fade = near && B.id !== cb && r3RayBox(p.x, 0.9, p.y, cx, cy, cz, B.x0 - 0.3, 0, B.y0 - 0.3, B.x1 + 0.3, WH3 + Math.min(B.x1 - B.x0, B.y1 - B.y0) * 0.35, B.y1 + 0.3);
    if (o.roof) o.roof.visible = B.id !== cb;
    if (o.end) o.end.visible = B.id !== cb;
    for (const m of [o.ext, o.inn, o.roof, o.end]) if (m) m.material = fade ? r3Faded(m.userData.base) : m.userData.base;
  }
  r3DrawPeople();
  // the camera: above and behind on the +i+j side, as the 2D view; the opening circles the place you wake;
  // the survivor screen looks you in the face, framed on the right
  const t = new T.Vector3(p.x, 0.4, p.y);
  if (scene === 'title' || scene === 'over') { const a = clock.now() * 0.07, r = 7.5; R3.cam.fov = 40; R3.cam.position.set(t.x + Math.cos(a) * r, 4.2, t.z + Math.sin(a) * r); R3.cam.lookAt(t.x, 0.6, t.z); }
  else if (scene === 'criar') {
    R3.cam.fov = 30; const f = p.dir, fx = f[0] || 0.7, fz = f[1] || 0.7, fl = Math.hypot(fx, fz) || 1, ux = fx / fl, uz = fz / fl;
    // in front of the face, a little to one side, so the figure sits on the right of the screen
    R3.cam.position.set(p.x + ux * 3.1 - uz * 1.25, 0.62, p.y + uz * 3.1 + ux * 1.25); R3.cam.lookAt(p.x - uz * 1.25 + ux * 0.2, 0.44, p.y + ux * 1.25 + uz * 0.2);
  } else { const dist = 8 / ZOOM; R3.cam.fov = 38; R3.cam.position.set(t.x + dist * 0.5, t.y + dist * 1.05, t.z + dist * 0.5); R3.cam.lookAt(t); }
  R3.cam.updateProjectionMatrix();
  r3Light(t);
  // the survivor screen is a studio: only you, on the ground, against the dark
  const studio = scene === 'criar';
  if (studio !== !!R3.studio) { R3.studio = studio; const keep = new Set(Object.values(R3.people.parts)); keep.add(R3.groundMesh); for (const o of R3.root.children) if (!keep.has(o)) o.visible = !studio; R3.scene.background.set('#0b0d12'); }
  if (studio) { R3.scene.background.set('#14171e'); R3.hemi.intensity = 2.0; R3.hemi.color.set('#fff4e8'); R3.sun.intensity = 2.6; R3.sun.color.set('#fff0e0'); R3.sun.position.set(p.x + R3.cam.position.x - p.x + 2, 6, p.y + R3.cam.position.z - p.y - 1); R3.renderer.toneMappingExposure = 1.15; for (const l of R3.pool) l.intensity = 0; }
  // the see-through window: where you are on screen, and how deep
  R3.cam.updateMatrixWorld(); const hp = R3.v.set(p.x, 0.5, p.y).project(R3.cam), dpr = R3.renderer.getPixelRatio(), cw = R3.renderer.domElement.width, ch = R3.renderer.domElement.height;
  R3.hole.uP.value.set((hp.x + 1) / 2 * cw, (hp.y + 1) / 2 * ch); R3.hole.uR.value = 70 * dpr * Math.max(0.8, ZOOM); R3.hole.uZ.value = hp.z * 0.5 + 0.5 - 0.0004;
  R3.renderer.render(R3.scene, R3.cam);
}
// does the segment from (ox,oy,oz) along (dx,dy,dz) (t in 0..1) cross the box?
function r3RayBox(ox, oy, oz, dx, dy, dz, x0, y0, z0, x1, y1, z1) {
  let t0 = 0, t1 = 1;
  for (const [o, d, a, b] of [[ox, dx, x0, x1], [oy, dy, y0, y1], [oz, dz, z0, z1]]) {
    if (Math.abs(d) < 1e-9) { if (o < a || o > b) return false; continue; }
    let ta = (a - o) / d, tb = (b - o) / d; if (ta > tb) [ta, tb] = [tb, ta];
    t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); if (t0 > t1) return false;
  }
  return true;
}
/** A world point (x, y, height in the 2D view's art pixels) to the logical screen. */
function r3IsoV(x, y, z = 0) {
  const v = R3.v.set(x, z * ZH3, y).project(R3.cam);
  return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H];
}
/** A logical screen point to the ground it covers. */
function r3ScreenToWorld(sx, sy) {
  const T = R3.T, nd = new T.Vector2(sx / W * 2 - 1, 1 - sy / H * 2);
  R3.ray.setFromCamera(nd, R3.cam); const hitP = new T.Vector3();
  if (!R3.ray.ray.intersectPlane(R3.plane, hitP)) return [state.p.x, state.p.y];
  return [hitP.x, hitP.z];
}

/** What the 2D canvas adds over the 3D view: the glint on unsearched containers and the build ghost. */
function r3Overlay() {
  const p = state.p;
  for (let i = Math.floor(p.x - 5); i <= p.x + 5; i++) for (let j = Math.floor(p.y - 5); j <= p.y + 5; j++) {
    if (!inMap(i, j)) continue; const f = world.furn[idx(i, j)];
    if (!f || f.big || !f.cont || f.searched || Math.hypot(f.i + 0.5 - p.x, f.j + 0.5 - p.y) >= 4.5 || Math.floor(state.t * 2.5 + f.i) % 3 !== 0) continue;
    const tall = f.t === 'armario' || f.t === 'guarda' || f.t === 'geladeira' || f.t === 'estante';
    const [sx, sy] = isoV(f.i + 0.5, f.j + 0.5, tall ? 32 : 16);
    prect(ctx, Math.round(sx) - 2, Math.round(sy), 5, 1, '#f0d040'); prect(ctx, Math.round(sx), Math.round(sy) - 2, 1, 5, '#f0d040'); prect(ctx, Math.round(sx), Math.round(sy), 1, 1, '#ffffff');
  }
  if (state.ui.build) {
    const t = buildTarget(); if (!t) return;
    const Bd = BUILDS[state.ui.build.opt], [ok] = buildOk(Bd), good = ok && !t.why && !t.far, col = good ? 'rgba(120,230,120,0.5)' : 'rgba(240,90,80,0.5)';
    const poly = pts => { ctx.fillStyle = col; ctx.beginPath(); pts.forEach((q, k) => k ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath(); ctx.fill(); };
    const top = WH3 / ZH3;
    if (t.kind === 'edge' || t.kind === 'newedge') { const a = [t.i, t.j], b = t.dir === 'V' ? [t.i, t.j + 1] : [t.i + 1, t.j]; poly([isoV(a[0], a[1]), isoV(b[0], b[1]), isoV(b[0], b[1], top), isoV(a[0], a[1], top)]); }
    else poly([isoV(t.i, t.j), isoV(t.i + 1, t.j), isoV(t.i + 1, t.j + 1), isoV(t.i, t.j + 1)]);
  }
}

// the survivor, the zombies and the animals
function r3DrawPeople() {
  const p = state.p;
  r3PeopleBegin();
  // the survivor: the same poses as the 2D view's
  const a = p.action, anim = a ? a.anim : null;
  const o = { x: p.x, y: p.y, face: Math.atan2(p.dir[0], p.dir[1]), look: playerLook(p), ph: (p.ft || 0) * Math.PI / 2, t: state.t, pose: '' };
  if (p.sleeping) { const b = a && a.bed; o.lying = true; o.sleep = true; if (b) { o.x = b.i + 0.5; o.y = b.j + 0.5; } }
  else if (anim === 'sit') o.pose = 'sit';
  else if (anim === 'read') o.pose = 'read';
  else if (anim === 'bandage') o.pose = 'bandage';
  else if (anim === 'search') o.pose = 'search';
  else if (p.swing > 0) { o.pose = 'attack'; o.swing = Math.min(1, p.swing / 0.3); }
  else if (anim === 'hammer' || anim === 'chop') { o.pose = 'attack'; o.swing = (Math.sin(state.t * 10) + 1) / 2; }
  else if (p.crouch || anim === 'crouch') o.pose = 'crouch';
  else if (p.moving) o.pose = p.run ? 'run' : 'walk';
  if (p.hand && !['sit', 'read', 'bandage', 'search'].includes(o.pose)) { o.weapon = true; o.weaponCol = /faca|machado|cano|chave|pe_de|facao/.test(p.hand.id) ? '#9aa0a6' : '#6a5038'; }
  if (!state.dead || state.deathT < 0.01) r3Figure(o); else r3Figure(Object.assign(o, { lying: true, pose: '' }));
  // zombies near you that you can see, and every body on the ground
  for (const z of state.near) {
    if (!z.visible && !z.dead) continue;
    const K = ZKINDS[z.kind];
    const f = { x: z.x, y: z.y, face: Math.atan2(z.dirx || 0.7, z.diry || 0.7), look: zombieLook(z), zombie: true, fat: !!K.fat, ph: (z.ft || 0) * Math.PI / 2, pose: z.attackPose ? 'attack' : z.moving ? 'walk' : '', atk: z.atk || 0 };
    if (K.crawl) { f.lying = true; f.prone = true; f.crawl = !z.dead; }
    else if (z.dead || z.down > 0) f.lying = true;
    r3Figure(f);
  }
  r3PeopleEnd();
  for (const an of world.animals) {
    const near = Math.abs(an.x - p.x) < 26 && Math.abs(an.y - p.y) < 26;
    if (near) r3Animal(an); else if (an._r3) an._r3.visible = false;
  }
}

// ---- light by the hour, and the night's lamps -------------------------------------------------------
function r3Light(t) {
  const T = R3.T, p = state.p, h = hourOf(state.time);
  let dl = daylight();
  if (scene === 'title') dl = 0.55; // the opening is at dusk
  const warm = (h > 16 || h < 8 || scene === 'title') ? Math.max(0, 1 - Math.abs(dl - 0.5) * 2) : 0; // the low sun is orange
  R3.sun.position.set(t.x + 20, 6 + 30 * dl, t.z - 6); R3.sun.target.position.copy(t); R3.sun.target.updateMatrixWorld();
  R3.sun.intensity = 0.25 + 2.9 * dl; R3.sun.color.setRGB(1, 0.94 - warm * 0.3, 0.85 - warm * 0.45).lerp(R3.sky.moon || (R3.sky.moon = new T.Color('#8aa0e0')), (1 - dl) * 0.85);
  R3.hemi.intensity = 0.18 + 1.55 * dl; R3.hemi.color.set('#d8e6ff').lerp(R3.sky.hn || (R3.sky.hn = new T.Color('#4a5a8a')), 1 - dl);
  const sky = R3.scene.background; sky.copy(R3.sky.night).lerp(R3.sky.day, dl).lerp(R3.sky.dusk, warm * 0.5);
  R3.renderer.toneMappingExposure = 1.2 + (1 - dl) * 0.35;
  // the lights near you: fires, lamps (while there is power), lit rooms, TVs, generators
  const night = 1 - dl, L = [];
  if (night > 0.05) {
    const near = (x, y, r) => Math.abs(x - p.x) < r && Math.abs(y - p.y) < r;
    for (const f of state.fires) if (f.fuel > 0 && near(f.i, f.j, 20)) L.push([f.i + 0.5, 0.4, f.j + 0.5, '#ff9a40', 7 + Math.sin(state.t * 9) * 0.8, 6]);
    if (powerOn()) for (const [i, j] of world.lamps) if (near(i, j, 22)) L.push([i + 0.5, 1.9, j - 0.2, '#ffc070', 9, 8]);
    for (const B of world.buildings) if (B.powered && near(B.x0, B.y0, 18)) for (const [i, j] of B.lights) L.push([i, 1.1, j, '#ffd8a0', 5, 5]);
    for (const tv of state.radios) if (tv.t === 'tv' && tv.on && near(tv.i, tv.j, 16)) L.push([tv.i + 0.5, 0.5, tv.j + 0.5, '#8ab8ff', 2.5, 3]);
    for (const g of state.gens) if (g.on && near(g.i, g.j, 16)) L.push([g.i + 0.5, 0.4, g.j + 0.5, '#a0ffa0', 1.5, 2]);
    L.sort((a, b) => Math.hypot(a[0] - p.x, a[2] - p.y) - Math.hypot(b[0] - p.x, b[2] - p.y));
  }
  R3.pool.forEach((l, k) => { const q = L[k]; if (!q) { l.intensity = 0; return; } l.position.set(q[0], q[1], q[2]); l.color.set(q[3]); l.intensity = q[4] * night * 7; l.distance = q[5] * 1.3; });
  // the flashlight
  const on = p.light && hasTool(p, 'lanterna') && scene === 'play';
  R3.torch.intensity = on ? 40 : 0;
  if (on) { const d = p.dir; R3.torch.position.set(p.x + d[0] * 0.15, 0.62, p.y + d[1] * 0.15); R3.torch.target.position.set(p.x + d[0] * 6, 0, p.y + d[1] * 6); R3.torch.target.updateMatrixWorld(); }
}

// ---- automatic quality: a device that cannot keep up draws fewer pixels, then drops the shadows ------
const R3_Q = [1.5, 1.25, 1, 0.85, 0.7];
function r3QualityDown() {
  const k = R3_Q.findIndex(q => q < R3.q - 0.01);
  if (k >= 0) { R3.q = Math.min(R3_Q[k], window.devicePixelRatio || 1); r3Resize(); return true; }
  if (R3.renderer.shadowMap.enabled) { R3.renderer.shadowMap.enabled = false; R3.scene.traverse(o => { if (o.material) { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach(m => { m.needsUpdate = true; }); } }); return true; }
  return false;
}
function r3QualityName() { return !R3.renderer.shadowMap.enabled ? 'BAIXA' : R3.q >= 1.25 ? 'ALTA' : 'MEDIA'; }
