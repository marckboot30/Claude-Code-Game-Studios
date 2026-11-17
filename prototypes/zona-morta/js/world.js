// PROTOTYPE - NOT FOR PRODUCTION
// Question: vasculhar a cidade só de cueca, sob a pressão do barulho, do frio e da fome, e montar uma base barricada é tenso e divertido por 20 minutos?
// Date: 2026-11-17
// The world: a town generated from the seed. A grid of roads; a town core of houses,
// condominiums, a library, a hospital, a fire station, a gas station and a police post;
// warehouses, woods, fields, and small and large farms around it.
'use strict';

const N = 256, PITCH = 16;
// the town sits in the middle blocks, the outskirts all around; everything else follows from these
const TOWN_B0 = 5, TOWN_B1 = 10, NB = N / PITCH;
let world = null;

function idx(i, j) { return i * N + j; }
function inMap(i, j) { return i >= 0 && j >= 0 && i < N && j < N; }
function eidx(i, j) { return i * (N + 1) + j; }
function rint(a, b) { return a + Math.floor(rng() * (b - a + 1)); }
function pick(arr) { return arr[Math.floor(rng() * arr.length)]; }
function wpick(table) { let s = 0; for (const t of table) s += t[1]; let r = rng() * s; for (const t of table) { r -= t[1]; if (r <= 0) return t[0]; } return table[0][0]; }

function newWorld() {
  return {
    N, floor: new Array(N * N).fill('grama'), fv: new Uint8Array(N * N), bld: new Int16Array(N * N).fill(-1),
    V: new Array((N + 1) * (N + 1)).fill(null), H: new Array((N + 1) * (N + 1)).fill(null),
    furn: new Array(N * N).fill(null), ground: new Map(), buildings: [], zombies: [], animals: [], pens: [],
    decals: [], explored: new Uint8Array(N * N), pois: [], lamps: [], start: null, nextId: 1, glass: new Set(),
  };
}

// ---- edges ----------------------------------------------------------------------------------
function getV(i, j) { return (i < 0 || j < 0 || i > N || j > N) ? null : world.V[eidx(i, j)]; }
function getH(i, j) { return (i < 0 || j < 0 || i > N || j > N) ? null : world.H[eidx(i, j)]; }
function setV(i, j, e) { world.V[eidx(i, j)] = e; if (e) { e.dir = 'V'; e.i = i; e.j = j; } }
function setH(i, j, e) { world.H[eidx(i, j)] = e; if (e) { e.dir = 'H'; e.i = i; e.j = j; } }
function wallEdge(kind, b, extra) { return Object.assign({ kind, b: b ? b.id : -1, barr: 0, bhp: [] }, extra || {}); }

// ---- furniture --------------------------------------------------------------------------------
function placeFurn(t, i, j, o = {}) {
  if (!inMap(i, j) || world.furn[idx(i, j)]) return null;
  const f = Object.assign({ t, i, j, v: Math.floor(rng() * 6), b: world.bld[idx(i, j)], solid: true, cont: null, loot: null, searched: false, preset: null, st: '' }, o);
  world.furn[idx(i, j)] = f; return f;
}
function placeBig(t, i, j, w, d, o = {}) {
  for (let a = i; a < i + w; a++) for (let b = j; b < j + d; b++) if (!inMap(a, b) || world.furn[idx(a, b)]) return null;
  const f = Object.assign({ t, i, j, w, d, ai: i + w - 1, aj: j + d - 1, big: true, b: world.bld[idx(i, j)], solid: true, cont: null, loot: null, searched: false, st: '' }, o);
  for (let a = i; a < i + w; a++) for (let b = j; b < j + d; b++) world.furn[idx(a, b)] = f;
  return f;
}
function addGround(i, j, it) { const k = idx(i, j); if (!world.ground.has(k)) world.ground.set(k, []); world.ground.get(k).push(it); }

// ---- buildings ------------------------------------------------------------------------------
function makeBuilding(type, x0, y0, w, d, o = {}) {
  const b = Object.assign({ id: world.buildings.length, type, x0, y0, x1: x0 + w, y1: y0 + d, ext: 'tijolo', roof: 'telha', inner: pick(INNER), floor: 'madeira', rooms: [], name: '', lights: [] }, o);
  b.ridge = Math.min(w, d) / 2; b.slope = Math.min(5, 26 / Math.max(1, b.ridge));
  world.buildings.push(b);
  for (let i = x0; i < b.x1; i++) for (let j = y0; j < b.y1; j++) { world.bld[idx(i, j)] = b.id; world.floor[idx(i, j)] = b.floor; world.furn[idx(i, j)] = null; }
  for (let i = x0; i < b.x1; i++) { setH(i, y0, wallEdge('ext', b)); setH(i, b.y1, wallEdge('ext', b)); }
  for (let j = y0; j < b.y1; j++) { setV(x0, j, wallEdge('ext', b)); setV(b.x1, j, wallEdge('ext', b)); }
  return b;
}
function room(b, x0, y0, x1, y1, kind, floor) {
  const r = { x0, y0, x1, y1, kind, used: new Set() }; b.rooms.push(r);
  if (floor) for (let i = x0; i < x1; i++) for (let j = y0; j < y1; j++) world.floor[idx(i, j)] = floor;
  b.lights.push([(x0 + x1) / 2, (y0 + y1) / 2]);
  return r;
}
// interior partition with one doorway gap (an open doorway, or a door)
function partV(b, x, ya, yb, gap, door) { for (let j = ya; j < yb; j++) { if (j === gap) { if (door) setV(x, j, wallEdge('int', b, { door: true, open: true, hp: tune.door_hp })); else setV(x, j, null); } else setV(x, j, wallEdge('int', b)); } }
function partH(b, y, xa, xb, gap, door) { for (let i = xa; i < xb; i++) { if (i === gap) { if (door) setH(i, y, wallEdge('int', b, { door: true, open: true, hp: tune.door_hp })); else setH(i, y, null); } else setH(i, y, wallEdge('int', b)); } }
function extDoor(b, side, pos) {
  const e = wallEdge('ext', b, { door: true, open: false, hp: tune.door_hp });
  if (side === 'N') setH(pos, b.y0, e); else if (side === 'S') setH(pos, b.y1, e); else if (side === 'W') setV(b.x0, pos, e); else setV(b.x1, pos, e);
  // keep the tiles either side of a door free of furniture
  const keep = side === 'N' ? [[pos, b.y0], [pos, b.y0 - 1]] : side === 'S' ? [[pos, b.y1 - 1], [pos, b.y1]] : side === 'W' ? [[b.x0, pos], [b.x0 - 1, pos]] : [[b.x1 - 1, pos], [b.x1, pos]];
  b.keep = (b.keep || []).concat(keep);
  return e;
}
function windows(b, chance) {
  const tryW = (get, set, i, j) => { const e = get(i, j); if (e && e.kind === 'ext' && !e.door && rng() < chance) { e.win = true; e.glass = 'ok'; e.ghp = tune.glass_hp; } };
  for (let i = b.x0; i < b.x1; i++) { tryW(getH, setH, i, b.y0); tryW(getH, setH, i, b.y1); }
  for (let j = b.y0; j < b.y1; j++) { tryW(getV, setV, b.x0, j); tryW(getV, setV, b.x1, j); }
}
function isKeep(b, i, j) { return (b.keep || []).some(k => k[0] === i && k[1] === j); }
function edgeAt(i, j, side) { return side === 'N' ? getH(i, j) : side === 'S' ? getH(i, j + 1) : side === 'W' ? getV(i, j) : getV(i + 1, j); }
// furniture along the walls of a room; avoids doors and keeps a path
function furnish(b, r, list) {
  const spots = [];
  for (let i = r.x0; i < r.x1; i++) for (let j = r.y0; j < r.y1; j++) {
    const wallN = edgeAt(i, j, 'N'), wallW = edgeAt(i, j, 'W'), wallE = edgeAt(i, j, 'E'), wallS = edgeAt(i, j, 'S');
    const solidSide = (e) => e && !e.door;
    const nearDoor = [wallN, wallW, wallE, wallS].some(e => e && e.door) || [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, c]) => { const ii = i + a, jj = j + c; return [edgeAt(ii, jj, 'N'), edgeAt(ii, jj, 'W'), edgeAt(ii, jj, 'E'), edgeAt(ii, jj, 'S')].some(e => e && e.door) && false; });
    const doorNear = [wallN, wallW, wallE, wallS].some(e => e && (e.door || (!e.kind)));
    if (isKeep(b, i, j) || nearDoor || doorNear) continue;
    if (solidSide(wallN) || solidSide(wallW) || solidSide(wallE) || solidSide(wallS)) spots.push([i, j]);
  }
  // a gap in an interior partition is a doorway: keep its tiles free
  const doorway = (i, j) => { for (const [a, c, s] of [[i, j, 'N'], [i, j, 'S'], [i, j, 'W'], [i, j, 'E']]) { const e = edgeAt(a, c, s); if (!e) { const ni = s === 'W' ? i - 1 : s === 'E' ? i + 1 : i, nj = s === 'N' ? j - 1 : s === 'S' ? j + 1 : j; if (inMap(ni, nj) && world.bld[idx(ni, nj)] === b.id && (ni < r.x0 || ni >= r.x1 || nj < r.y0 || nj >= r.y1)) return true; } } return false; };
  const free = spots.filter(([i, j]) => !doorway(i, j));
  for (let k = free.length - 1; k > 0; k--) { const m = Math.floor(rng() * (k + 1)); [free[k], free[m]] = [free[m], free[k]]; }
  const out = [];
  for (const item of list) {
    const [t, o] = Array.isArray(item) ? item : [item, {}];
    const s = free.find(([i, j]) => !world.furn[idx(i, j)]);
    if (!s) break;
    const f = placeFurn(t, s[0], s[1], Object.assign({ cont: CONT[t] || null }, o)); if (f) out.push(f);
  }
  return out;
}
const CONT = { guarda: 'guarda', comoda: 'comoda', armario: 'armario', geladeira: 'geladeira', balcao: 'balcao', pia: 'pia', fogao: 'fogao', estante: 'estante', escrivaninha: 'escrivaninha', prateleira: 'prateleira', caixote: 'caixote', remedios: 'remedios', feno: 'feno' };

// ---- the kinds of places --------------------------------------------------------------------
function house(x0, y0, w, d, doorSide, style) {
  const b = makeBuilding('casa', x0, y0, w, d, { ext: style || pick(['tijolo', 'azul', 'branco', 'amarelo']), roof: pick(['telha', 'azul', 'cinza', 'escura']), name: 'Casa' });
  const rooms = [];
  if (w >= 7) {
    const sx = x0 + Math.floor(w / 2) + (rng() < 0.5 ? 0 : -1);
    partV(b, sx, y0, b.y1, rint(y0 + 1, b.y1 - 2), false);
    const left = room(b, x0, y0, sx, b.y1, 'sala', 'carpete');
    if (d >= 7 && rng() < 0.6) { const sy = y0 + Math.floor(d / 2); partH(b, sy, sx, b.x1, rint(sx + 1, b.x1 - 2), true); rooms.push(left, room(b, sx, y0, b.x1, sy, 'cozinha', 'azulejo'), room(b, sx, sy, b.x1, b.y1, 'quarto', 'madeira')); }
    else rooms.push(left, room(b, sx, y0, b.x1, b.y1, rng() < 0.5 ? 'quarto' : 'cozinha', null));
  } else rooms.push(room(b, x0, y0, b.x1, b.y1, 'sala', 'madeira'));
  const sala = rooms[0];
  const span = doorSide === 'N' || doorSide === 'S' ? [sala.x0 + 1, sala.x1 - 2] : [sala.y0 + 1, sala.y1 - 2];
  extDoor(b, doorSide, rint(span[0], Math.max(span[0], span[1])));
  windows(b, 0.4);
  for (const r of rooms) {
    if (r.kind === 'sala') { const l = ['sofa', 'tv', ['estante', { cont: 'estante' }], 'comoda']; if (rng() < 0.35) l.splice(2, 0, 'radio'); if (rooms.length < 3) l.push('balcao', 'geladeira', 'fogao'); if (rooms.length < 2) l.push('cama', 'guarda'); furnish(b, r, l); }
    if (r.kind === 'cozinha') { furnish(b, r, ['geladeira', 'balcao', 'fogao', 'pia', 'mesa']); if (rooms.length < 3) furnish(b, r, ['cama', 'guarda']); }
    if (r.kind === 'quarto') furnish(b, r, ['cama', 'guarda', 'comoda']);
  }
  b.cx = x0 + w / 2; b.cy = y0 + d / 2;
  return b;
}
function fireStation(x0, y0) {
  const w = 11, d = 9;
  const b = makeBuilding('bombeiros', x0, y0, w, d, { ext: 'tijolo', roof: 'escura', inner: '#e2dccb', name: 'Corpo de Bombeiros', floor: 'concreto' });
  const gx = x0 + 6;
  partV(b, gx, y0, b.y1, y0 + 6, true);
  partH(b, y0 + 4, x0, gx, x0 + 4, false);
  partV(b, x0 + 3, y0, y0 + 4, y0 + 2, true);
  partV(b, x0 + 3, y0 + 4, b.y1, y0 + 6, true);
  const of1 = room(b, x0, y0, x0 + 3, y0 + 4, 'escritorio', 'madeira'), of2 = room(b, x0 + 3, y0, gx, y0 + 4, 'escritorio', 'madeira');
  const dorm = room(b, x0, y0 + 4, x0 + 3, b.y1, 'dormitorio', 'piso'), coz = room(b, x0 + 3, y0 + 4, gx, b.y1, 'cozinha', 'azulejo');
  const gar = room(b, gx, y0, b.x1, b.y1, 'garagem', 'concreto');
  extDoor(b, 'S', x0 + 4); // front door into the kitchen
  for (const i of [gx + 1, gx + 2, gx + 3]) extDoor(b, 'S', i); // the garage bay
  windows(b, 0.45);
  // dorm: two beds and the lockers, the axe in one
  placeFurn('armario', x0 + 2, y0 + 5, { cont: 'armario', preset: ['camiseta', 'jeans'] }); placeFurn('armario', x0 + 2, y0 + 4, { cont: 'armario', preset: ['machado', 'tenis'] }); // clothes in the nearest locker, the axe in another
  placeFurn('cama', x0, y0 + 5); placeFurn('cama', x0, y0 + 7); placeFurn('armario', x0 + 2, y0 + 8, { cont: 'armario' });
  placeFurn('guarda', x0, y0 + 8, { cont: 'guarda', preset: ['moletom'] });
  // offices
  placeFurn('escrivaninha', x0, y0, { cont: 'escrivaninha', preset: ['lanterna'] }); placeFurn('cadeira', x0 + 1, y0 + 1, { solid: false });
  placeFurn('estante', x0 + 2, y0, { cont: 'estante', preset: ['livro:carpintaria:2', 'livro:socorros:1'] });
  placeFurn('escrivaninha', x0 + 4, y0, { cont: 'escrivaninha' }); placeFurn('remedios', x0 + 5, y0, { cont: 'remedios', preset: ['bandagem', 'bandagem'] });
  placeFurn('radio', x0 + 3, y0 + 3, { st: 'on' });
  // kitchen
  placeFurn('balcao', x0 + 5, y0 + 4, { cont: 'balcao', preset: ['feijao', 'agua'] }); placeFurn('geladeira', x0 + 5, y0 + 5, { cont: 'geladeira' }); placeFurn('fogao', x0 + 5, y0 + 6, { cont: 'fogao' });
  placeFurn('tv', x0 + 3, y0 + 4); placeFurn('mesa', x0 + 4, y0 + 7); placeFurn('cadeira', x0 + 3, y0 + 7, { solid: false });
  // garage: the truck, shelves, a bench
  placeBig('caminhao', gx + 1, y0 + 2, 2, 4, { cont: 'caminhao', dir: 'J' });
  placeFurn('prateleira', gx, y0, { cont: 'prateleira', preset: ['martelo', 'pregos', 'pregos', 'pregos'] }); placeFurn('prateleira', gx + 2, y0, { cont: 'prateleira' }); placeFurn('prateleira', gx + 4, y0, { cont: 'prateleira', preset: ['serrote'] });
  placeFurn('caixote', gx + 4, y0 + 6, { cont: 'caixote', preset: ['tabua', 'tabua'] });
  world.start = { i: x0 + 1.5, j: y0 + 6.5 };
  b.cx = x0 + w / 2; b.cy = y0 + d / 2;
  return b;
}
function library(x0, y0) {
  const b = makeBuilding('biblioteca', x0, y0, 11, 9, { ext: 'concreto', roof: 'verde', inner: '#e0d0c0', name: 'Biblioteca', floor: 'carpete' });
  partV(b, x0 + 8, y0, y0 + 4, y0 + 2, true);
  room(b, x0, y0, b.x1, b.y1, 'leitura', null); room(b, x0 + 8, y0, b.x1, y0 + 4, 'escritorio', 'madeira');
  extDoor(b, 'S', x0 + 5); windows(b, 0.5);
  for (let i = x0; i < x0 + 8; i++) if (i !== x0 + 3 && i !== x0 + 4) { placeFurn('estante', i, y0, { cont: 'estanteBib' }); }
  for (const row of [y0 + 3, y0 + 5]) for (let i = x0 + 1; i < x0 + 7; i++) if (i !== x0 + 4) placeFurn('estante', i, row, { cont: 'estanteBib', v: i });
  placeFurn('mesa', x0 + 8, y0 + 6); placeFurn('mesa', x0 + 9, y0 + 6); placeFurn('cadeira', x0 + 8, y0 + 7, { solid: false });
  placeFurn('escrivaninha', x0 + 9, y0, { cont: 'escrivaninha' }); placeFurn('estante', x0 + 10, y0 + 1, { cont: 'estanteBib' });
  placeFurn('tv', x0 + 10, y0 + 5);
  b.cx = x0 + 5.5; b.cy = y0 + 4.5; return b;
}
function hospital(x0, y0) {
  const b = makeBuilding('hospital', x0, y0, 11, 10, { ext: 'hospital', roof: 'cinza', inner: '#dce6ea', name: 'Hospital', floor: 'hosp' });
  partH(b, y0 + 4, x0, b.x1, -1, false); partH(b, y0 + 6, x0, b.x1, -1, false);
  room(b, x0, y0 + 4, b.x1, y0 + 6, 'corredor', null);
  for (let k = 0; k < 3; k++) {
    const xa = x0 + k * 4, xb = Math.min(b.x1, xa + 4) - (k < 2 ? 0 : 0);
    if (k < 2) { partV(b, xa + 4, y0, y0 + 4, -1, false); partV(b, xa + 4, y0 + 6, b.y1, -1, false); }
    setH(xa + 1, y0 + 4, wallEdge('int', b, { door: true, open: rng() < 0.5, hp: tune.door_hp }));
    setH(xa + 1, y0 + 6, wallEdge('int', b, { door: true, open: rng() < 0.5, hp: tune.door_hp }));
    const r1 = room(b, xa, y0, Math.min(xb, b.x1), y0 + 4, 'enfermaria', null), r2 = room(b, xa, y0 + 6, Math.min(xb, b.x1), b.y1, 'enfermaria', null);
    furnish(b, r1, ['camaHosp', ['remedios', { cont: 'remedios' }], 'camaHosp']); furnish(b, r2, ['camaHosp', ['remedios', { cont: 'remedios' }], 'cadeira']);
  }
  extDoor(b, 'W', y0 + 4); extDoor(b, 'E', y0 + 5); windows(b, 0.5);
  b.cx = x0 + 5.5; b.cy = y0 + 5; return b;
}
function condo(x0, y0) {
  const b = makeBuilding('condominio', x0, y0, 11, 10, { ext: pick(['tijolo', 'concreto', 'amarelo']), roof: 'cinza', name: 'Condomínio', floor: 'piso' });
  partH(b, y0 + 4, x0, b.x1, -1, false); partH(b, y0 + 6, x0, b.x1, -1, false);
  room(b, x0, y0 + 4, b.x1, y0 + 6, 'corredor', 'concreto');
  const cuts = [x0, x0 + 4, x0 + 8, b.x1];
  for (let k = 0; k < 3; k++) {
    const xa = cuts[k], xb = cuts[k + 1];
    if (k < 2) { partV(b, xb, y0, y0 + 4, -1, false); partV(b, xb, y0 + 6, b.y1, -1, false); }
    setH(xa + 1, y0 + 4, wallEdge('int', b, { door: true, open: false, hp: tune.door_hp }));
    setH(xa + 1, y0 + 6, wallEdge('int', b, { door: true, open: false, hp: tune.door_hp }));
    for (const r of [room(b, xa, y0, xb, y0 + 4, 'apto', 'madeira'), room(b, xa, y0 + 6, xb, b.y1, 'apto', 'madeira')]) {
      const l = ['cama', 'guarda', 'geladeira', 'balcao']; if (rng() < 0.5) l.push('tv'); if (rng() < 0.4) l.push(['estante', { cont: 'estante' }]); if (rng() < 0.2) l.push('radio');
      furnish(b, r, l);
    }
  }
  extDoor(b, 'W', y0 + 5); extDoor(b, 'E', y0 + 4); windows(b, 0.55);
  b.cx = x0 + 5.5; b.cy = y0 + 5; return b;
}
function gasStation(x0, y0) {
  const b = makeBuilding('posto', x0, y0, 6, 5, { ext: 'branco', roof: 'telha', inner: '#e8e8e0', name: 'Posto de Gasolina', floor: 'azulejo' });
  const r = room(b, x0, y0, b.x1, b.y1, 'loja', null);
  extDoor(b, 'E', y0 + 2); windows(b, 0.7);
  placeFurn('prateleira', x0 + 1, y0 + 1, { cont: 'loja', v: 1 }); placeFurn('prateleira', x0 + 1, y0 + 3, { cont: 'loja', v: 2 }); placeFurn('prateleira', x0 + 3, y0 + 1, { cont: 'loja', v: 3 });
  placeFurn('balcao', x0 + 4, y0 + 4, { cont: 'loja', preset: ['galao'] }); placeFurn('geladeira', x0, y0, { cont: 'geladeira' });
  for (let i = x0 + 6; i < x0 + 11; i++) for (let j = y0; j < y0 + 5; j++) world.floor[idx(i, j)] = 'concreto';
  placeFurn('bomba', x0 + 7, y0 + 1); placeFurn('bomba', x0 + 9, y0 + 1); placeFurn('bomba', x0 + 7, y0 + 3); placeFurn('bomba', x0 + 9, y0 + 3);
  placeFurn('placa', x0 + 10, y0 + 4, { solid: false });
  b.cx = x0 + 3; b.cy = y0 + 2.5; return b;
}
function police(x0, y0) {
  const b = makeBuilding('delegacia', x0, y0, 7, 5, { ext: 'azul', roof: 'escura', inner: '#c8d4e0', name: 'Delegacia', floor: 'piso' });
  const r = room(b, x0, y0, b.x1, b.y1, 'escritorio', null);
  extDoor(b, 'N', x0 + 3); windows(b, 0.5);
  furnish(b, r, [['escrivaninha', { cont: 'delegacia' }], ['escrivaninha', { cont: 'escrivaninha' }], ['armario', { cont: 'armario' }], ['escrivaninha', { cont: 'delegacia' }], 'radio']);
  b.cx = x0 + 3.5; b.cy = y0 + 2.5; return b;
}
function warehouse(x0, y0, gen) {
  const b = makeBuilding('galpao', x0, y0, 10, 7, { ext: 'metal', roof: 'cinza', inner: '#9aa2aa', name: 'Galpão', floor: 'concreto' });
  room(b, x0, y0, b.x1, b.y1, 'galpao', null);
  extDoor(b, 'S', x0 + 4); extDoor(b, 'S', x0 + 5); windows(b, 0.2);
  for (const row of [y0 + 1, y0 + 4]) for (let i = x0 + 1; i < x0 + 9; i += 2) placeFurn('prateleira', i, row, { cont: 'prateleira', v: i + row });
  placeFurn('caixote', x0 + 9, y0, { cont: 'caixote' }); placeFurn('caixote', x0, y0 + 6, { cont: 'caixote' });
  if (gen) placeFurn('caixote', x0 + 9, y0 + 6, { cont: 'caixote', preset: ['gerador', 'galao'] });
  b.cx = x0 + 5; b.cy = y0 + 3.5; return b;
}
function pen(x0, y0, w, d, kind, count) {
  for (let i = x0; i < x0 + w; i++) { setH(i, y0, wallEdge('fence', null)); setH(i, y0 + d, wallEdge('fence', null)); }
  for (let j = y0; j < y0 + d; j++) { setV(x0, j, wallEdge('fence', null)); setV(x0 + w, j, wallEdge('fence', null)); }
  setH(x0 + 1, y0 + d, wallEdge('fence', null, { door: true, open: false, hp: 999 }));
  for (let i = x0; i < x0 + w; i++) for (let j = y0; j < y0 + d; j++) world.floor[idx(i, j)] = 'terra';
  const trough = placeFurn('cocho', x0 + w - 1, y0, { food: 30, water: 30, solid: true });
  const p = { x0, y0, x1: x0 + w, y1: y0 + d, kind, trough, eggDay: 0 };
  world.pens.push(p);
  if (kind === 'galinha') placeFurn('galinheiro', x0, y0, {});
  else placeFurn('feno', x0, y0, { cont: 'feno' });
  for (let k = 0; k < count; k++) world.animals.push({ kind, x: x0 + 1 + rng() * (w - 2), y: y0 + 1 + rng() * (d - 2), hp: 100, hunger: 0, pen: p, t: rng() * 5, f: 0, tx: 0, ty: 0, dead: false, milked: -1 });
  world.pois.push({ n: kind === 'galinha' ? 'Galinheiro' : 'Curral', i: x0 + w / 2, j: y0 + d / 2, k: 'animal' });
  return p;
}
function smallFarm(bx, by) {
  const x0 = bx * PITCH + 3, y0 = by * PITCH + 3;
  const b = house(x0, y0, 7, 5, 'N', pick(['amarelo', 'branco']));
  b.type = 'fazenda'; b.name = 'Fazenda pequena';
  pen(x0 + 1, y0 + 6, 5, 4, 'galinha', 4);
  for (let i = x0 + 7; i < x0 + 11; i++) for (let j = y0 + 6; j < y0 + 11; j++) world.floor[idx(i, j)] = 'campo';
  world.pois.push({ n: 'Fazenda pequena', i: x0 + 4, j: y0 + 3, k: 'fazenda' });
}
function bigFarm(bx, by) {
  const x0 = bx * PITCH + 3, y0 = by * PITCH + 3;
  const h = house(x0, y0, 5, 5, 'N', pick(['branco', 'amarelo']));
  h.type = 'fazenda'; h.name = 'Fazenda grande';
  const barn = makeBuilding('celeiro', x0 + 6, y0, 5, 5, { ext: 'celeiro', roof: 'escura', inner: '#8a6a4a', name: 'Celeiro', floor: 'terra' });
  room(barn, barn.x0, barn.y0, barn.x1, barn.y1, 'celeiro', null);
  extDoor(barn, 'S', x0 + 8); extDoor(barn, 'S', x0 + 9);
  placeFurn('feno', x0 + 6, y0, { cont: 'feno' }); placeFurn('feno', x0 + 7, y0, { cont: 'feno' }); placeFurn('feno', x0 + 10, y0 + 1, { cont: 'feno' });
  placeFurn('prateleira', x0 + 10, y0 + 3, { cont: 'prateleira' });
  placeFurn('caixote', x0 + 6, y0 + 4, { cont: 'caixote', preset: rng() < 0.6 ? ['gerador'] : ['galao'] });
  barn.cx = x0 + 8.5; barn.cy = y0 + 2.5;
  pen(x0, y0 + 6, 8, 5, 'vaca', 3);
  for (let i = x0 + 8; i < x0 + 11; i++) for (let j = y0 + 6; j < y0 + 11; j++) world.floor[idx(i, j)] = 'campo';
  world.pois.push({ n: 'Fazenda grande', i: x0 + 4, j: y0 + 3, k: 'fazenda' });
}

// ---- the whole town -----------------------------------------------------------------------------
function blockOrigin(bx, by) { return [bx * PITCH + 3, by * PITCH + 3]; }
function isTown(bx, by) { return bx >= TOWN_B0 && bx <= TOWN_B1 && by >= TOWN_B0 && by <= TOWN_B1; }
const TOWN_T0 = TOWN_B0 * PITCH - 3, TOWN_T1 = (TOWN_B1 + 1) * PITCH + 2; // the town in tiles, its outer roads included
function generateWorld() {
  world = newWorld();
  for (let k = 0; k < N * N; k++) world.fv[k] = Math.floor(rng() * 4);
  // roads: 3 tiles wide on every 16th line, a sidewalk either side in town
  const townArea = (i, j) => i >= TOWN_T0 && i <= TOWN_T1 && j >= TOWN_T0 && j <= TOWN_T1;
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const mi = ((i + 1) % PITCH), mj = ((j + 1) % PITCH);
    const rx = mi <= 2, ry = mj <= 2, sx = mi === 3 || mi === PITCH - 1, sy = mj === 3 || mj === PITCH - 1;
    const town = townArea(i, j) || (Math.abs(i - N / 2) < 3 || Math.abs(j - N / 2) < 3);
    const k = idx(i, j);
    if (rx || ry) {
      if (town) world.floor[k] = (rx && ry) ? 'asfalto' : (rx && mi === 1) ? 'faixaV' : (ry && mj === 1) ? 'faixaH' : 'asfalto';
      else world.floor[k] = 'terraRua';
    } else if ((sx || sy) && townArea(i, j)) world.floor[k] = 'calcada';
  }
  // town blocks
  // the special places land on different town blocks each game, several of each in a big town
  const special = {}, townBlocks = [];
  for (let bx = TOWN_B0; bx <= TOWN_B1; bx++) for (let by = TOWN_B0; by <= TOWN_B1; by++) townBlocks.push(bx + ',' + by);
  for (const [kind, n] of [['bombeiros', 2], ['biblioteca', 2], ['hospital', 2], ['posto', 3], ['condo', 4], ['parque', 3], ['delegacia', 2]])
    for (let c = 0; c < n && townBlocks.length; c++) special[townBlocks.splice(Math.floor(rng() * townBlocks.length), 1)[0]] = kind;
  for (let bx = 0; bx < NB; bx++) for (let by = 0; by < NB; by++) {
    const [x0, y0] = blockOrigin(bx, by);
    if (!isTown(bx, by)) continue;
    const s = special[bx + ',' + by];
    if (s === 'bombeiros') { const b = fireStation(x0, y0 + 1); world.pois.push({ n: 'Corpo de Bombeiros', i: b.cx, j: b.cy, k: 'bombeiros' }); for (let i = x0; i < x0 + 11; i++) world.floor[idx(i, y0 + 10)] = 'concreto'; }
    else if (s === 'biblioteca') { const b = library(x0, y0 + 1); world.pois.push({ n: 'Biblioteca', i: b.cx, j: b.cy, k: 'biblioteca' }); }
    else if (s === 'hospital') { const b = hospital(x0, y0); world.pois.push({ n: 'Hospital', i: b.cx, j: b.cy, k: 'hospital' }); }
    else if (s === 'posto') { const b = gasStation(x0, y0); world.pois.push({ n: 'Posto', i: b.cx + 3, j: b.cy, k: 'posto' }); house(x0 + 1, y0 + 6, rint(7, 9), 5, 'S'); }
    else if (s === 'condo') { const b = condo(x0, y0); world.pois.push({ n: 'Condomínio', i: b.cx, j: b.cy, k: 'condominio' }); }
    else if (s === 'delegacia') { const b = police(x0 + 2, y0); world.pois.push({ n: 'Delegacia', i: b.cx, j: b.cy, k: 'delegacia' }); house(x0 + rint(0, 2), y0 + 6, rint(7, 9), 5, 'S'); }
    else if (s === 'parque') {
      for (let i = x0 + 3; i < x0 + 8; i++) for (let j = y0 + 3; j < y0 + 7; j++) if (!((i === x0 + 3 || i === x0 + 7) && (j === y0 + 3 || j === y0 + 6))) world.floor[idx(i, j)] = 'agua';
      for (let k = 0; k < 14; k++) { const i = rint(x0, x0 + 10), j = rint(y0, y0 + 10); if (world.floor[idx(i, j)] === 'grama') placeFurn('arvore', i, j, { v: k }); }
      placeFurn('banco', x0 + 5, y0 + 8, { solid: false }); placeFurn('banco', x0 + 1, y0 + 4, { solid: false }); placeFurn('lixeira', x0 + 9, y0 + 9);
      world.pois.push({ n: 'Parque', i: x0 + 5.5, j: y0 + 5, k: 'parque' });
    } else {
      // houses: two facing the north and south streets, or one large one
      if (rng() < 0.75) { house(x0 + rint(0, 3), y0, rint(7, 8), 5, 'N'); house(x0 + rint(0, 3), y0 + 6, rint(7, 8), 5, 'S'); }
      else { house(x0 + 1, y0 + 1, 9, 8, pick(['N', 'S'])); }
      for (let k = 0; k < 3; k++) { const i = rint(x0, x0 + 10), j = rint(y0, y0 + 10); if (world.bld[idx(i, j)] < 0 && !world.furn[idx(i, j)] && rng() < 0.7) placeFurn(rng() < 0.6 ? 'arvore' : 'arbusto', i, j, { v: k + i }); }
    }
  }
  // outskirts
  const kinds = {}, out = [];
  const ring1 = (bx, by) => bx >= TOWN_B0 - 2 && bx <= TOWN_B1 + 2 && by >= TOWN_B0 - 2 && by <= TOWN_B1 + 2;
  for (let bx = 0; bx < NB; bx++) for (let by = 0; by < NB; by++) if (!isTown(bx, by)) out.push([bx, by]);
  for (const [bx, by] of out) {
    kinds[bx + ',' + by] = ring1(bx, by) ? wpick([['galpao', 25], ['fazendaP', 20], ['campo', 20], ['mata', 20], ['casa', 15]]) : wpick([['mata', 40], ['fazendaG', 20], ['fazendaP', 15], ['campo', 25]]);
  }
  const force = (kind, n, ring) => { let have = Object.values(kinds).filter(k => k === kind).length; const cands = out.filter(([bx, by]) => (ring ? ring1(bx, by) : true) && !['galpao', 'fazendaP', 'fazendaG'].includes(kinds[bx + ',' + by])); while (have < n && cands.length) { const c = cands.splice(Math.floor(rng() * cands.length), 1)[0]; kinds[c[0] + ',' + c[1]] = kind; have++; } };
  force('galpao', 6, true); force('fazendaP', 6, true); force('fazendaG', 6, false);
  let firstGen = true;
  for (const [bx, by] of out) {
    const [x0, y0] = blockOrigin(bx, by), k = kinds[bx + ',' + by];
    if (k === 'galpao') { const b = warehouse(x0, y0 + 2, firstGen || rng() < 0.5); firstGen = false; world.pois.push({ n: 'Galpão', i: b.cx, j: b.cy, k: 'galpao' }); }
    else if (k === 'fazendaP') smallFarm(bx, by);
    else if (k === 'fazendaG') bigFarm(bx, by);
    else if (k === 'casa') { house(x0 + 2, y0 + 3, rint(6, 8), 5, 'N', 'madeira'); }
    const dens = k === 'mata' ? 0.27 : k === 'campo' ? 0.03 : 0.03;
    for (let i = x0 - 1; i < x0 + 12; i++) for (let j = y0 - 1; j < y0 + 12; j++) {
      if (!inMap(i, j) || world.bld[idx(i, j)] >= 0 || world.furn[idx(i, j)]) continue;
      const fl = world.floor[idx(i, j)]; if (fl !== 'grama') continue;
      if (rng() < dens) placeFurn('arvore', i, j, { v: i * 7 + j });
      else if (k === 'mata' && rng() < 0.08) placeFurn('arbusto', i, j, { v: i + j, solid: false });
    }
    if (k === 'mata') world.pois.push({ n: 'Mata', i: x0 + 5.5, j: y0 + 5.5, k: 'mata' });
    if (k === 'campo' && rng() < 0.4) { const ci = x0 + rint(2, 6), cj = y0 + rint(2, 6); for (let i = ci; i < ci + 3; i++) for (let j = cj; j < cj + 2; j++) { world.floor[idx(i, j)] = 'agua'; world.furn[idx(i, j)] = null; } world.pois.push({ n: 'Lagoa', i: ci + 1.5, j: cj + 1, k: 'lagoa' }); }
  }
  // street lamps and abandoned cars
  for (let i = TOWN_T0; i <= TOWN_T1; i++) for (let j = TOWN_T0; j <= TOWN_T1; j++) {
    const k = idx(i, j); if (world.floor[k] !== 'calcada' || world.furn[k]) continue;
    if ((i * 3 + j * 5) % 23 === 0) { placeFurn('poste', i, j, { solid: false }); world.lamps.push([i + 0.5, j + 0.5]); }
  }
  let cars = 0, tries = 0;
  while (cars < 130 && tries++ < 16000) {
    const i = rint(2, N - 4), j = rint(2, N - 4), mi = (i + 1) % PITCH, mj = (j + 1) % PITCH;
    const alongJ = mi <= 2 && mj > 3 && mj < PITCH - 3, alongI = mj <= 2 && mi > 3 && mi < PITCH - 3;
    if (!alongJ && !alongI) continue;
    const col = pick(['#5a6a8a', '#8a3a3a', '#d8d4c8', '#3a5a3a', '#c8a040', '#4a4a52']);
    const f = alongJ ? placeBig('carro', i, j, 1, 2, { dir: 'J', col, cont: 'carro', fuel: Math.round(rng() * tune.car_fuel_max) }) : placeBig('carro', i, j, 2, 1, { dir: 'I', col, cont: 'carro', fuel: Math.round(rng() * tune.car_fuel_max) });
    if (f) cars++;
  }
  // zombies: two in the street outside the fire station for the first minute, the rest spread
  // where you wake: a home picked at random each game (a house, a condominium, a farm or the fire station)
  chooseStart();
  const s = world.start;
  // two slow ones outside, a few houses away, for the first minute
  for (let n = 0, tries2 = 0; n < 2 && tries2 < 400; tries2++) {
    const a = rng() * Math.PI * 2, r = 6 + rng() * 3, x = s.i + Math.cos(a) * r, y = s.j + Math.sin(a) * r, i = Math.floor(x), j = Math.floor(y);
    if (!inMap(i, j) || world.bld[idx(i, j)] >= 0 || (world.furn[idx(i, j)] && world.furn[idx(i, j)].solid) || world.floor[idx(i, j)] === 'agua') continue;
    spawnZombie(x, y, 'comum'); n++;
  }
  let placed = 0; tries = 0;
  while (placed < tune.zombies_start && tries++ < 60000) {
    const town = rng() < 0.45; // about the old crowding in town, spread over a bigger one
    const TS = TOWN_T1 - TOWN_T0, i = town ? TOWN_T0 + 1 + rng() * TS : rng() * (N - 2) + 1, j = town ? TOWN_T0 + 1 + rng() * TS : rng() * (N - 2) + 1;
    const k = idx(Math.floor(i), Math.floor(j));
    if (world.furn[k] && world.furn[k].solid) continue; if (world.floor[k] === 'agua') continue;
    if (Math.hypot(i - s.i, j - s.j) < tune.start_safe_radius) continue;
    if (world.bld[k] >= 0 && world.bld[k] === s.b) continue; // nobody inside the place you wake
    spawnZombie(i, j, rng() < 0.1 ? 'gordo' : rng() < 0.06 ? 'rastejante' : 'comum'); placed++;
  }
  buildMapImage();
}
function chooseStart() {
  // pick the kind of place first, so the many houses and farms of a big world don't crowd out the rest
  const kinds = [['casa', 45], ['condominio', 20], ['fazenda', 20], ['bombeiros', 15]].filter(([t]) => world.buildings.some(b => b.type === t));
  const kind = wpick(kinds), homes = world.buildings.filter(b => b.type === kind);
  const b = homes[Math.floor(rng() * homes.length)];
  const free = [];
  for (let i = b.x0; i < b.x1; i++) for (let j = b.y0; j < b.y1; j++) { const k = idx(i, j); if (world.bld[k] === b.id && !world.furn[k] && world.floor[k] !== 'agua') free.push([i, j]); }
  // wake next to a bed when the place has one
  const nearBed = free.filter(([i, j]) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, c]) => { const f = inMap(i + a, j + c) && world.furn[idx(i + a, j + c)]; return f && (f.t === 'cama' || f.t === 'camaHosp'); }));
  const pickFrom = nearBed.length ? nearBed : free, t = pickFrom[Math.floor(rng() * pickFrom.length)];
  world.start = { i: t[0] + 0.5, j: t[1] + 0.5, b: b.id, name: b.name };
  // the first search always finds something to wear
  let box = null;
  for (let i = b.x0; i < b.x1 && !box; i++) for (let j = b.y0; j < b.y1; j++) { const f = world.furn[idx(i, j)]; if (f && ['guarda', 'comoda', 'armario'].includes(f.t)) { box = f; break; } }
  if (!box) for (let i = b.x0; i < b.x1 && !box; i++) for (let j = b.y0; j < b.y1; j++) { const f = world.furn[idx(i, j)]; if (f && f.cont) { box = f; break; } }
  if (box) box.preset = (box.preset || []).concat(['camiseta', 'jeans']); else { addGround(t[0], t[1], newItem('camiseta')); addGround(t[0], t[1], newItem('jeans')); }
}
function spawnZombie(x, y, kind) {
  const d = ZKINDS[kind];
  const z = { id: world.nextId++, kind, x, y, hp: d.hp, state: 'idle', tx: x, ty: y, t: rng() * 3, f: 0, face: rng() < 0.5 ? 1 : -1, back: rng() < 0.5, atk: 0, cd: 0, down: 0, bash: 0, outfit: Math.floor(rng() * ZOUTFITS.length), dead: false, wander: rng() * 4, climb: 0, groan: rng() * 8 };
  world.zombies.push(z); return z;
}

// ---- the map picture (an iso diamond, like the view) -------------------------------------------
const MAP_COL = { grama: '#5e6a32', terra: '#7b6446', campo: '#6e5638', asfalto: '#3e4148', faixaV: '#3e4148', faixaH: '#3e4148', calcada: '#8a8a84', agua: '#3a6e9e', terraRua: '#8a7456', concreto: '#6c7078' };
const BLD_COL = { casa: '#a8885a', bombeiros: '#c9302c', biblioteca: '#5a8a5a', hospital: '#d8e0e2', posto: '#e8c040', condominio: '#b87a4a', delegacia: '#4a6a9a', galpao: '#8a949e', fazenda: '#c8a070', celeiro: '#9a3a2a' };
let mapCanvas = null, fogCanvas = null;
function mapXY(i, j) { return [i - j + N - 1, Math.floor((i + j) / 2)]; }
function buildMapImage() {
  mapCanvas = mkCanvas(2 * N, N); fogCanvas = mkCanvas(2 * N, N);
  const x = mapCanvas.getContext('2d'), img = x.createImageData(2 * N, N), d = img.data, rgb = {};
  const toRgb = c => rgb[c] || (rgb[c] = [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]);
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const k = idx(i, j), b = world.bld[k];
    let col = b >= 0 ? BLD_COL[world.buildings[b].type] || '#a8885a' : MAP_COL[world.floor[k]] || '#5e6a32';
    const f = world.furn[k]; if (f && f.t === 'arvore') col = '#3a4a22';
    const [px, py] = mapXY(i, j), c = toRgb(col);
    for (let q = 0; q < 2; q++) { const o = (py * 2 * N + px + q) * 4; d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255; }
  }
  x.putImageData(img, 0, 0);
  const fx = fogCanvas.getContext('2d'); fx.fillStyle = '#0b0d12'; fx.fillRect(0, 0, 2 * N, N);
}
function explore(ci, cj, r) {
  const fx = fogCanvas.getContext('2d');
  for (let i = Math.floor(ci - r); i <= ci + r; i++) for (let j = Math.floor(cj - r); j <= cj + r; j++) {
    if (!inMap(i, j) || world.explored[idx(i, j)]) continue;
    if ((i - ci) ** 2 + (j - cj) ** 2 > r * r) continue;
    world.explored[idx(i, j)] = 1; const [px, py] = mapXY(i, j); fx.clearRect(px, py, 2, 1);
  }
}
