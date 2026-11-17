// PROTOTYPE - NOT FOR PRODUCTION
// Question: vasculhar a cidade só de cueca, sob a pressão do barulho, do frio e da fome, e montar uma base barricada é tenso e divertido por 20 minutos?
// Date: 2026-11-17
// Art: every tile, wall, roof, piece of furniture, figure, icon and HUD glyph is drawn here in
// code, in clean isometric pixel art (2:1 tiles of 32x16, 1px dark outline, no smoothing).
'use strict';

const AR = 2; // art resolution: every world picture is drawn with 2x2 the pixels of the 1x design, so the squares are small
const TW = 32, TH = 16, WALL_H = 30, CUT_H = 5, WT = 0.16;
const OUTLINE = '#14161c';

function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return c; }

// ---- primitive pixel drawing on any 2D context ----------------------------------------------
function pfill(c, pts, col) { // crisp scanline polygon; col is a colour or fn(x,y) -> colour|null
  let y0 = Infinity, y1 = -Infinity;
  for (const p of pts) { if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
  y0 = Math.floor(y0); y1 = Math.ceil(y1);
  const fn = typeof col === 'function';
  if (!fn) c.fillStyle = col;
  for (let y = y0; y < y1; y++) {
    const yy = y + 0.5, xs = [];
    for (let k = 0; k < pts.length; k++) {
      const a = pts[k], b = pts[(k + 1) % pts.length];
      if ((a[1] <= yy && b[1] > yy) || (b[1] <= yy && a[1] > yy)) xs.push(a[0] + (yy - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const xa = Math.round(xs[k]), xb = Math.round(xs[k + 1]);
      if (!fn) c.fillRect(xa, y, xb - xa, 1);
      else for (let x = xa; x < xb; x++) { const cc = col(x, y); if (cc) { c.fillStyle = cc; c.fillRect(x, y, 1, 1); } }
    }
  }
}
function pline(c, x0, y0, x1, y1, col) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let e = dx + dy; c.fillStyle = col;
  for (;;) { c.fillRect(x0, y0, 1, 1); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
}
function prect(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
function pdisc(c, cx, cy, r, col, sy = 1) { for (let y = -r; y <= r; y++) { const w = Math.round(Math.sqrt(Math.max(0, r * r - y * y))); prect(c, cx - w, cy + y * sy, w * 2 + 1, Math.max(1, Math.ceil(sy)), col); } }
function hash2(x, y, s = 0) { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }

// iso projection on a local canvas with origin (ox, oy) = world (0,0,0)
function L(ox, oy) { return (i, j, z = 0) => [ox + (i - j) * 16 * AR, oy + (i + j) * 8 * AR - z * AR]; } // heights z stay in 1x units

// a solid box from (i,j) of size (w,d) and height h, lifted by z0; outlined
function pbox(c, P, i, j, w, d, h, z0, cT, cL, cR, ol = OUTLINE) {
  const Lf = [P(i, j + d, z0), P(i + w, j + d, z0), P(i + w, j + d, z0 + h), P(i, j + d, z0 + h)];
  const Rf = [P(i + w, j, z0), P(i + w, j + d, z0), P(i + w, j + d, z0 + h), P(i + w, j, z0 + h)];
  const Tf = [P(i, j, z0 + h), P(i + w, j, z0 + h), P(i + w, j + d, z0 + h), P(i, j + d, z0 + h)];
  if (h > 0) { pfill(c, Lf, cL); pfill(c, Rf, cR); }
  pfill(c, Tf, cT);
  if (ol) {
    const e = (a, b) => pline(c, a[0], a[1], b[0], b[1], ol);
    e(Tf[0], Tf[1]); e(Tf[1], Tf[2]); e(Tf[2], Tf[3]); e(Tf[3], Tf[0]);
    if (h > 0) { e(Lf[0], Lf[1]); e(Lf[1], Rf[0]); e(Lf[0], Lf[3]); e(Lf[1], Lf[2]); e(Rf[0], Rf[3]); }
  }
}
// a flat quad on the face at j=const spanning i u0..u1 (left-facing / south face)
function faceS(c, P, i, j, u0, u1, z0, z1, col) { pfill(c, [P(i + u0, j, z0), P(i + u1, j, z0), P(i + u1, j, z1), P(i + u0, j, z1)], col); }
// a flat quad on the face at i=const spanning j u0..u1 (right-facing / east face)
function faceE(c, P, i, j, u0, u1, z0, z1, col) { pfill(c, [P(i, j + u0, z0), P(i, j + u1, z0), P(i, j + u1, z1), P(i, j + u0, z1)], col); }

function outlineCanvas(cv, col = OUTLINE) { // 1px outline around every opaque pixel
  const x = cv.getContext('2d'), w = cv.width, h = cv.height, d = x.getImageData(0, 0, w, h), a = d.data;
  const solid = (i, j) => i >= 0 && j >= 0 && i < w && j < h && a[(j * w + i) * 4 + 3] > 40;
  const add = [];
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (!solid(i, j) && (solid(i - 1, j) || solid(i + 1, j) || solid(i, j - 1) || solid(i, j + 1))) add.push(i, j);
  x.fillStyle = col; for (let k = 0; k < add.length; k += 2) x.fillRect(add[k], add[k + 1], 1, 1);
  return cv;
}

// a 1x sprite becomes a 2x one with smoothed diagonals (EPX), then gets its thin outline
function epx(src) {
  const w = src.width, h = src.height, s = src.getContext('2d').getImageData(0, 0, w, h).data;
  const out = mkCanvas(w * 2, h * 2), oc = out.getContext('2d'), od = oc.createImageData(w * 2, h * 2), d = od.data;
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? -1 : (y * w + x) * 4;
  const same = (a, b) => { const ta = a < 0 || s[a + 3] === 0, tb = b < 0 || s[b + 3] === 0; if (ta || tb) return ta && tb; return s[a] === s[b] && s[a + 1] === s[b + 1] && s[a + 2] === s[b + 2]; };
  const put = (x, y, q) => { const k = (y * w * 2 + x) * 4; if (q < 0) return; d[k] = s[q]; d[k + 1] = s[q + 1]; d[k + 2] = s[q + 2]; d[k + 3] = s[q + 3]; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const P = at(x, y), A = at(x, y - 1), B = at(x + 1, y), C = at(x - 1, y), D = at(x, y + 1);
    let p1 = P, p2 = P, p3 = P, p4 = P;
    if (same(C, A) && !same(C, D) && !same(A, B)) p1 = A;
    if (same(A, B) && !same(A, C) && !same(B, D)) p2 = B;
    if (same(D, C) && !same(D, B) && !same(C, A)) p3 = C;
    if (same(B, D) && !same(B, A) && !same(D, C)) p4 = D;
    put(2 * x, 2 * y, p1); put(2 * x + 1, 2 * y, p2); put(2 * x, 2 * y + 1, p3); put(2 * x + 1, 2 * y + 1, p4);
  }
  oc.putImageData(od, 0, 0); return out;
}
// the figures the game shows most, made before play so walking never waits for them
function prewarmSprites() {
  for (let o = 0; o < ZOUTFITS.length; o++) for (const kind of ['comum', 'gordo', 'corredor']) for (const back of [false, true]) {
    const base = Object.assign(zombieLook({ outfit: o, kind }), { back });
    for (let f = 0; f < 4; f++) humanImg(Object.assign({}, base, { pose: 'walk', f }));
    humanImg(Object.assign({}, base, { pose: 'attack', f: 0 })); humanImg(Object.assign({}, base, { pose: 'attack', f: 1 })); humanImg(Object.assign({}, base));
  }
}
function finishSprite(c) { const big = AR === 2 ? epx(c) : c; outlineCanvas(big); return big; }

// ---- bitmap font 3x5 (accents dropped) --------------------------------------------------------
const FONT3 = { A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010', U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010', Z: '111001010100111',
  0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110', 4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010', 8: '111101111101111', 9: '111101111001110',
  ':': '000010000010000', '.': '000000000000010', ',': '000000000010100', '-': '000000111000000', '/': '001001010100100', '[': '110100100100110', ']': '011001001001011', '%': '101001010100101', '+': '000010111010000', '!': '010010010000010', '?': '110001010000010', '(': '010100100100010', ')': '010001001001010', "'": '010010000000000', '"': '101101000000000', '=': '000111000111000', '<': '001010100010001', '>': '100010001010100', '_': '000000000000111', '*': '000101010101000', '#': '101111101111101', ' ': '000000000000000' };
function normTxt(s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase(); }
function textW(s, sc = 1) { s = normTxt(s); return s.length ? (s.length * 4 - 1) * sc : 0; }
// text on the main screen is drawn once into a small picture and reused: drawing every glyph
// pixel each frame was the HUD's whole cost on a phone
const textCache = new Map();
const TEXT_CTX = (typeof ctx !== 'undefined') ? ctx : null;
function ptext(c, s, x, y, col, sh = '#0b0d12', sc = 1, align = 'left') {
  s = normTxt(s); x = Math.round(x); y = Math.round(y);
  if (align === 'center') x -= Math.floor(textW(s, sc) / 2); else if (align === 'right') x -= textW(s, sc);
  if (c === TEXT_CTX && s.length) {
    const key = s + '|' + col + '|' + sh + '|' + sc;
    let e = textCache.get(key);
    if (!e) {
      const w = textW(s, sc) + (sh ? sc : 0), h = 5 * sc + (sh ? sc : 0), cv = mkCanvas(Math.ceil(w * AR), Math.ceil(h * AR)), x2 = cv.getContext('2d');
      x2.scale(AR, AR); rawText(x2, s, 0, 0, col, sh, sc); e = { cv, w: cv.width / AR, h: cv.height / AR };
      if (textCache.size > 700) textCache.clear(); textCache.set(key, e);
    }
    c.drawImage(e.cv, x, y, e.w, e.h); return;
  }
  rawText(c, s, x, y, col, sh, sc);
}
function rawText(c, s, x, y, col, sh, sc) {
  for (const pass of sh ? [0, 1] : [1]) {
    c.fillStyle = pass === 0 ? sh : col;
    let cx = x;
    for (const ch of s) {
      const b = FONT3[ch] || FONT3[' '];
      for (let k = 0; k < 15; k++) if (b[k] === '1') c.fillRect(cx + (k % 3) * sc + (pass === 0 ? sc : 0), y + ((k / 3) | 0) * sc + (pass === 0 ? sc : 0), sc, sc);
      cx += 4 * sc;
    }
  }
}
function wrapTxt(s, maxW) { const words = normTxt(s).split(' '), out = []; let line = ''; for (const w of words) { const t = line ? line + ' ' + w : w; if (textW(t) > maxW && line) { out.push(line); line = w; } else line = t; } if (line) out.push(line); return out; }

// ---- floors -----------------------------------------------------------------------------------
const FLOOR_BASE = {
  grama: ['#6f7a3c', '#6d783b', '#717c3e', '#6e793c'], terra: ['#7b6446'], campo: ['#6e5638'], asfalto: ['#4d5058'], faixaV: ['#4d5058'], faixaH: ['#4d5058'],
  calcada: ['#9a9a94'], madeira: ['#80542f'], azulejo: ['#d9d6cc'], piso: ['#cfc8b1'], concreto: ['#7c8088'], carpete: ['#6a5a7a'], agua: ['#3a6e9e'], areia: ['#b8a878'], terraRua: ['#8a7456'], hosp: ['#d4dde0'],
};
const FLOOR_SOLID = { agua: true };
const floorCache = {};
function floorImg(type, v) {
  const key = type + v; if (floorCache[key]) return floorCache[key];
  const c = mkCanvas(32 * AR, 16 * AR), x = c.getContext('2d');
  const bases = FLOOR_BASE[type] || ['#f0f'], base = bases[v % bases.length];
  const dia = [[16 * AR, 0], [32 * AR, 8 * AR], [16 * AR, 16 * AR], [0, 8 * AR]];
  const f = (px, py) => {
    const n = hash2(px + v * 31, py + v * 17, type.length);
    switch (type) {
      case 'grama': return n < 0.025 ? '#7f8a48' : n < 0.045 ? '#636d34' : base;
      case 'terra': case 'terraRua': return n < 0.03 ? '#705a3e' : n < 0.05 ? '#867050' : base;
      case 'campo': return ((py - px * 0.5 + 64) % 4 < 1.5) ? '#5a4428' : (n < 0.05 ? '#7d6a40' : base);
      case 'asfalto': return n < 0.03 ? '#484b52' : n < 0.05 ? '#53565e' : base;
      case 'faixaV': { const on = Math.abs((px - 16 * AR) - (py - 8 * AR) * -2) < 1.6 * AR && (py < 6 * AR || py > 10 * AR); return on ? '#d8d0a0' : base; }
      case 'faixaH': { const on = Math.abs((px - 16 * AR) - (py - 8 * AR) * 2) < 1.6 * AR && (py < 6 * AR || py > 10 * AR); return on ? '#d8d0a0' : base; }
      case 'calcada': return (px === 16 * AR || (py === 8 * AR)) ? '#8c8c86' : base;
      case 'madeira': { const r = ((py - px * 0.5) % 4 + 4) % 4; return r < 1 ? '#6e4626' : (n < 0.04 ? '#8c6038' : base); }
      case 'azulejo': { const a = ((py - px * 0.5) % 8 + 8) % 8, b = ((py + px * 0.5) % 8 + 8) % 8; return (a < 1 || b < 1) ? '#b8b4a8' : base; }
      case 'hosp': { const a = ((py - px * 0.5) % 8 + 8) % 8, b = ((py + px * 0.5) % 8 + 8) % 8; return (a < 1 || b < 1) ? '#b4c2c8' : base; }
      case 'piso': return ((px + py) % 8 === 0) ? '#bdb6a0' : base;
      case 'concreto': return n < 0.03 ? '#767a82' : base;
      case 'carpete': return n < 0.05 ? '#655572' : base;
      case 'agua': return (hash2(px, py, v) < 0.05) ? '#8ab8e0' : ((py + v) % 4 === 0 && n < 0.4) ? '#4a80b0' : base;
      case 'areia': return n < 0.04 ? '#b0a070' : base;
      default: return base;
    }
  };
  pfill(x, dia, f);
  floorCache[key] = c; return c;
}

// ---- wall materials ----------------------------------------------------------------------------
// patterns sized so neighbouring segments line up (periods divide the 16/8 tile steps)
function brickS(base, mort, dark) { return (x, y) => { const k = y - x * 0.5, band = Math.floor(k / 4), r = ((k % 4) + 4) % 4; if (r < 1) return mort; const jx = ((x + (band & 1 ? 4 : 0)) % 8 + 8) % 8; return jx === 0 ? mort : (hash2(band, Math.floor(x / 8)) < 0.15 ? dark : base); }; }
function brickE(base, mort, dark) { return (x, y) => { const k = y + x * 0.5, band = Math.floor(k / 4), r = ((k % 4) + 4) % 4; if (r < 1) return mort; const jx = ((x + (band & 1 ? 4 : 0)) % 8 + 8) % 8; return jx === 0 ? mort : (hash2(band, Math.floor(x / 8), 3) < 0.15 ? dark : base); }; }
function plankV(base, line) { return (x) => ((x % 4) + 4) % 4 === 0 ? line : base; }
function sidingS(base, line) { return (x, y) => { const k = y - x * 0.5; return ((k % 3) + 3) % 3 < 1 ? line : base; }; }
function sidingE(base, line) { return (x, y) => { const k = y + x * 0.5; return ((k % 3) + 3) % 3 < 1 ? line : base; }; }
function metalV(base, line) { return (x) => ((x % 3) + 3) % 3 === 0 ? line : base; }

// exterior styles: per building type, the outward face
const EXT = {
  tijolo: { S: brickS('#9c3b26', '#6e2a1c', '#8a3220'), E: brickE('#83301f', '#5c2216', '#742a1b'), cap: '#4a2a20' },
  azul: { S: sidingS('#7a96b4', '#5e7896'), E: sidingE('#647f9c', '#4c647e'), cap: '#3a4048' },
  branco: { S: sidingS('#d8d4c8', '#b4b0a4'), E: sidingE('#bcb8ac', '#9c988c'), cap: '#4a4844' },
  amarelo: { S: sidingS('#c8b070', '#a89050'), E: sidingE('#ac9658', '#8c7840'), cap: '#4a4430' },
  concreto: { S: (x, y) => (hash2(x, y) < 0.05 ? '#8a8e94' : '#a2a6ac'), E: (x, y) => (hash2(x, y, 2) < 0.05 ? '#72767c' : '#868a90'), cap: '#3a3c40' },
  metal: { S: metalV('#8a949e', '#6e7882'), E: metalV('#6e7882', '#566068'), cap: '#3a3e44' },
  celeiro: { S: plankV('#9a3a2a', '#6e2418'), E: plankV('#7e2e20', '#5a1c12'), cap: '#3a201a' },
  hospital: { S: (x, y) => ((y - x * 0.5) % 8 + 8) % 8 < 1 ? '#a8b4b8' : '#d8e0e2', E: (x, y) => ((y + x * 0.5) % 8 + 8) % 8 < 1 ? '#8c989c' : '#b8c2c6', cap: '#40484c' },
  madeira: { S: plankV('#a8784a', '#7a5230'), E: plankV('#8a6038', '#664424'), cap: '#4a3420' },
};
const INNER = ['#e2dccb', '#b9cdb6', '#d6c8b8', '#c8d4e0', '#e0d0c0', '#d8d8d0'];
function innerS(col) { return col; }
function shade(hex, k) { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255; r = Math.max(0, Math.min(255, Math.round(r * k))); g = Math.max(0, Math.min(255, Math.round(g * k))); b = Math.max(0, Math.min(255, Math.round(b * k))); return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1); }

// ---- walls -------------------------------------------------------------------------------------
// spec: dir V (line x=i, runs along j, visible face looks east) or H (line y=j, runs along i,
// visible face looks south); face: colour or pattern; feature: '', 'door', 'window'; state.
const wallCache = {};
const WOX = 18;
function wallImg(dir, face, faceKey, h, feature, st, cap, barr) {
  const key = [dir, faceKey, h, feature, st, cap, barr].join('|');
  if (wallCache[key]) return wallCache[key];
  const c = mkCanvas(36 * AR, (h + 16) * AR), x = c.getContext('2d'), P = L(WOX * AR, (h + 3) * AR);
  const side = typeof face === 'string' ? shade(face, 0.8) : '#5a4a40';
  const seg = (u0, u1, z0, z1) => { // a piece of the wall between u0..u1 along it, from z0 to z1
    if (dir === 'V') pbox(x, P, -WT / 2, u0, WT, u1 - u0, z1 - z0, z0, cap, side, face);
    else pbox(x, P, u0, -WT / 2, u1 - u0, WT, z1 - z0, z0, cap, face, side);
  };
  const quad = (u0, u1, z0, z1, col) => dir === 'V' ? faceE(x, P, WT / 2, 0, u0, u1, z0, z1, col) : faceS(x, P, 0, WT / 2, u0, u1, z0, z1, col);
  const cut = h < 12;
  if (feature === 'door' && (st === 'open' || st === 'broken')) {
    seg(0, 0.15, 0, h); seg(0.85, 1, 0, h);
    if (!cut) seg(0.15, 0.85, 22, h);
    if (st === 'open' && !cut) { // the door leaf swung into the room
      if (dir === 'V') pbox(x, P, WT / 2, 0.1, 0.62, 0.08, 20, 0, '#5a3a20', '#8a5a32', '#6e4626');
      else pbox(x, P, 0.1, WT / 2, 0.08, 0.62, 20, 0, '#5a3a20', '#8a5a32', '#6e4626');
    }
    if (st === 'broken') for (let k = 0; k < 4; k++) { const p = dir === 'V' ? P(0.3 + k * 0.1, 0.25 + k * 0.15, 0) : P(0.25 + k * 0.15, 0.3 + k * 0.1, 0); prect(x, p[0], p[1], 3 * AR, AR, '#6e4626'); }
  } else {
    seg(0, 1, 0, h);
    if (feature === 'door' && !cut) { quad(0.18, 0.82, 0, 21, '#6e4626'); quad(0.22, 0.78, 2, 19, '#8a5a32'); const k = dir === 'V' ? P(WT / 2, 0.7, 10) : P(0.7, WT / 2, 10); prect(x, k[0], k[1], 1, 1, '#e0c060'); }
    if (feature === 'door' && cut) quad(0.18, 0.82, 0, h, '#6e4626');
    if (feature === 'window' && !cut) {
      quad(0.16, 0.84, 9, 23, '#e8e4d8');
      if (st === 'ok') { quad(0.22, 0.78, 10, 22, '#5c7ea0'); quad(0.3, 0.45, 13, 20, '#86aac8'); }
      else if (st === 'open') { quad(0.22, 0.78, 10, 22, '#1d2430'); quad(0.22, 0.78, 10, 14, '#5c7ea0'); }
      else { quad(0.22, 0.78, 10, 22, '#1d2430'); quad(0.22, 0.34, 10, 15, '#86aac8'); quad(0.6, 0.78, 17, 22, '#86aac8'); }
    }
  }
  if (barr > 0 && !cut) { // planks nailed across
    const zs = [[12, 20], [20, 12], [7, 15], [16, 6]];
    for (let k = 0; k < barr; k++) {
      const [za, zb] = zs[k];
      const a = dir === 'V' ? P(WT / 2 + 0.02, 0.05, za) : P(0.05, WT / 2 + 0.02, za), b = dir === 'V' ? P(WT / 2 + 0.02, 0.95, zb) : P(0.95, WT / 2 + 0.02, zb);
      const cols = ['#3a2614', '#b8884e', '#b8884e', '#a0703c', '#a0703c', '#8a6034', '#3a2614']; for (let q = 0; q < (AR === 2 ? 7 : 4); q++) pline(x, a[0], a[1] - q, b[0], b[1] - q, AR === 2 ? cols[q] : ['#3a2614', '#b8884e', '#a0703c', '#3a2614'][q]);
    }
  }
  const r = { c, ox: WOX * AR, oy: (h + 3) * AR }; wallCache[key] = r; return r;
}
const fenceCache = {};
function fenceImg(dir) {
  if (fenceCache[dir]) return fenceCache[dir];
  const c = mkCanvas(36 * AR, 30 * AR), x = c.getContext('2d'), P = L(WOX * AR, 20 * AR);
  const post = (u) => dir === 'V' ? pbox(x, P, -0.06, u - 0.06, 0.12, 0.12, 12, 0, '#8a6a44', '#6e5234', '#5a4228') : pbox(x, P, u - 0.06, -0.06, 0.12, 0.12, 12, 0, '#8a6a44', '#6e5234', '#5a4228');
  const rail = (z) => dir === 'V' ? pbox(x, P, -0.03, 0, 0.06, 1, 1, z, '#a0805a', '#7e6040', '#a0805a', null) : pbox(x, P, 0, -0.03, 1, 0.06, 1, z, '#a0805a', '#a0805a', '#7e6040', null);
  post(0.06); rail(4); rail(9); post(0.94);
  const r = { c, ox: WOX * AR, oy: 20 * AR }; fenceCache[dir] = r; return r;
}

// ---- roofs: one piece per footprint tile, a hip roof over the building rectangle -------------
const ROOF = { telha: ['#b85a3c', '#c46848', '#8a3a28', '#a84a32'], azul: ['#5a6e8a', '#667a96', '#3e4e66', '#4e607a'], cinza: ['#6e7278', '#7a7e84', '#4e5258', '#5e6268'], verde: ['#5a7050', '#667c5a', '#3e5038', '#4e6244'], escura: ['#4a4a52', '#56565e', '#323238', '#3e3e46'] };
const roofCache = {};
function roofH(b, i, j) { const m = Math.min(i - b.x0, b.x1 - i, j - b.y0, b.y1 - j); return Math.min(m, b.ridge) * b.slope; }
function roofImg(b, i, j) {
  const key = b.id + ':' + i + ',' + j; if (roofCache[key]) return roofCache[key];
  const c = mkCanvas(36 * AR, 64 * AR), x = c.getContext('2d'), oy = 50 * AR, P = (a, bb, z) => [WOX * AR + (a - i - (bb - j)) * 16 * AR, oy + (a - i + bb - j) * 8 * AR - z * AR];
  const cols = ROOF[b.roof] || ROOF.telha; // N, W, E, S
  const z = (a, bb) => WALL_H + roofH(b, a, bb);
  const ctr = [i + 0.5, j + 0.5];
  const tris = [[[i, j], [i + 1, j]], [[i + 1, j], [i + 1, j + 1]], [[i + 1, j + 1], [i, j + 1]], [[i, j + 1], [i, j]]];
  for (const [a, bb] of tris) {
    const cx = (a[0] + bb[0] + ctr[0]) / 3, cy = (a[1] + bb[1] + ctr[1]) / 3;
    const terms = [cy - b.y0, cx - b.x0, b.x1 - cx, b.y1 - cy]; // N W E S slopes
    let k = 0; for (let t = 1; t < 4; t++) if (terms[t] < terms[k]) k = t;
    const ridgeFlat = Math.min(...terms) >= b.ridge;
    const base = ridgeFlat ? cols[1] : cols[k];
    const dark = shade(base, 0.85); // worked out once, not per pixel
    const pat = (k === 0 || k === 3) ? (px, py) => (((py - px * 0.5) % 4 + 4) % 4 < 1 ? dark : base) : (px, py) => (((py + px * 0.5) % 4 + 4) % 4 < 1 ? dark : base);
    pfill(x, [P(a[0], a[1], z(a[0], a[1])), P(bb[0], bb[1], z(bb[0], bb[1])), P(ctr[0], ctr[1], z(ctr[0], ctr[1]))], pat);
  }
  const ol = (a1, b1, a2, b2) => { const p = P(a1, b1, z(a1, b1)), q = P(a2, b2, z(a2, b2)); pline(x, p[0], p[1], q[0], q[1], OUTLINE); };
  if (i === b.x0) ol(i, j, i, j + 1); if (i === b.x1 - 1) ol(i + 1, j, i + 1, j + 1);
  if (j === b.y0) ol(i, j, i + 1, j); if (j === b.y1 - 1) ol(i, j + 1, i + 1, j + 1);
  const r = { c, ox: WOX * AR, oy }; roofCache[key] = r; return r;
}

// ---- furniture and props -----------------------------------------------------------------------
const furnCache = {};
const FOX = 32, FOY = 52;
function furnImg(type, v = 0, st = '') {
  const key = type + '|' + v + '|' + st; if (furnCache[key]) return furnCache[key];
  let c = mkCanvas(64 * AR, 72 * AR), x = c.getContext('2d'), P = L(FOX * AR, FOY * AR), ox = FOX * AR, oy = FOY * AR;
  const wood = ['#9a6a3c', '#7c5230', '#64421f'], dk = ['#3a3e48', '#4a4e58', '#2e3038'];
  switch (type) {
    case 'cama': { const bl = ['#3a5a9a', '#9a3a4a', '#4a7a4a', '#7a5a9a'][v % 4]; pbox(x, P, 0.12, 0.1, 0.76, 0.8, 5, 0, bl, '#5a5048', '#463e38'); pbox(x, P, 0.16, 0.12, 0.68, 0.22, 2, 5, '#eef0f2', '#c8ccd2', '#aeb2ba'); faceS(x, P, 0.12, 0.9, 0, 0.76, 1, 4, shade(bl, 0.8)); break; }
    case 'camaHosp': pbox(x, P, 0.12, 0.1, 0.76, 0.8, 7, 0, '#9ac0d8', '#b8bcc2', '#9aa0a8'); pbox(x, P, 0.16, 0.12, 0.68, 0.2, 2, 7, '#f4f6f8', '#d0d4da', '#b8bcc2'); pbox(x, P, 0.12, 0.1, 0.05, 0.8, 4, 7, '#c8ccd2', '#a0a6ae', '#80868e'); break;
    case 'guarda': pbox(x, P, 0.15, 0.25, 0.7, 0.5, 26, 0, ...wood); faceS(x, P, 0.15, 0.75, 0.49, 0.51, 2, 24, '#4a301a'); faceS(x, P, 0.15, 0.75, 0.42, 0.45, 12, 15, '#e0c060'); faceS(x, P, 0.15, 0.75, 0.55, 0.58, 12, 15, '#e0c060'); break;
    case 'armario': for (let k = 0; k < 2; k++) { pbox(x, P, 0.12 + k * 0.38, 0.3, 0.36, 0.42, 26, 0, '#8a96a4', '#6c7886', '#56606c'); faceS(x, P, 0.12 + k * 0.38, 0.72, 0.08, 0.3, 19, 21, '#3e4650'); faceS(x, P, 0.12 + k * 0.38, 0.72, 0.08, 0.3, 15, 17, '#3e4650'); faceS(x, P, 0.12 + k * 0.38, 0.72, 0.26, 0.29, 9, 12, '#d8dce0'); } break;
    case 'comoda': pbox(x, P, 0.15, 0.3, 0.7, 0.45, 11, 0, ...wood); for (const z of [3, 7]) faceS(x, P, 0.15, 0.75, 0.05, 0.65, z, z + 1, '#4a301a'); break;
    case 'balcao': pbox(x, P, 0.05, 0.25, 0.9, 0.55, 10, 0, '#cfd3d8', '#e6e8ea', '#b8bcc2'); faceS(x, P, 0.05, 0.8, 0.45, 0.47, 1, 8, '#9aa0a8'); break;
    case 'pia': pbox(x, P, 0.05, 0.25, 0.9, 0.55, 10, 0, '#cfd3d8', '#e6e8ea', '#b8bcc2'); pbox(x, P, 0.3, 0.35, 0.4, 0.3, 0, 10, '#7a8a98', '#7a8a98', '#7a8a98', null); pbox(x, P, 0.48, 0.3, 0.06, 0.06, 4, 10, '#a0a6ae', '#a0a6ae', '#80868e'); break;
    case 'geladeira': pbox(x, P, 0.2, 0.25, 0.6, 0.55, 28, 0, '#f4f6f8', '#dfe3e8', '#c4c9d0'); faceS(x, P, 0.2, 0.8, 0.02, 0.58, 18, 19, '#9aa0a8'); faceS(x, P, 0.2, 0.8, 0.5, 0.53, 10, 16, '#9aa0a8'); break;
    case 'fogao': pbox(x, P, 0.15, 0.25, 0.7, 0.55, 11, 0, '#e8eaee', '#d0d4da', '#b0b4ba'); for (const [a, bb] of [[0.3, 0.38], [0.6, 0.38], [0.3, 0.65], [0.6, 0.65]]) { const p = P(a, bb, 11); prect(x, p[0] - AR, p[1], 3 * AR, AR, '#22242a'); } faceS(x, P, 0.15, 0.8, 0.1, 0.6, 2, 7, '#4a4e58'); break;
    case 'mesa': pbox(x, P, 0.15, 0.15, 0.7, 0.7, 2, 8, ...wood); for (const [a, bb] of [[0.18, 0.78], [0.78, 0.78], [0.78, 0.18]]) pbox(x, P, a, bb, 0.05, 0.05, 8, 0, ...wood, null); break;
    case 'cadeira': pbox(x, P, 0.3, 0.3, 0.4, 0.4, 2, 5, '#30333c', '#262830', '#1c1e24'); pbox(x, P, 0.3, 0.3, 0.4, 0.07, 10, 5, '#30333c', '#262830', '#1c1e24'); break;
    case 'sofa': { const f = ['#7a4a3a', '#4a5a7a', '#5a6a4a'][v % 3]; pbox(x, P, 0.1, 0.25, 0.8, 0.6, 6, 0, f, shade(f, 0.85), shade(f, 0.7)); pbox(x, P, 0.1, 0.25, 0.8, 0.18, 12, 0, shade(f, 1.1), shade(f, 0.9), shade(f, 0.75)); pbox(x, P, 0.1, 0.25, 0.12, 0.6, 9, 0, shade(f, 1.1), shade(f, 0.9), shade(f, 0.75)); break; }
    case 'tv': pbox(x, P, 0.2, 0.3, 0.6, 0.45, 7, 0, ...wood); pbox(x, P, 0.25, 0.42, 0.5, 0.15, 12, 7, '#22242a', '#1a1c20', '#2a2c32'); faceS(x, P, 0.27, 0.57, 0.04, 0.46, 9, 17, st === 'on' ? '#7ab8e8' : '#30343c'); if (st === 'on') faceS(x, P, 0.27, 0.57, 0.1, 0.25, 11, 15, '#c8e4f8'); break;
    case 'radio': pbox(x, P, 0.25, 0.3, 0.5, 0.45, 8, 0, ...wood); pbox(x, P, 0.32, 0.4, 0.36, 0.2, 6, 8, '#5a3a28', '#4a2e1e', '#3a2416'); faceS(x, P, 0.32, 0.6, 0.06, 0.2, 9, 13, '#c8b890'); { const p = P(0.65, 0.45, 14); pline(x, p[0], p[1], p[0] + 5 * AR, p[1] - 8 * AR, '#b8bcc2'); } if (st === 'on') { const p = P(0.55, 0.6, 12); prect(x, p[0], p[1], 2 * AR, AR, '#e84040'); } break;
    case 'estante': pbox(x, P, 0.1, 0.35, 0.8, 0.35, 26, 0, ...wood); for (let r = 0; r < 4; r++) for (let k = 0; k < 7; k++) { const col = ['#a83a3a', '#3a6aa8', '#d8b040', '#3a8a5a', '#8a4aa8', '#e8e0d0'][(k * 3 + r * 5 + v) % 6]; faceS(x, P, 0.1, 0.7, 0.06 + k * 0.11, 0.14 + k * 0.11, 2 + r * 6, 6 + r * 6 - (k % 2), col); } break;
    case 'escrivaninha': pbox(x, P, 0.1, 0.2, 0.8, 0.55, 9, 0, ...wood); pbox(x, P, 0.3, 0.28, 0.32, 0.12, 8, 9, '#2a2c34', '#3a3e48', '#24262e'); break;
    case 'prateleira': for (let z = 0; z <= 18; z += 6) pbox(x, P, 0.1, 0.25, 0.8, 0.5, 1, z, '#5a5e68', '#5a5e68', '#40444c'); for (const [a, bb] of [[0.1, 0.7], [0.85, 0.7], [0.85, 0.25]]) pbox(x, P, a, bb, 0.05, 0.05, 20, 0, ...dk, null); for (let z = 1; z <= 13; z += 6) pbox(x, P, 0.2 + (z % 4) * 0.1, 0.3, 0.3, 0.35, 4, z, ['#c8a050', '#7a8a5a', '#b04030'][(z + v) % 3], '#9a7a40', '#7a5a30'); break;
    case 'caixote': pbox(x, P, 0.15, 0.15, 0.7, 0.7, 10, 0, '#b88a54', '#9a7040', '#7e5a32'); faceS(x, P, 0.15, 0.85, 0, 0.7, 5, 6, '#6e4a26'); faceE(x, P, 0.85, 0.15, 0, 0.7, 5, 6, '#5a3c1e'); break;
    case 'remedios': pbox(x, P, 0.2, 0.3, 0.6, 0.4, 20, 0, '#f0f2f4', '#dce0e4', '#c0c6cc'); faceS(x, P, 0.2, 0.7, 0.22, 0.38, 10, 15, '#d83838'); faceS(x, P, 0.2, 0.7, 0.27, 0.33, 8, 17, '#d83838'); break;
    case 'bomba': pbox(x, P, 0.3, 0.3, 0.4, 0.4, 22, 0, '#e8e8e0', '#c9302c', '#9a2420'); faceS(x, P, 0.3, 0.7, 0.08, 0.32, 14, 19, '#22242a'); faceS(x, P, 0.3, 0.7, 0.1, 0.3, 15, 18, st === 'on' ? '#7ae87a' : '#3a5a3a'); { const p = P(0.7, 0.55, 12); pline(x, p[0], p[1], p[0] + 4 * AR, p[1] + 6 * AR, '#22242a'); } break;
    case 'arvore': {
      // a broadleaf (3 greens) or, one in four, a pine; a trunk you can see, light from the top left
      c = mkCanvas(64 * AR, 96 * AR); x = c.getContext('2d'); ox = 32 * AR; oy = 84 * AR; const Q = L(32 * AR, 84 * AR);
      const pine = v % 4 === 3;
      pbox(x, Q, 0.44, 0.44, 0.12, 0.12, pine ? 12 : 13, 0, '#6a4428', '#7a5232', '#4a2e1a');
      const blob = (bx, by, r, col) => pdisc(x, Math.round(bx * AR), Math.round(by * AR), Math.round(r * AR), col, 0.85);
      const dots = (n, col, cx0, cy0, rr, r0 = 1.2, seed = 7) => { for (let q = 0; q < n; q++) { const a = hash2(q, v, seed) * Math.PI * 2, d = Math.sqrt(hash2(v, q, seed + 2)) * rr; pdisc(x, Math.round((cx0 + Math.cos(a) * d) * AR), Math.round((cy0 + Math.sin(a) * d * 0.8) * AR), Math.round(r0 * AR), col); } };
      if (pine) {
        const g = ['#24402a', '#2f5434', '#447048'], top = 84 - 50;
        // four stacked tiers, each a little cone: dark right half, light left edge
        for (let t = 0; t < 4; t++) {
          const ty = top + t * 8, hh = 13, w0 = 6 + t * 2.8;
          for (let yy = 0; yy <= hh; yy++) {
            const w = Math.round((yy / hh) * w0 * AR), y2 = (ty + yy) * AR;
            prect(x, 32 * AR - w, y2, w, AR, g[1]); prect(x, 32 * AR, y2, w + 1, AR, g[0]);
            if (w > 2) prect(x, 32 * AR - w, y2, Math.max(AR, Math.round(w * 0.35)), AR, g[2]);
          }
        }
        dots(8, '#5a8858', 29, top + 20, 6, 0.6, 3);
      } else {
        const gr = [['#2f4a24', '#3e5e2c', '#577a38', '#7a9a4c'], ['#3a4a22', '#4e6230', '#6a7e3c', '#8c9c52'], ['#2a4426', '#385a30', '#4e783c', '#6e9650']][v % 3];
        const cy = 84 - 31 - (v % 2) * 2;
        // shadow side (bottom right), body, lit side (top left), then leaf texture
        blob(33, cy + 3, 12, gr[0]); blob(25, cy + 1, 8, gr[0]); blob(40, cy, 8, gr[0]); blob(32, cy - 7, 9, gr[0]);
        blob(31, cy - 1, 10, gr[1]); blob(37, cy - 4, 7, gr[1]); blob(25, cy - 3, 7, gr[1]); blob(30, cy - 9, 6, gr[1]);
        blob(28, cy - 5, 6, gr[2]); blob(34, cy - 9, 4, gr[2]); blob(24, cy - 4, 3.5, gr[2]);
        blob(27, cy - 8, 2.5, gr[3]); blob(32, cy - 11, 1.5, gr[3]);
        dots(22, shade(gr[0], 0.82), 34, cy + 2, 10, 1.2, 7); dots(16, gr[2], 29, cy - 4, 8, 1, 11); dots(8, gr[3], 28, cy - 7, 4, 0.8, 13);
      }
      outlineCanvas(c);
      // a soft round shadow under it, after the outline so it stays soft
      x.globalCompositeOperation = 'destination-over'; x.globalAlpha = 0.22; pdisc(x, Q(0.5, 0.5, 0)[0], Q(0.5, 0.5, 0)[1], (pine ? 7 : 9) * AR, '#000000', 0.5); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
      break;
    }
    case 'toco': pbox(x, P, 0.38, 0.38, 0.24, 0.24, 4, 0, '#c8a070', '#6e4a2c', '#4e321c'); break;
    case 'arbusto': { const p = P(0.5, 0.5, 0); pdisc(x, p[0], p[1] - 5 * AR, 7 * AR, '#3e5a2a', 0.7); pdisc(x, p[0] - 2 * AR, p[1] - 7 * AR, 4 * AR, '#567a36', 0.7); for (let q = 0; q < 14; q++) pdisc(x, p[0] + Math.round((hash2(q, v) - 0.5) * 10 * AR), p[1] - Math.round((4 + hash2(v, q) * 5) * AR), 1, q % 2 ? '#6a8a44' : '#304a22', 1); outlineCanvas(c); break; }
    case 'feno': pbox(x, P, 0.15, 0.2, 0.7, 0.6, 9, 0, '#e0c060', '#c8a848', '#a88a38'); for (let z = 2; z < 9; z += 3) faceS(x, P, 0.15, 0.8, 0.05, 0.65, z, z + 1, '#a88a38'); break;
    case 'cocho': pbox(x, P, 0.08, 0.3, 0.84, 0.4, 5, 0, '#8a6a44', '#6e5234', '#5a4228'); if (st) pbox(x, P, 0.12, 0.34, 0.76, 0.32, 0, 5, st === 'agua' ? '#5aa0d8' : st === 'ambos' ? '#9ab070' : '#d8c060', '#000', '#000', null); break;
    case 'gerador': pbox(x, P, 0.2, 0.25, 0.6, 0.5, 11, 0, '#e8c040', '#c8a030', '#a88020'); faceS(x, P, 0.2, 0.75, 0.1, 0.45, 3, 8, '#3a3c42'); pbox(x, P, 0.62, 0.3, 0.08, 0.08, 5, 11, '#4a4c52', '#3a3c42', '#2a2c30'); if (st === 'on') { const p = P(0.5, 0.75, 6); prect(x, p[0], p[1], 2 * AR, AR, '#7ae87a'); } break;
    case 'fogueira': { for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2, p = P(0.5 + Math.cos(a) * 0.3, 0.5 + Math.sin(a) * 0.3, 0); prect(x, p[0] - AR, p[1] - 2 * AR, 3 * AR, 2 * AR, '#8a8e94'); } pbox(x, P, 0.3, 0.45, 0.4, 0.1, 2, 0, '#7a5230', '#5a3a20', '#4a2e18'); pbox(x, P, 0.45, 0.3, 0.1, 0.4, 2, 1, '#7a5230', '#5a3a20', '#4a2e18'); break; }
    case 'banco': pbox(x, P, 0.1, 0.35, 0.8, 0.3, 2, 5, '#9a6a3c', '#7c5230', '#64421f'); pbox(x, P, 0.1, 0.35, 0.8, 0.06, 7, 7, '#9a6a3c', '#7c5230', '#64421f'); for (const a of [0.12, 0.82]) pbox(x, P, a, 0.55, 0.06, 0.06, 5, 0, '#3a3e48', '#3a3e48', '#2a2c32', null); break;
    case 'lixeira': pbox(x, P, 0.3, 0.3, 0.4, 0.4, 12, 0, '#3a5a3a', '#2e4a2e', '#243a24'); break;
    case 'poste': { const p = P(0.5, 0.5, 0), A2 = AR; prect(x, p[0], p[1] - 40 * A2, A2, 40 * A2, '#2a2c32'); prect(x, p[0] + A2, p[1] - 40 * A2, 1, 40 * A2, '#4a4c54'); prect(x, p[0] - 4 * A2, p[1] - 41 * A2, 8 * A2, 2 * A2, '#2a2c32'); prect(x, p[0] + 3 * A2, p[1] - 39 * A2, 2 * A2, A2, st === 'on' ? '#fff0a0' : '#8a8a80'); break; }
    case 'placa': { const p = P(0.5, 0.5, 0), A2 = AR; prect(x, p[0], p[1] - 40 * A2, 2 * A2, 40 * A2, '#3a3c42'); prect(x, p[0] - 10 * A2, p[1] - 50 * A2, 22 * A2, 12 * A2, '#c9302c'); prect(x, p[0] - 9 * A2, p[1] - 49 * A2, 20 * A2, 10 * A2, '#e8e8e0'); prect(x, p[0] - 7 * A2, p[1] - 47 * A2, 16 * A2, 2 * A2, '#c9302c'); prect(x, p[0] - 7 * A2, p[1] - 43 * A2, 10 * A2, 2 * A2, '#3a3c42'); break; }
    case 'galinheiro': pbox(x, P, 0.1, 0.15, 0.8, 0.7, 12, 0, '#b88a54', '#9a7040', '#7e5a32'); pbox(x, P, 0.05, 0.1, 0.9, 0.8, 2, 12, '#8a3a28', '#6e2e20', '#5a2418'); faceS(x, P, 0.1, 0.85, 0.35, 0.6, 0, 7, '#2a1e14'); break;
  }
  const r = { c, ox, oy }; furnCache[key] = r; return r;
}
// a vehicle along i (dir 'I', 2 tiles long) or along j ('J'); drawn from its first tile
const carCache = {};
function carImg(dir, col, kind = 'carro') {
  const key = dir + col + kind; if (carCache[key]) return carCache[key];
  const big = kind === 'caminhao';
  const c = mkCanvas((big ? 160 : 96) * AR, (big ? 120 : 80) * AR), x = c.getContext('2d'), ox = (big ? 80 : 48) * AR, oy = (big ? 56 : 40) * AR, P = L(ox, oy);
  const w = dir === 'I' ? (big ? 4 : 2) : (big ? 2 : 1), d = dir === 'I' ? (big ? 2 : 1) : (big ? 4 : 2);
  const i0 = 0.12, j0 = 0.12, ww = w - 0.24, dd = d - 0.24, dark = shade(col, 0.75), dark2 = shade(col, 0.6);
  pbox(x, P, i0, j0, ww, dd, 4, 1, '#1e2026', '#16181c', '#16181c');
  if (!big) {
    pbox(x, P, i0, j0, ww, dd, 8, 4, col, dark, dark2);
    if (dir === 'I') { pbox(x, P, i0 + 0.45, j0 + 0.08, ww - 0.95, dd - 0.16, 6, 12, shade(col, 1.08), '#7aa0c0', '#5a80a0'); }
    else { pbox(x, P, i0 + 0.08, j0 + 0.45, ww - 0.16, dd - 0.95, 6, 12, shade(col, 1.08), '#7aa0c0', '#5a80a0'); }
  } else {
    pbox(x, P, i0, j0, ww, dd, 14, 5, '#c9302c', '#b02824', '#8e1f1c');
    const cab = dir === 'I' ? [i0 + ww - 1.2, j0, 1.2, dd] : [i0, j0 + dd - 1.2, ww, 1.2];
    pbox(x, P, cab[0], cab[1], cab[2], cab[3], 19, 5, '#c9302c', '#b02824', '#8e1f1c');
    if (dir === 'I') { faceE(x, P, i0 + ww, j0, 0.2, dd - 0.2, 14, 21, '#6e90b0'); pbox(x, P, cab[0] + 0.2, j0 + 0.3, 0.3, dd - 0.6, 2, 24, '#e8d050', '#3a70e8', '#e83a3a'); pbox(x, P, i0 + 0.2, j0 + 0.25, ww - 1.6, dd - 0.5, 2, 19, '#b8bcc2', '#9aa0a8', '#80868e'); }
    else { faceS(x, P, i0, j0 + dd, 0.2, ww - 0.2, 14, 21, '#6e90b0'); pbox(x, P, i0 + 0.3, cab[1] + 0.2, ww - 0.6, 0.3, 2, 24, '#e8d050', '#3a70e8', '#e83a3a'); pbox(x, P, i0 + 0.25, j0 + 0.2, ww - 0.5, dd - 1.6, 2, 19, '#b8bcc2', '#9aa0a8', '#80868e'); }
    const s = dir === 'I' ? (k) => faceS(x, P, i0, j0 + dd, 0.3 + k * 0.9, 1.0 + k * 0.9, 8, 16, '#9a2420') : (k) => faceE(x, P, i0 + ww, j0, 0.3 + k * 0.9, 1.0 + k * 0.9, 8, 16, '#9a2420');
    for (let k = 0; k < 3; k++) s(k);
  }
  const wheels = dir === 'I' ? [[i0 + 0.35, j0 + dd], [i0 + ww - 0.35, j0 + dd], [i0 + ww, j0 + 0.3]] : [[i0 + ww, j0 + 0.35], [i0 + ww, j0 + dd - 0.35], [i0 + 0.3, j0 + dd]];
  for (const [a, bb] of wheels) { const p = P(a, bb, 3); pdisc(x, p[0], p[1], (big ? 4 : 3) * AR, '#16181c'); pdisc(x, p[0], p[1], AR, '#80868e'); pdisc(x, p[0], p[1], 0, '#c8ccd2'); }
  const r = { c, ox, oy }; carCache[key] = r; return r;
}

// ---- people: built from parts so every pose and outfit is drawn, never a recolour ------------
// o: {skin, hair, hairStyle, eyes, top, topLong, pants, under, shoes, hat, gloves, jacket,
//     back, pose, f, weapon, zombie, fat, runner, blood}
const humanCache = {};
function humanImg(o) {
  const key = JSON.stringify(o); if (humanCache[key]) return humanCache[key];
  const w = 20, h = 28, c = mkCanvas(w, h), x = c.getContext('2d');
  const R = (a, b, ww, hh, col) => { if (col) prect(x, a + 2, b + 2, ww, hh, col); };
  const pose = o.pose || 'idle', f = o.f || 0;
  let dy = 0; // whole body offset
  if (pose === 'crouch' || pose === 'search') dy = 3;
  if (pose === 'sit') dy = 7;
  const fat = o.fat ? 1 : 0;
  const tx0 = 5 - fat, tw = 6 + fat * 2;
  const top = o.jacket || o.top, skin = o.skin;
  const armCol = (o.jacket) ? o.jacket : (o.top && o.topLong ? o.top : null);
  const lean = o.runner ? 1 : 0;
  // legs
  const legY = 16 + dy, legH = pose === 'crouch' || pose === 'search' ? 3 : 5;
  if (pose === 'sit') {
    R(2, 21, 14, 2, o.pants || skin); R(2, 23, 3, 1, o.shoes || skin); R(13, 23, 3, 1, o.shoes || skin);
  } else {
    let la = 0, ra = 0; // leg lifts for walking
    const walking = pose === 'walk' || pose === 'run';
    if (walking) { if (f === 1) la = 1; if (f === 3) ra = 1; }
    const stride = (pose === 'run' || o.runner) && walking ? 1 : 0;
    const lx = tx0 - (stride && f === 1 ? 1 : 0), rx = tx0 + tw - 3 + (stride && f === 3 ? 1 : 0);
    const legW = 3;
    R(lx, legY, legW, legH - la, o.pants || skin); R(rx, legY, legW, legH - ra, o.pants || skin);
    if (o.pants) { R(lx + legW - 1, legY, 1, legH - la, shade(o.pants, 0.8)); R(rx + legW - 1, legY, 1, legH - ra, shade(o.pants, 0.8)); }
    R(lx, legY + legH - la, legW, 1, o.shoes || shade(skin, 0.85)); R(rx, legY + legH - ra, legW, 1, o.shoes || shade(skin, 0.85));
    if (o.shoes) { R(lx, legY + legH - la - 1, legW, 1, o.shoes); R(rx, legY + legH - ra - 1, legW, 1, o.shoes); }
  }
  // hips
  R(tx0, 14 + dy, tw, 2, o.pants || o.under || skin);
  if (!o.pants && o.under) R(tx0 + tw - 1, 14 + dy, 1, 2, shade(o.under, 0.8));
  // torso
  R(tx0, 8 + dy, tw, 6, top || skin);
  if (!top) { R(tx0 + 1, 9 + dy, 1, 1, shade(skin, 0.88)); R(tx0 + tw - 2, 9 + dy, 1, 1, shade(skin, 0.88)); }
  if (top) R(tx0 + tw - 1, 8 + dy, 1, 6, shade(top, 0.8));
  if (o.jacket && !o.back) R(tx0 + Math.floor(tw / 2), 8 + dy, 1, 6, shade(o.jacket, 0.7));
  if (o.bag && o.back) { R(tx0 + 1, 8 + dy, tw - 2, 6, '#5a4a2a'); R(tx0 + 2, 9 + dy, tw - 4, 1, '#3e321c'); }
  if (fat && !o.back) R(tx0 + 2, 12 + dy, tw - 4, 2, top ? shade(top, 0.9) : shade(skin, 0.9));
  if (o.blood) { R(tx0 + 1, 10 + dy, 2, 1, '#8c1f24'); R(tx0 + tw - 3, 12 + dy, 1, 2, '#6e1418'); }
  if (o.zombie && top && !o.back) { R(tx0 + 2, 13 + dy, 1, 1, skin); R(tx0 + tw - 3, 9 + dy, 1, 1, skin); }
  // arms
  const armL = (ax, ay, len, col) => { R(ax, ay, 2, len, col || skin); if (col) R(ax, ay + len - 2, 2, 2, o.gloves || skin); else if (o.gloves) R(ax, ay + len - 2, 2, 2, o.gloves); };
  const aCol = armCol || null;
  const sleeve = (ax, ay) => { if (top && !armCol) R(ax, ay, 2, 2, top); };
  const lax = tx0 - 2, rax = tx0 + tw;
  let book = null, weaponAt = null;
  if (o.zombie && !o.back && pose !== 'dead') { // arms reaching forward
    R(lax + 1, 9 + dy, 2, 3, aCol || skin); R(rax - 1, 9 + dy, 2, 3, aCol || skin); R(lax + 1, 11 + dy, 2, 1, skin); R(rax - 1, 11 + dy, 2, 1, skin);
    if (pose === 'attack') { R(lax + 1, 7 + dy, 2, 2, skin); R(rax - 1, 7 + dy, 2, 2, skin); }
  } else if (pose === 'read') {
    armL(lax, 8 + dy, 3, aCol); armL(rax, 8 + dy, 3, aCol); sleeve(lax, 8 + dy); sleeve(rax, 8 + dy);
    if (!o.back) { R(tx0, 11 + dy, 2, 2, skin); R(tx0 + tw - 2, 11 + dy, 2, 2, skin); book = [tx0 + 1, 10 + dy]; }
  } else if (pose === 'bandage') {
    R(tx0 - 1, 11 + dy, tw + 1, 2, aCol || skin); // left arm held across
    const band = Math.min(tw, 2 + f * 2); R(tx0 + tw - band, 11 + dy, band, 2, '#f4f6f8'); R(tx0 + tw - band, 12 + dy, band, 1, '#c8ccd2');
    const hp = [[tx0 + 1, 9], [tx0 + 3, 10], [tx0 + 4, 13], [tx0 + 2, 13]][f % 4];
    armL(rax, 8 + dy, 3, aCol); sleeve(rax, 8 + dy); R(hp[0], hp[1] + dy, 2, 2, o.gloves || skin);
  } else if (pose === 'attack' || pose === 'chop' || pose === 'hammer') {
    armL(lax, 8 + dy, 6, aCol); sleeve(lax, 8 + dy);
    const fr = f % 3;
    if (fr === 0) { R(rax, 3 + dy, 2, 6, aCol || skin); R(rax, 3 + dy, 2, 2, o.gloves || skin); weaponAt = [rax, 3 + dy, 'up']; }
    else if (fr === 1) { R(rax, 8 + dy, 4, 2, aCol || skin); R(rax + 3, 8 + dy, 2, 2, o.gloves || skin); weaponAt = [rax + 4, 8 + dy, 'fwd']; }
    else { armL(rax, 8 + dy, 6, aCol); sleeve(rax, 8 + dy); weaponAt = [rax, 13 + dy, 'down']; }
  } else if (pose === 'search') {
    const bob = f % 2;
    R(lax + 1, 9 + dy + bob, 2, 5, aCol || skin); R(rax - 1, 9 + dy + (1 - bob), 2, 5, aCol || skin); R(lax + 1, 13 + dy + bob, 2, 1, o.gloves || skin); R(rax - 1, 13 + dy + (1 - bob), 2, 1, o.gloves || skin);
  } else if (pose === 'sit') {
    armL(lax, 8 + dy, 5, aCol); armL(rax, 8 + dy, 5, aCol); sleeve(lax, 8 + dy); sleeve(rax, 8 + dy);
  } else {
    let ls = 0, rs = 0; if (pose === 'walk' || pose === 'run') { if (f === 1) { ls = 1; rs = -1; } if (f === 3) { ls = -1; rs = 1; } }
    armL(lax, 8 + dy + ls, 6, aCol); armL(rax, 8 + dy + rs, 6, aCol); sleeve(lax, 8 + dy + ls); sleeve(rax, 8 + dy + rs);
    if (o.weapon && !o.back) weaponAt = [rax, 13 + dy + rs, 'hold'];
  }
  // neck and head
  const hx = 5 + lean, hy = 1 + dy + (pose === 'read' ? 1 : 0) + (o.zombie && f % 2 ? 1 : 0) * 0;
  R(hx + 2, 7 + dy, 2, 1, shade(skin, 0.88));
  R(hx, hy, 6, 6, skin);
  const hair = o.hair;
  if (o.back) { if (hair) { R(hx, hy, 6, 5, hair); R(hx, hy + 5, 6, 1, shade(hair, 0.85)); } }
  else {
    if (hair) { R(hx, hy, 6, 2, hair); R(hx, hy + 2, 1, o.hairStyle === 'long' ? 5 : 2, hair); R(hx + 5, hy + 2, 1, o.hairStyle === 'long' ? 5 : 2, hair); }
    if (o.zombie && !hair) { R(hx + 1, hy, 2, 1, '#3a3a30'); R(hx + 4, hy, 1, 1, '#3a3a30'); }
    const ey = hy + 3; const ec = o.eyes || '#1a1a22';
    R(hx + 1, ey, 1, 1, ec); R(hx + 4, ey, 1, 1, ec);
    if (o.zombie) { R(hx + 2, ey + 2, 2, 1, '#5e1418'); }
  }
  if (o.hat) { R(hx - 1, hy - 1, 8, 2, o.hat); R(hx, hy - 2, 6, 1, o.hat); if (o.hat === '#e8c040') R(hx + 2, hy - 1, 2, 1, '#c8a030'); }
  if (book) { R(book[0], book[1], tw - 2, 3, '#a83a3a'); R(book[0] + 1, book[1], tw - 4, 1, '#f0ead8'); R(book[0] + Math.floor((tw - 2) / 2), book[1], 1, 3, '#5e1418'); }
  if (weaponAt && o.weapon) drawWeaponOn(x, weaponAt[0] + 2, weaponAt[1] + 2, weaponAt[2], o.weapon);
  const r = { c: finishSprite(c), ox: 10 * AR, oy: 26 * AR }; humanCache[key] = r; return r;
}
function drawWeaponOn(x, hx, hy, how, wpn) {
  const col = { cano: '#a7adb5', taco: '#b8875a', faca: '#c8ccd2', machado: '#8a6038', martelo: '#8a6038', lanca: '#9a7048', pistola: '#2a2c32', punho: null }[wpn];
  if (!col) return;
  const len = { cano: 9, taco: 9, faca: 4, machado: 9, martelo: 6, lanca: 13, pistola: 3 }[wpn];
  let dx = 0, dy = 0;
  if (how === 'up') { dx = 1; dy = -1; } else if (how === 'fwd') { dx = 1; dy = 0; } else if (how === 'down') { dx = 1; dy = 1; } else { dx = 0.4; dy = 1; }
  const ex = hx + dx * len, ey = hy + dy * len;
  pline(x, hx, hy, ex, ey, OUTLINE); pline(x, hx + (dy ? 1 : 0), hy + (dy ? 0 : -1), ex + (dy ? 1 : 0), ey + (dy ? 0 : -1), col);
  if (wpn === 'machado') { prect(x, ex - 2, ey - 2, 4, 3, '#c8ccd2'); prect(x, ex - 2, ey - 2, 4, 1, '#e8ecf0'); }
  if (wpn === 'martelo') prect(x, ex - 2, ey - 1, 4, 2, '#6a7078');
  if (wpn === 'pistola') prect(x, hx, hy - 1, 4, 2, '#2a2c32');
}
// a figure lying down: the standing figure turned a quarter
const lyingCache = {};
function lyingImg(o) {
  const key = JSON.stringify(o); if (lyingCache[key]) return lyingCache[key];
  const s = humanImg(Object.assign({}, o, { pose: 'idle', f: 0 })).c, c = mkCanvas(28 * AR, 20 * AR), x = c.getContext('2d');
  x.save(); x.translate(26 * AR, 0); x.rotate(Math.PI / 2); x.drawImage(s, 0, 4 * AR); x.restore();
  const r = { c, ox: 14 * AR, oy: 16 * AR }; lyingCache[key] = r; return r;
}
// the crawler: dragging itself on its belly, its own silhouette
const crawlCache = {};
function crawlerImg(o, f) {
  const key = JSON.stringify(o) + f; if (crawlCache[key]) return crawlCache[key];
  const c = mkCanvas(30, 16), x = c.getContext('2d'), R = (a, b, w, h, col) => prect(x, a + 2, b + 2, w, h, col);
  const sk = o.skin, top = o.top || sk;
  R(14, 6, 10, 4, top); R(22, 7, 4, 3, o.pants || sk); R(24, 9, 2, 1, shade(sk, 0.8));
  R(16, 9, 6, 1, shade(top, 0.8)); R(15, 7, 2, 1, '#8c1f24');
  R(8, 3 + (f % 2), 6, 6, sk); R(9, 3 + (f % 2), 4, 1, '#3a3a30'); R(9, 5 + (f % 2), 1, 1, o.eyes); R(12, 5 + (f % 2), 1, 1, o.eyes); R(10, 7 + (f % 2), 2, 1, '#5e1418');
  const reach = f % 2 ? 0 : 2; R(2 + reach, 8, 6, 2, sk); R(4 - reach, 10, 6, 2, sk);
  const r = { c: finishSprite(c), ox: 16 * AR, oy: 13 * AR }; crawlCache[key] = r; return r;
}
// farm animals
const animCache = {};
function chickenImg(f, dead) {
  const key = 'g' + f + dead; if (animCache[key]) return animCache[key];
  const c = mkCanvas(14, 14), x = c.getContext('2d'), R = (a, b, w, h, col) => prect(x, a + 2, b + 2, w, h, col);
  if (dead) { R(1, 6, 8, 3, '#e8e8e0'); R(0, 6, 2, 1, '#d83838'); R(3, 9, 1, 1, '#e8a830'); }
  else { const py = f % 2; R(2, 3, 7, 5, '#f0f0e8'); R(7, 4, 2, 3, '#d8d8d0'); R(1 - 0, 1 + py, 3, 3, '#f0f0e8'); R(1, 0 + py, 2, 1, '#d83838'); R(0, 2 + py, 1, 1, '#e8a830'); R(2, 2 + py, 1, 1, '#1a1a22'); R(4, 8, 1, 2, '#e8a830'); R(6, 8, 1, 2, '#e8a830'); }
  const r = { c: finishSprite(c), ox: 7 * AR, oy: 12 * AR }; animCache[key] = r; return r;
}
function cowImg(f, dead) {
  const key = 'v' + f + dead; if (animCache[key]) return animCache[key];
  const c = mkCanvas(28, 22), x = c.getContext('2d'), R = (a, b, w, h, col) => prect(x, a + 2, b + 2, w, h, col);
  if (dead) { R(2, 10, 20, 6, '#f0ece4'); R(6, 11, 5, 3, '#2a2a2e'); R(14, 12, 4, 3, '#2a2a2e'); R(0, 11, 4, 4, '#f0ece4'); R(4, 16, 14, 1, '#4a4a4e'); }
  else {
    R(5, 6, 16, 8, '#f0ece4'); R(8, 7, 5, 4, '#2a2a2e'); R(15, 9, 4, 4, '#2a2a2e'); R(18, 6, 3, 2, '#2a2a2e');
    const hb = f % 2; R(0, 4 + hb, 6, 6, '#f0ece4'); R(0, 8 + hb, 4, 2, '#e0a8a0'); R(1, 6 + hb, 1, 1, '#1a1a22'); R(0, 3 + hb, 2, 1, '#d8d0c0'); R(5, 3 + hb, 2, 1, '#d8d0c0');
    const lg = (lx, up) => R(lx, 14, 2, 5 - up, '#e8e4dc');
    lg(6, f === 1 ? 1 : 0); lg(9, f === 3 ? 1 : 0); lg(16, f === 3 ? 1 : 0); lg(19, f === 1 ? 1 : 0);
    R(20, 7, 2, 1, '#2a2a2e'); R(21, 8, 1, 4, '#d8d0c0'); R(12, 13, 3, 2, '#e0a8a0');
  }
  const r = { c: finishSprite(c), ox: 14 * AR, oy: 20 * AR }; animCache[key] = r; return r;
}

// ---- item icons (10x10 pixel maps) ------------------------------------------------------------
const IPAL = { k: '#2a2c32', m: '#6f757e', M: '#a7adb5', F: '#e87a2a', f: '#f2c24a', L: '#5aa0d8', Z: '#d9e4ec', z: '#9fb2c0', T: '#3f7f8c', t: '#2c5b66', J: '#3b4f86', j: '#2a3860', B: '#6b4428', b: '#4a2e1a', O: '#6d7a3a', o: '#4b5528', n: '#8a6038', N: '#b7874f', U: '#f0f2f4', v: '#9aa1aa', Q: '#c9302c', q: '#8a1f1c', W: '#eef0f2', w: '#b9bec8', Y: '#e0c040', y: '#a88a28', R: '#a83a3a', G: '#5a8a4a', g: '#3a6a3a', P: '#e0a8a0', C: '#c8a070', c: '#8a6a44', H: '#e8d8a0', E: '#5a4a2a', e: '#3e321c', S: '#7a3a6a', s: '#d8b040', X: '#3a3a42', D: '#8ab8d8', K: '#e8e0d0', V: '#c84a8a', A: '#7ab070' };
const ICONS = {
  cueca: ['..........', '..........', '..........', '.WWWWWWWW.', '.WwWWWWwW.', '.WWWWWWWW.', '..WWW.WW..', '..WW...W..', '..........', '..........'],
  camiseta: ['.TT....TT.', 'TTTT..TTTT', 'TTTTTTTTTT', '.tTTTTTTt.', '..TTTTTT..', '..TTTTTT..', '..TTTTTT..', '..tttttt..'],
  camisa: ['.KK....KK.', 'KKKKVVKKKK', 'KKKKVVKKKK', '.zKKKKKKz.', '..KKKKKK..', '..KKKKKK..', '..KKKKKK..', '..zzzzzz..'],
  moletom: ['.SSS..SSS.', 'SSSSSSSSSS', 'SS.SSSS.SS', 'SS.SSSS.SS', 'SS.SSSS.SS', 'SS.SSSS.SS', 'Ss.ssss.sS'],
  jaqueta: ['.OOO..OOO.', 'OOOOooOOOO', 'OO.OooO.OO', 'OO.OooO.OO', 'OO.OooO.OO', 'OO.OooO.OO', 'Oo.oooo.oO'],
  jaquetaBomb: ['.XXX..XXX.', 'XXXXYYXXXX', 'XX.XYYX.XX', 'YY.YYYY.YY', 'XX.XYYX.XX', 'XX.XYYX.XX', 'Xk.kkkk.kX'],
  jeans: ['JJJJJJ', 'JJJJJJ', 'JJjjJJ', 'JJ..JJ', 'JJ..JJ', 'JJ..JJ', 'Jj..Jj', 'jj..jj'],
  calcaMol: ['SSSSSS', 'SSSSSS', 'SSssSS', 'SS..SS', 'SS..SS', 'SS..SS', 'Ss..Ss', 'ss..ss'],
  calcaBomb: ['XXXXXX', 'XXXXXX', 'XXkkXX', 'XX..XX', 'YY..YY', 'XX..XX', 'Xk..Xk', 'kk..kk'],
  tenis: ['.......', 'WW.....', 'WWW....', 'WWWWWW.', 'WWWWWWW', 'kkkkkkk'],
  botas: ['BBB....', 'BBB....', 'BbB....', 'BBBBBB.', 'BBBBBBB', 'bbbbbbb'],
  gorro: ['...QQ...', '..QQQQ..', '.QQQQQQ.', 'QQQQQQQQ', 'qqqqqqqq', 'QQQQQQQQ'],
  capacete: ['...YY...', '.YYYYYY.', 'YYYYYYYY', 'YfYYYYfY', 'YYYYYYYYY'],
  luvas: ['.n.n.n..', '.nnnnn..', '.nnnnnnn', '.nnnnnn.', '.nnnnn..', '.NNNNN..'],
  mochila: ['..EEEE..', '.EeeeeE.', 'EEEEEEEE', 'EEeeeeEE', 'EEEEEEEE', 'EEEEEEEE', '.eeeeee.'],
  feijao: ['.mmmmmm.', 'mMMMMMMm', 'FFFFFFFF', 'FffFFffF', 'FFFFFFFF', 'mMMMMMMm', 'mMMMMMMm', '.mmmmmm.'],
  sopa: ['.mmmmmm.', 'mMMMMMMm', 'QQQQQQQQ', 'QWWQQWWQ', 'QQQQQQQQ', 'mMMMMMMm', 'mMMMMMMm', '.mmmmmm.'],
  salgadinho: ['.YYYYYY.', 'YQQQQQQY', 'YQffffQY', 'YQffffQY', 'YQQQQQQY', 'YYYYYYYY', '.yyyyyy.'],
  pao: ['..CCCC..', '.CHHHHC.', 'CHHHHHHC', 'CHHHHHHC', 'cCCCCCCc'],
  maca: ['....g...', '...g....', '.RRRRRR.', 'RRWRRRRR', 'RRRRRRRR', 'RRRRRRRR', '.RRRRRR.', '..RRRR..'],
  carne: ['..PPPP..', '.PQQQQP.', 'PQQWQQQP', 'PQQQQQQP', '.PQQQQP.', '..PPPP..'],
  bife: ['..cccc..', '.cBBBBc.', 'cBBnBBBc', 'cBBBBBBc', '.cBBBBc.', '..cccc..'],
  ovo: ['..WW..', '.WWWW.', 'WWWWWW', 'WWWWWW', '.wwww.'],
  ovoFrito: ['.WWWWWW.', 'WWWWWWWW', 'WWWffWWW', 'WWWffWWW', 'WWWWWWWW', '.WWWWWW.'],
  leite: ['..WW..', '..ww..', '.WWWW.', 'WLLLLW', 'WWWWWW', 'WWWWWW', 'WWWWWW', '.wwww.'],
  agua: ['..LL..', '..ZZ..', '.ZZZZ.', 'ZLLLLz', 'ZLLLLz', 'ZLLLLz', 'ZLLLLz', '.zzzz.'],
  garrafa: ['..LL..', '..ZZ..', '.ZZZZ.', 'Z....z', 'Z....z', 'Z....z', 'Z....z', '.zzzz.'],
  refri: ['.QQQQ.', 'QQQQQQ', 'QWWWWQ', 'QQQQQQ', 'QQQQQQ', 'QWWWWQ', '.QQQQ.'],
  racao: ['.HHHHHH.', 'HyyyyyyH', 'HyHHHHyH', 'HyHGGHyH', 'HyHHHHyH', 'HHHHHHHH'],
  cano: ['........MM', '.......MMm', '......MMm.', '.....MMm..', '....MMm...', '...MMm....', '..MMm.....', '.MMm......', 'MMm.......', 'mm........'],
  taco: ['.......NN', '......NNn', '.....NNn.', '....NNn..', '...NNn...', '..NNn....', '.NNn.....', 'kk.......'],
  faca: ['.......M', '......MM', '.....MMm', '....MMm.', '...kk...', '..kk....', '.kk.....'],
  machado: ['......MMM.', '.....MMMMm', '......MnMm', '.....nnmm.', '....nn....', '...nn.....', '..nn......', '.nn.......', 'nn........'],
  martelo: ['....MMMM', '....MMMM', '.....nn.', '....nn..', '...nn...', '..nn....', '.nn.....', 'nn......'],
  serrote: ['.MMMMMMMn', 'MMMMMMMMn', 'MvMvMvMnn', '.......nn'],
  lanca: ['........MM', '.......MMM', '......nn..', '.....nn...', '....nn....', '...nn.....', '..nn......', '.nn.......', 'nn........'],
  pistola: ['kkkkkkkk.', 'kMMMMMMMk', 'kkkkkkk..', '..kkk....', '.kkk.....', '.kk......'],
  municao: ['.Y.Y.Y.', 'YfYfYfY', 'YYYYYYY', 'yyyyyyy', 'yyyyyyy'],
  pregos: ['MMM.MMM.', '.M...M..', '.M...M..', '.m...m..', '.....MMM', '......M.', '......m.'],
  tabua: ['....NNNNNN', '..NNNNNNNn', 'NNNNNNNnn.', 'nnnnnnn...'],
  tora: ['..BBBBBBC.', '.BBBBBBCCC', 'BBBBBBBCcC', 'bbbbbbbCCC', '.bbbbbbbC.'],
  trapo: ['.KKK.KK.', 'KKKKKKKK', 'KzKKKzKK', '.KKKKKK.', 'KK.KKzK.'],
  bandagem: ['..WWWW..', '.WWwwWW.', 'WWw..wWW', 'WWw..wWW', '.WWwwWW.', '..WWWW..'],
  desinfetante: ['..mm..', '..LL..', '.LLLL.', 'LWWWWL', 'LWQWWL', 'LWWWWL', '.LLLL.'],
  analgesico: ['.WWWW.', 'WQQQQW', 'WWWWWW', 'W.WW.W', 'WWWWWW', '.WWWW.'],
  isqueiro: ['..ff..', '..F...', '.mmmm.', '.QQQQ.', '.QQQQ.', '.QQQQ.', '.qqqq.'],
  lanterna: ['....ff', '..YYff', 'kkkYYf', 'kkkYY.', 'kk....'],
  galao: ['.QQ....', 'QQQQQQ.', 'QQQQQQQ', 'QQWWQQQ', 'QQQQQQQ', 'QQQQQQQ', 'qqqqqqq'],
  galaoCheio: ['.QQ..f.', 'QQQQQQf', 'QQQQQQQ', 'QQffQQQ', 'QQffQQQ', 'QQQQQQQ', 'qqqqqqq'],
  gerador: ['YYYYYYYY', 'YkkkkkkY', 'YkMMMMkY', 'YkkkkkkY', 'YYYYYYYY', 'yyyyyyyy', 'k.....k.'],
  livro: ['.RRRRRR.', 'RKKKKKKR', 'RRRRRRRR', 'RRsRRRRR', 'RRRRRRRR', 'RRRRRRRR', '.qqqqqq.'],
  pecas: ['..mm.MM.', '.mMMmMMm', 'mMkkMMkM', 'mMkkMMkM', '.mMMmMMm', '..mm.MM.', '...QQ...'],
  panela: ['..mmmm..', 'mmMMMMmm', '.MMMMMM.', '.MMMMMM.', '.mmmmmm.'],
  fosforo: ['.QQQQQ.', '.WWWWW.', '.WkkkW.', '.WWWWW.', '.QQQQQ.'],
};
const iconCache = {};
function iconImg(name, tint) {
  const key = name + (tint || ''); if (iconCache[key]) return iconCache[key];
  const rows = ICONS[name] || ICONS.caixa || ['KK', 'KK'], w = Math.max(...rows.map(r => r.length)), h = rows.length;
  const c = mkCanvas(w + 2, h + 2), x = c.getContext('2d');
  rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch !== '.') { prect(x, i + 1, j + 1, 1, 1, (tint && ch === 'R') ? tint : (tint && ch === 'q') ? shade(tint, 0.6) : IPAL[ch] || '#f0f'); } }));
  outlineCanvas(c); iconCache[key] = c; return c;
}
// the same icon for the world (items lying on the ground), at the world's resolution
const icon2Cache = {};
function iconImg2(name, tint) { const key = name + (tint || ''); if (icon2Cache[key]) return icon2Cache[key]; const rows = ICONS[name] || ['KK', 'KK'], w = Math.max(...rows.map(r => r.length)), h = rows.length, c = mkCanvas(w, h), x = c.getContext('2d'); rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch !== '.') prect(x, i, j, 1, 1, (tint && ch === 'R') ? tint : (tint && ch === 'q') ? shade(tint, 0.6) : IPAL[ch] || '#f0f'); })); const out = finishSprite(c); icon2Cache[key] = out; return out; }

// ---- moodle badges --------------------------------------------------------------------------------
const MOODLE_ICON = {
  frio: { c: '#9fd3f0', b: ['...#...', '.#.#.#.', '..###..', '#######', '..###..', '.#.#.#.', '...#...'] },
  hipotermia: { c: '#d0ecff', b: ['#.#.#.#', '.#####.', '##.#.##', '.#####.', '##.#.##', '.#####.', '#.#.#.#'] },
  fome: { c: '#e89a4a', b: ['.#####.', '#######', '#.....#', '#######', '#######', '#######', '.#####.'] },
  sede: { c: '#5aa0e8', b: ['...#...', '..###..', '.#####.', '##.####', '##.####', '.#####.', '..###..'] },
  cansado: { c: '#b8a0e0', b: ['#####..', '...#...', '..#....', '#####..', '....###', '.....#.', '....###'] },
  sangrando: { c: '#e04848', b: ['...#...', '..###..', '..###..', '.#####.', '.#####.', '.#####.', '..###..'] },
  dor: { c: '#f08080', b: ['#.....#', '.#...#.', '..#.#..', '...#...', '..#.#..', '.#...#.', '#.....#'] },
  panico: { c: '#f0d040', b: ['..##...', '..##...', '..##...', '..##...', '.......', '..##...', '..##...'] },
  ansioso: { c: '#a8e070', b: ['.#####.', '#.....#', '#.#.#.#', '#.....#', '#.###.#', '#.....#', '.#####.'] },
  doente: { c: '#7ac050', b: ['.#####.', '#.#.#.#', '#######', '#.....#', '#.###.#', '#######', '.#####.'] },
  pesado: { c: '#c8a070', b: ['..###..', '..#.#..', '#######', '#######', '#######', '#######', '#######'] },
  cansaco: { c: '#e8c060', b: ['#......', '##.....', '###....', '####...', '#####..', '######.', '#######'] },
  calor: { c: '#f0a040', b: ['...#...', '.#.#.#.', '..###..', '#######', '..###..', '.#.#.#.', '...#...'] },
};
function drawMoodle(c, name, x, y, sev) {
  const m = MOODLE_ICON[name]; if (!m) return;
  const bc = ['#e8d050', '#e88a30', '#d83838', '#a01818'][Math.max(0, Math.min(3, sev))];
  prect(c, x, y, 15, 15, '#0e1016'); prect(c, x + 1, y + 1, 13, 13, bc); prect(c, x + 2, y + 2, 11, 11, '#1a1d26');
  m.b.forEach((r, j) => [...r].forEach((ch, i) => { if (ch === '#') prect(c, x + 4 + i, y + 4 + j, 1, 1, m.c); }));
}
