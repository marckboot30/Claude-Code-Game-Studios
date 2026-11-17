// PROTOTYPE - NOT FOR PRODUCTION
// Question: vasculhar a cidade só de cueca, sob a pressão do barulho, do frio e da fome, e montar uma base barricada é tenso e divertido por 20 minutos?
// Date: 2026-11-17
// What the player sees and hears: the cut-away isometric world, night light, the HUD, the
// panels, the round minimap and the full map, the screens, and the sounds.
'use strict';

let camX = 0, camY = 0, curB = -1, ZOOM = 1; // ZOOM: whole-number steps, 1 or 2
const fadeB = new Set();
function isoS(x, y, z = 0) { return [Math.round((x - y) * 16 - camX), Math.round((x + y) * 8 - z - camY)]; }
function screenToWorld(sx, sy) { const X = sx / ZOOM + camX, Y = sy / ZOOM + camY, a = X / 16, b = Y / 8; return [(a + b) / 2, (b - a) / 2]; }
function blit(img, x, y, alpha = 1, flip = false) {
  if (alpha < 1) ctx.globalAlpha = alpha;
  if (flip) { ctx.save(); ctx.translate(x + img.c.width, y); ctx.scale(-1, 1); ctx.drawImage(img.c, 0, 0); ctx.restore(); }
  else ctx.drawImage(img.c, x, y);
  if (alpha < 1) ctx.globalAlpha = 1;
}
const hits = []; // clickable UI rects from the last frame
function hitRect(x, y, w, h, fn) { hits.push({ x, y, w, h, fn }); }

// ---- figures ----------------------------------------------------------------------------------------
function playerLook(p) {
  const col = s => p.wear[s] ? itemDef(p.wear[s].id).col : null;
  const legs = p.wear.pernas && !itemDef(p.wear.pernas.id).under ? col('pernas') : null;
  const top = col('tronco');
  return { skin: '#e2a57c', hair: '#4a3020', top, topLong: p.wear.tronco ? !!itemDef(p.wear.tronco.id).long : false, jacket: col('casaco'), pants: legs, under: legs ? null : '#eef0f2', shoes: col('pes'), hat: col('cabeca'), gloves: col('maos'), bag: !!p.wear.costas };
}
function screenDir(dx, dy) { const sx = dx - dy, sy = (dx + dy) / 2; return { back: sy < -0.05, flip: sx < 0 }; }
function playerImg(p) {
  const o = playerLook(p), sd = screenDir(p.dir[0], p.dir[1]);
  o.back = sd.back; o.weapon = p.hand ? p.hand.id : null;
  const a = p.action, anim = a ? a.anim : null, tt = state.t;
  if (p.sleeping) return { img: lyingImg(Object.assign(o, { back: false })), flip: false, lying: true };
  if (anim === 'sit') { o.pose = 'sit'; o.back = true; o.weapon = null; }
  else if (anim === 'read') { o.pose = 'read'; o.back = false; o.weapon = null; }
  else if (anim === 'bandage') { o.pose = 'bandage'; o.back = false; o.f = Math.floor(tt * 4) % 4; o.weapon = null; }
  else if (anim === 'search') { o.pose = 'search'; o.f = Math.floor(tt * 5) % 2; o.weapon = null; }
  else if (anim === 'crouch') { o.pose = 'crouch'; }
  else if (p.swing > 0) { o.pose = 'attack'; o.f = p.swing > 0.22 ? 0 : p.swing > 0.1 ? 1 : 2; if (anim === 'hammer') o.weapon = 'martelo'; }
  else if (anim === 'hammer' || anim === 'chop') { o.pose = 'attack'; o.f = 2; if (anim === 'hammer') o.weapon = 'martelo'; }
  else if (p.crouch) { o.pose = 'crouch'; }
  else if (p.moving) { o.pose = p.run ? 'run' : 'walk'; o.f = p.f; }
  if (o.back) o.weapon = null;
  return { img: humanImg(o), flip: sd.flip };
}
function zombieLook(z) { const O = ZOUTFITS[z.outfit], K = ZKINDS[z.kind]; return { skin: z.kind === 'corredor' ? '#9aa882' : '#8ea07a', eyes: '#e8d65a', hair: O.hair, top: K.runner ? '#a83030' : O.top, pants: O.pants, shoes: '#3a3228', zombie: true, fat: !!K.fat, runner: !!K.runner, blood: true }; }
function zombieImg(z) {
  const o = zombieLook(z), sd = screenDir(z.dirx || 0.7, z.diry || 0.7);
  if (ZKINDS[z.kind].crawl) return { img: crawlerImg(o, z.dead ? 0 : z.f % 2), flip: sd.flip };
  if (z.dead || z.down > 0) return { img: lyingImg(Object.assign(o, { back: false })), flip: sd.flip, lying: true };
  o.back = sd.back;
  if (z.attackPose) { o.pose = 'attack'; o.f = z.atk > tune.zombie_windup * 0.6 ? 1 : 0; }
  else if (z.moving) { o.pose = 'walk'; o.f = z.f; }
  return { img: humanImg(o), flip: sd.flip };
}

// ---- the world -------------------------------------------------------------------------------------
function wallFor(e) {
  const p = state.p;
  if (e.kind === 'fence') { if (e.door && e.open) return null; return { img: fenceImg(e.dir), a: 1 }; }
  let cut = false;
  if (e.b >= 0 && e.b === curB) cut = e.dir === 'V' ? e.i > p.x : e.j > p.y;
  if (e.kind === 'wood' && (e.dir === 'V' ? e.i > p.x : e.j > p.y) && Math.hypot((e.dir === 'V' ? e.i : e.i + 0.5) - p.x, (e.dir === 'V' ? e.j + 0.5 : e.j) - p.y) < 2.6) cut = true;
  const h = cut ? CUT_H : WALL_H;
  let face, key, cap;
  if (e.kind === 'wood') { face = EXT.madeira[e.dir === 'V' ? 'E' : 'S']; key = 'wood'; cap = EXT.madeira.cap; }
  else {
    const k = inMap(e.i, e.j) ? world.bld[idx(e.i, e.j)] : -1;
    if (k >= 0) { face = world.buildings[k].inner; key = 'in' + face; cap = '#3b3530'; }
    else { const b = world.buildings[e.b] || world.buildings[0]; const st = EXT[b.ext]; face = st[e.dir === 'V' ? 'E' : 'S']; key = 'ex' + b.ext; cap = st.cap; }
  }
  const feature = e.door ? 'door' : e.win ? 'window' : '';
  const st = e.door ? (e.broken ? 'broken' : e.open ? 'open' : 'closed') : e.win ? e.glass : '';
  return { img: wallImg(e.dir, face, key, h, feature, st, cap, Math.min(4, e.barr || 0)), a: fadeB.has(e.b) ? 0.45 : 1 };
}
function drawEdge(e) { if (!e) return; const w = wallFor(e); if (!w) return; const [x, y] = isoS(e.i, e.j); blit(w.img, x - w.img.ox, y - w.img.oy, w.a); }
function furnState(f) {
  switch (f.t) {
    case 'tv': return f.on && world.buildings[f.b] && world.buildings[f.b].powered ? 'on' : '';
    case 'radio': return f.st === 'on' ? 'on' : '';
    case 'gerador': return f.on ? 'on' : '';
    case 'cocho': return f.food > 0 && f.water > 0 ? 'ambos' : f.water > 0 ? 'agua' : f.food > 0 ? 'comida' : '';
    case 'poste': return (powerOn() && daylight() < 0.6) ? 'on' : '';
    case 'bomba': return powerOn() ? 'on' : '';
  }
  return '';
}
function drawFurn(f, i, j) {
  const p = state.p;
  if (f.big) {
    if (i !== f.ai || j !== f.aj) return;
    const img = carImg(f.dir, f.col || '#c9302c', f.t), [x, y] = isoS(f.i, f.j);
    blit(img, x - img.ox, y - img.oy, fadeB.has(f.b) ? 0.35 : 1); return;
  }
  const v = f.t === 'arvore' ? f.v % 3 : f.t === 'estante' ? f.v % 6 : f.t === 'cama' || f.t === 'sofa' ? f.v % 4 : 0;
  const img = furnImg(f.t, v, furnState(f));
  let [x, y] = isoS(f.i, f.j);
  if (f.shake > 0) { f.shake -= 1 / 60; x += Math.round(Math.sin(state.t * 60) * 1); }
  let a = 1;
  if (f.t === 'arvore') { const ps = isoS(p.x, p.y); if (f.i + f.j > p.x + p.y - 0.5 && Math.abs(ps[0] - x) < 18 && ps[1] < y + 6 && ps[1] > y - 60) a = 0.4; }
  if (fadeB.has(f.b)) a = 0.35;
  blit(img, x - img.ox, y - img.oy, a);
  if (f.cont && !f.searched && Math.hypot(f.i + 0.5 - p.x, f.j + 0.5 - p.y) < 4.5 && Math.floor(state.t * 2.5 + f.i) % 3 === 0) { const [sx, sy] = isoS(f.i + 0.5, f.j + 0.5, f.t === 'armario' || f.t === 'guarda' || f.t === 'geladeira' || f.t === 'estante' ? 34 : 18); prect(ctx, sx - 2, sy, 5, 1, '#f0d040'); prect(ctx, sx, sy - 2, 1, 5, '#f0d040'); prect(ctx, sx, sy, 1, 1, '#ffffff'); }
  if (f.t === 'fogueira' && f.fuel > 0) { const [fx, fy] = isoS(f.i + 0.5, f.j + 0.5, 3); const k = Math.floor(state.t * 10) % 3; prect(ctx, fx - 2, fy - 4 - k, 5, 4 + k, '#e87a2a'); prect(ctx, fx - 1, fy - 6 - k, 3, 4, '#f2c24a'); prect(ctx, fx, fy - 8 - (k === 1 ? 1 : 0), 1, 2, '#fff0a0'); }
  if (f.t === 'tv' && f.on) { /* the picture flickers */ if (Math.floor(state.t * 6) % 2) { const [tx, ty] = isoS(f.i + 0.4, f.j + 0.6, 13); prect(ctx, tx - 2, ty, 3, 1, '#ffffff'); } }
}
function drawGround(i, j) {
  const g = world.ground.get(idx(i, j)); if (!g || !g.length) return;
  const [x, y] = isoS(i + 0.5, j + 0.5);
  for (let k = 0; k < Math.min(3, g.length); k++) { const d = itemDef(g[k].id), ic = iconImg(d.icon, d.tint); ctx.drawImage(ic, x - (ic.width >> 1) + (k - 1) * 5, y - ic.height + 2 - k); }
}
function drawEntity(en) {
  if (en.kind === 'player') {
    const p = state.p, r = playerImg(p); let [x, y] = isoS(p.x, p.y);
    if (r.lying) { const b = p.action && p.action.bed; if (b) [x, y] = isoS(b.i + 0.5, b.j + 0.5, 4); }
    shadow(x, y); blit(r.img, x - r.img.ox, y - r.img.oy, 1, r.flip);
    if (p.hurt > 0 && Math.floor(state.t * 20) % 2) { ctx.globalAlpha = 0.5; ctx.globalCompositeOperation = 'source-atop'; ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
    if (state.muzzle > 0) { const sx = x + p.dir[0] * 10 - p.dir[1] * 10, sy = y - 14 + (p.dir[0] + p.dir[1]) * 4; prect(ctx, sx - 2, sy - 2, 5, 5, '#fff0a0'); }
    return;
  }
  if (en.kind === 'zombie') {
    const z = en.z, r = zombieImg(z), [x, y] = isoS(z.x, z.y);
    if (!z.dead) shadow(x, y);
    blit(r.img, x - r.img.ox, y - r.img.oy, z.dead ? 0.9 : 1, r.flip);
    if (z.flash > 0) { prect(ctx, x - 1, y - 30, 3, 3, '#ff4040'); }
    return;
  }
  if (en.kind === 'animal') {
    const a = en.a, [x, y] = isoS(a.x, a.y), img = a.kind === 'vaca' ? cowImg(a.f, a.dead) : chickenImg(a.f, a.dead);
    if (!a.dead) shadow(x, y, a.kind === 'vaca' ? 8 : 4);
    blit(img, x - img.ox, y - img.oy, 1, !!a.fl);
  }
}
function shadow(x, y, w = 5) { ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fillRect(x - w, y - 1, w * 2 + 1, 2); ctx.fillRect(x - w + 2, y - 2, w * 2 - 3, 1); ctx.fillRect(x - w + 2, y + 1, w * 2 - 3, 1); }
function drawWorld() {
  const p = state.p;
  const px = (p.x - p.y) * 16, py = (p.x + p.y) * 8;
  const VW = W / ZOOM, VH = H / ZOOM;
  camX = Math.round(px - VW / 2); camY = Math.round(py - VH / 2 + 6);
  ctx.setTransform(ZOOM, 0, 0, ZOOM, 0, 0);
  const b = buildingAt(p.x, p.y); curB = b ? b.id : -1;
  // buildings that hide the survivor fade
  fadeB.clear();
  const ps = p.x + p.y, pd = p.x - p.y;
  for (const B of world.buildings) {
    if (B.id === curB) continue;
    if (Math.abs(B.x0 - p.x) > 16 || Math.abs(B.y0 - p.y) > 16) continue;
    if (pd > B.x0 - B.y1 - 0.5 && pd < B.x1 - B.y0 + 0.5 && B.x1 + B.y1 > ps + 0.3 && B.x0 + B.y0 < ps + 5) fadeB.add(B.id);
  }
  ctx.fillStyle = '#16181c'; ctx.fillRect(0, 0, W, H);
  const s0 = Math.floor((camY - 30) / 8), s1 = Math.ceil((camY + VH + 90) / 8), d0 = Math.floor((camX - 40) / 16), d1 = Math.ceil((camX + VW + 40) / 16);
  const wf = Math.floor(state.t * 1.5);
  // floors
  for (let s = s0; s <= s1; s++) for (let d = d0; d <= d1; d++) {
    if ((s + d) & 1) continue; const i = (s + d) >> 1, j = (s - d) >> 1; if (!inMap(i, j)) continue;
    const k = idx(i, j), fl = world.floor[k];
    const img = floorImg(fl, fl === 'agua' ? (world.fv[k] + wf) % 4 : world.fv[k]);
    ctx.drawImage(img, d * 16 - camX - 16, s * 8 - camY);
    if (world.glass.has(k)) { const [gx, gy] = isoS(i + 0.5, j + 0.5); for (let q = 0; q < 4; q++) { const h1 = hash2(i, j, q); prect(ctx, gx - 8 + Math.floor(h1 * 16), gy - 4 + Math.floor(hash2(j, i, q) * 8), 1, 1, (Math.floor(state.t * 3 + q) % 3) ? '#c8e0f0' : '#ffffff'); } }
  }
  for (const dcl of state.decals) { const [x, y] = isoS(dcl.x, dcl.y); if (x < -10 || y < -10 || x > W + 10 || y > H + 10) continue; pdisc(ctx, x, y, dcl.r, '#6e1418', 0.5); prect(ctx, x + dcl.r + 1, y, 1, 1, '#5e1418'); }
  // entities by tile
  const buckets = new Map(); const put = (x, y, en) => { const k = idx(Math.floor(x), Math.floor(y)); if (!buckets.has(k)) buckets.set(k, []); en.o = x + y; buckets.get(k).push(en); };
  put(p.x, p.y, { kind: 'player' });
  for (const z of state.near) if (z.dead || z.visible) put(z.x, z.y, { kind: 'zombie', z });
  for (const a of world.animals) if (Math.abs(a.x - p.x) < 24 && Math.abs(a.y - p.y) < 24) put(a.x, a.y, { kind: 'animal', a });
  for (let s = s0; s <= s1 + 6; s++) for (let d = d0; d <= d1; d++) {
    if ((s + d) & 1) continue; const i = (s + d) >> 1, j = (s - d) >> 1; if (!inMap(i, j)) continue;
    const k = idx(i, j);
    drawEdge(getV(i, j)); drawEdge(getH(i, j));
    const f = world.furn[k]; if (f) drawFurn(f, i, j);
    drawGround(i, j);
    const bk = buckets.get(k); if (bk) { bk.sort((a, c) => a.o - c.o); for (const en of bk) drawEntity(en); }
    const bid = world.bld[k];
    if (bid >= 0 && bid !== curB) { const B = world.buildings[bid], r = roofImg(B, i, j), [x, y] = isoS(i, j); blit(r, x - r.ox, y - r.oy, fadeB.has(bid) ? 0.4 : 1); }
  }
  if (state.ui.build) drawBuildGhost();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
function drawBuildGhost() {
  const t = buildTarget(); if (!t) return;
  const B = BUILDS[state.ui.build.opt], [ok] = buildOk(B), good = ok && !t.why && !t.far;
  const col = good ? 'rgba(120,230,120,0.55)' : 'rgba(240,90,80,0.55)';
  if (t.kind === 'edge' || t.kind === 'newedge') {
    const a = isoS(t.i, t.j), b2 = t.dir === 'V' ? isoS(t.i, t.j + 1) : isoS(t.i + 1, t.j);
    ctx.fillStyle = col; pfill(ctx, [a, b2, [b2[0], b2[1] - WALL_H], [a[0], a[1] - WALL_H]], col);
    pline(ctx, a[0], a[1], b2[0], b2[1], good ? '#9af09a' : '#ff6060');
  } else {
    const [x, y] = isoS(t.i, t.j); pfill(ctx, [[x, y], [x + 16, y + 8], [x, y + 16], [x - 16, y + 8]], col);
  }
}

// ---- night light ----------------------------------------------------------------------------------
let lightCv = null, lightCx = null;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
function addLight(x, y, r, c, a) { if (x < -r || y < -r || x > W + r || y > H + r) return; const g = lightCx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${c},${a})`); g.addColorStop(1, `rgba(${c},0)`); lightCx.fillStyle = g; lightCx.fillRect(x - r, y - r, r * 2, r * 2); }
function lighting() {
  const dl = daylight(); if (dl >= 0.999 && !state.lightTest) return;
  if (!lightCv || lightCv.width !== W || lightCv.height !== H) { lightCv = document.createElement('canvas'); lightCv.width = W; lightCv.height = H; lightCx = lightCv.getContext('2d', { willReadFrequently: true }); }
  const p = state.p, amb = tune.night_dark + (1 - tune.night_dark) * dl, h = hourOf(state.time);
  lightCx.setTransform(1, 0, 0, 1, 0, 0); lightCx.globalCompositeOperation = 'source-over'; lightCx.fillStyle = '#000'; lightCx.fillRect(0, 0, W, H); lightCx.globalCompositeOperation = 'lighter'; lightCx.setTransform(ZOOM, 0, 0, ZOOM, 0, 0);
  const [px, py] = isoS(p.x, p.y, 12);
  addLight(px, py, hasTrait('olhos') ? 60 : 38, '200,205,230', 0.6);
  if (p.light && hasTool(p, 'lanterna')) {
    const sx = p.dir[0] - p.dir[1], sy = (p.dir[0] + p.dir[1]) / 2, an = Math.atan2(sy, sx), R = tune.flashlight_range;
    const g = lightCx.createRadialGradient(px, py, 0, px, py, R); g.addColorStop(0, 'rgba(255,250,220,1)'); g.addColorStop(0.7, 'rgba(255,250,220,0.75)'); g.addColorStop(1, 'rgba(255,250,220,0)');
    lightCx.fillStyle = g; lightCx.beginPath(); lightCx.moveTo(px, py); lightCx.ellipse(px, py, R, R * 0.55, 0, an - 0.5, an + 0.5); lightCx.closePath(); lightCx.fill();
  }
  for (const f of state.fires) if (f.fuel > 0) { const [x, y] = isoS(f.i + 0.5, f.j + 0.5, 4); addLight(x, y, 78 + Math.sin(state.t * 9) * 3, '255,160,80', 0.95); }
  if (powerOn()) for (const [i, j] of world.lamps) { if (Math.abs(i - p.x) > 22 || Math.abs(j - p.y) > 22) continue; const [x, y] = isoS(i, j, 0); addLight(x, y, 58, '255,225,160', 0.75); }
  for (const B of world.buildings) { if (!B.powered || Math.abs(B.x0 - p.x) > 22 || Math.abs(B.y0 - p.y) > 22) continue; for (const [i, j] of B.lights) { const [x, y] = isoS(i, j, B.id === curB ? 4 : 26); addLight(x, y, 46, '255,220,150', 0.8); } }
  for (const g of state.gens) if (g.on) { const [x, y] = isoS(g.i + 0.5, g.j + 0.5, 8); addLight(x, y, 18, '160,255,160', 0.6); }
  for (const t of state.radios) if (t.t === 'tv' && t.on) { const [x, y] = isoS(t.i + 0.5, t.j + 0.5, 12); addLight(x, y, 34, '140,190,255', 0.7); }
  if (state.muzzle > 0) addLight(px, py, 110, '255,240,200', 1);
  lightCx.setTransform(1, 0, 0, 1, 0, 0);
  const sc = ctx.getImageData(0, 0, W, H), ld = lightCx.getImageData(0, 0, W, H).data, d = sc.data;
  let ar, ag, ab;
  if (dl > 0.05 && h > 12) { ar = amb * 1.08; ag = amb * 0.86; ab = amb * 0.74; } else if (dl > 0.05) { ar = amb * 1.0; ag = amb * 0.86; ab = amb * 0.92; } else { ar = amb * 0.62; ag = amb * 0.76; ab = Math.min(1, amb * 1.1 + 0.03); }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = (y * W + x) * 4;
    const lr = ld[k] / 255, lg = ld[k + 1] / 255, lb = ld[k + 2] / 255;
    const q = (v) => (v > 1 ? 1 : v); // smooth light: no dither pattern
    d[k] = d[k] * q(ar + lr * (1 - ar)); d[k + 1] = d[k + 1] * q(ag + lg * (1 - ag)); d[k + 2] = d[k + 2] * q(ab + lb * (1 - ab));
  }
  ctx.putImageData(sc, 0, 0);
}

// ---- HUD -----------------------------------------------------------------------------------------
function panel(x, y, w, h, a = 0.82) { ctx.fillStyle = `rgba(10,12,18,${a})`; ctx.fillRect(x, y, w, h); prect(ctx, x, y, w, 1, '#3a3f4c'); prect(ctx, x, y + h - 1, w, 1, '#060709'); }
function bar(x, y, w, v, col, back = '#2a2d36') { prect(ctx, x, y, w, 3, back); prect(ctx, x, y, Math.max(0, Math.round(w * Math.max(0, Math.min(1, v)))), 3, col); }
function moodles(p) {
  const L2 = [];
  const lv = (v, a, b, c) => v >= c ? 2 : v >= b ? 1 : v >= a ? 0 : -1;
  const add = (n, s, label) => { if (s >= 0) L2.push([n, s, label]); };
  add(p.cold >= 70 ? 'hipotermia' : 'frio', lv(p.cold, 25, 50, 70), p.cold >= 70 ? 'Hipotermia' : 'Frio');
  add('fome', lv(p.hunger, 35, 60, 85), 'Fome'); add('sede', lv(p.thirst, 35, 60, 85), 'Sede');
  add('cansado', lv(p.fatigue, 55, 75, 90), 'Sono');
  if (p.wounds.some(w => !w.band && w.type !== 'arranhao')) add('sangrando', 2, 'Sangrando');
  add('dor', lv(p.pain, 15, 35, 60), 'Dor');
  add('panico', lv(p.panic, 20, 50, 80), 'Pânico');
  if (p.infected && p.infT > tune.infect_anxious_h) add('ansioso', p.infT > tune.infect_drain_h ? 2 : 1, p.infT > tune.infect_drain_h ? 'Febre' : 'Ansioso');
  if (p.sick > 0) add('doente', 1, 'Enjoado');
  if (invWeight(p) > capacity(p)) add('pesado', invWeight(p) > capacity(p) * 1.5 ? 2 : 1, 'Pesado');
  add('cansaco', lv(100 - p.stamina, 50, 75, 92), 'Fôlego');
  if (warmFire(p.x, p.y)) add('calor', 0, 'Aquecido');
  return L2;
}
function drawMinimap() {
  const cx = W - 34, cy = 34, r = 28, p = state.p, [mx, my] = mapXY(p.x, p.y);
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = '#0b0d12'; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.drawImage(mapCanvas, Math.round(cx - mx), Math.round(cy - my)); ctx.drawImage(fogCanvas, Math.round(cx - mx), Math.round(cy - my));
  ctx.restore();
  for (let a = 0; a < 64; a++) { const t = a / 64 * Math.PI * 2; prect(ctx, Math.round(cx + Math.cos(t) * r), Math.round(cy + Math.sin(t) * r), 2, 2, '#2a2d36'); prect(ctx, Math.round(cx + Math.cos(t) * (r + 1)), Math.round(cy + Math.sin(t) * (r + 1)), 1, 1, '#8a8f9c'); }
  prect(ctx, cx - 1, cy - 1, 3, 3, '#0b0d12'); prect(ctx, cx, cy, 1, 1, Math.floor(state.t * 3) % 2 ? '#ffffff' : '#f0d040');
  ptext(ctx, 'M', cx + r - 4, cy + r - 6, '#c8ccd6');
  hitRect(cx - r, cy - r, r * 2, r * 2, () => { state.ui.map = !state.ui.map; state.mapOff = [0, 0]; });
}
function drawHUD() {
  const p = state.p, d = dayOf(state.time), h = hourOf(state.time);
  // clock and weather
  panel(4, 4, 92, 21);
  ptext(ctx, `DIA ${d}  ${clockStr(state.time)}`, 9, 8, '#f0ead8');
  const per = h < 5 ? 'MADRUGADA' : h < 12 ? 'MANHA' : h < 18 ? 'TARDE' : 'NOITE';
  ptext(ctx, `${per} ${Math.round(ambientTemp())} C`, 9, 16, h >= 18 || h < 6 ? '#8fb4e0' : '#e8c070');
  if (!powerOn()) ptext(ctx, 'SEM LUZ', 64, 16, '#ff6060'); else if (dayOf(state.time) >= tune.power_off_day - 1) ptext(ctx, 'LUZ!', 76, 16, '#f0d040');
  // messages
  let my = 29;
  for (const m of state.msgs.slice(-5)) { const lines = wrapTxt(m.s, 210); for (const ln of lines) { ctx.globalAlpha = Math.min(1, m.t / 1.5); ptext(ctx, ln, 6, my, m.col); ctx.globalAlpha = 1; my += 7; } }
  // minimap and moodles
  drawMinimap();
  const ms = moodles(p); let yy = 68;
  for (const [n, s, label] of ms) { drawMoodle(ctx, n, W - 20, yy, s); ptext(ctx, label, W - 23, yy + 5, '#c8ccd6', '#0b0d12', 1, 'right'); yy += 17; if (yy > (TOUCH ? H - 140 : H - 60)) break; }
  // body, stamina, weapon, weight
  panel(4, H - 38, 120, 34);
  ptext(ctx, 'VIDA', 8, H - 34, '#f08080'); bar(32, H - 33, 60, p.hp / 100, p.hp > 50 ? '#7ac050' : p.hp > 25 ? '#e8c040' : '#e04848');
  ptext(ctx, 'FOLEGO', 8, H - 27, '#9fd3f0'); bar(32, H - 26, 60, p.stamina / 100, '#5aa0e8');
  const w = weaponDef(p);
  ptext(ctx, (p.hand ? itemName(p.hand) : 'MAOS NUAS').slice(0, 26), 8, H - 19, '#e8c070');
  ptext(ctx, `PESO ${invWeight(p)}/${capacity(p)}`, 8, H - 11, invWeight(p) > capacity(p) ? '#ff6060' : '#c8ccd6');
  ptext(ctx, `CALOR ${warmth(p)}`, 70, H - 11, '#e8a060');
  if (p.hand) { const ic = iconImg(itemDef(p.hand.id).icon); ctx.drawImage(ic, 108 - (ic.width >> 1), H - 34); }
  if (p.crouch) ptext(ctx, 'AGACHADO', 96, H - 27, '#a0a6b0');
  if (p.light && hasTool(p, 'lanterna')) ptext(ctx, 'LANTERNA', 96, H - 19, '#f0d040');
  // the prompt
  if (!state.ui.menu && !state.ui.build && state.targets.length && !p.action) {
    const acts = actionsFor(state.targets[0]); const a = acts.find(x => x.ok) || acts[0];
    if (a) { const s = `[E] ${a.label}${acts.length > 1 ? `  (+${acts.length - 1})` : ''}${a.ok ? '' : ' - ' + a.why}`; const tw2 = textW(s) + 8; panel(W / 2 - tw2 / 2, H - 22, tw2, 11); ptext(ctx, s, W / 2, H - 19, a.ok ? '#f0ead8' : '#ff9080', '#0b0d12', 1, 'center'); }
  }
  // the hint of the moment
  const T = TUT[state.tut];
  if (T && !state.ui.panel && !state.ui.map) { const lines = wrapTxt(T.s, 230); const hh = lines.length * 7 + 5; panel(W / 2 - 120, H - 36 - hh, 240, hh, 0.7); lines.forEach((ln, k) => ptext(ctx, ln, W / 2, H - 33 - hh + k * 7 + 1, '#f0d040', '#0b0d12', 1, 'center')); }
  if (state.ui.menu) drawMenu();
  if (state.ui.build) drawBuildBar();
  if (state.ui.cont) drawCont();
  if (state.ui.panel === 'inv') drawInv(); else if (state.ui.panel === 'saude') drawHealth();
  if (state.ui.map) drawMap();
  if (TOUCH && !state.ui.map) drawTouch();
  if (state.zoomShow > 0) ptext(ctx, `ZOOM ${ZOOM}X`, W / 2, 30, '#f0d040', '#0b0d12', 2, 'center');
  if (p.hurt > 0) { ctx.fillStyle = `rgba(200,20,20,${p.hurt * 0.5})`; ctx.fillRect(0, 0, W, H); }
  if (p.sleeping) { ctx.fillStyle = 'rgba(0,0,10,0.45)'; ctx.fillRect(0, 0, W, H); ptext(ctx, 'DORMINDO...  (MEXA-SE PARA ACORDAR)', W / 2, H / 2 - 30, '#b8a0e0', '#0b0d12', 1, 'center'); }
}
function isoV(x, y, z = 0) { const q = isoS(x, y, z); return [q[0] * ZOOM, q[1] * ZOOM]; }
function drawOverWorld() {
  const p = state.p;
  // noise rings
  for (const n of state.noises) { if (n.r < 3) continue; const [x, y] = isoV(n.x, n.y); const k = 1 - n.t / 0.7, rx = n.r * 16 * ZOOM * (0.4 + 0.6 * k), ry = rx / 2; ctx.globalAlpha = Math.max(0, n.t / 0.7) * 0.8; const near = Math.hypot(n.x - p.x, n.y - p.y) < 0.6; for (let a = 0; a < 48; a += 2) { const t = a / 48 * Math.PI * 2; prect(ctx, Math.round(x + Math.cos(t) * rx), Math.round(y + Math.sin(t) * ry), 1, 1, near ? '#f0dc8c' : '#ff7a6a'); } ctx.globalAlpha = 1; }
  // radio subtitles, kept on screen
  for (const s of state.subs) { let [x, y] = isoV(s.i + 0.5, s.j + 0.5, 30); const lines = wrapTxt(s.s, 150); const hh = lines.length * 7 + 4; x = Math.max(80, Math.min(W - 150, x)); y = Math.max(hh + 4, Math.min(H - 40, y)); panel(x - 78, y - hh, 156, hh, 0.75); lines.forEach((ln, k) => ptext(ctx, ln, x, y - hh + 2 + k * 7, '#9fd3f0', '#0b0d12', 1, 'center')); }
  // the action bar above the head
  const a = p.action;
  if (a && (a.dur || a.kind === 'tv')) {
    const [x, y] = isoV(p.x, p.y, 34); const v = a.kind === 'tv' ? (a.capped ? 1 : a.prog || 0) : a.t / a.dur;
    prect(ctx, x - 11, y - 1, 22, 5, '#0b0d12'); prect(ctx, x - 10, y, 20, 3, '#2a2d36'); prect(ctx, x - 10, y, Math.round(20 * Math.min(1, v)), 3, a.kind === 'read' || a.kind === 'tv' ? '#f0d040' : '#9fd3f0');
    const lbl = a.kind === 'tv' ? (a.label + (a.capped ? ' (TV ATE NIVEL ' + tune.tv_max_level + ')' : '')) : a.label;
    if (lbl) ptext(ctx, lbl, x, y - 8, '#f0ead8', '#0b0d12', 1, 'center');
  }
  if (p.sleeping) { const [x, y] = isoV(p.x, p.y, 20); ptext(ctx, 'Z', x + 6 + Math.floor(state.t * 2) % 3, y - Math.floor(state.t * 4) % 6, '#b8a0e0'); }
}
function drawTouch() {
  // the stick
  const sx = stick.id !== null ? stick.cx : 58, sy = stick.id !== null ? stick.cy : H - 80;
  ctx.globalAlpha = 0.55; pdisc(ctx, sx, sy, 26, '#1a1d26'); ctx.globalAlpha = 1;
  for (let a = 0; a < 40; a++) { const t = a / 40 * Math.PI * 2; prect(ctx, Math.round(sx + Math.cos(t) * 26), Math.round(sy + Math.sin(t) * 26), 1, 1, '#8a8f9c'); }
  pdisc(ctx, Math.round(sx + stick.dx), Math.round(sy + stick.dy), 10, Math.hypot(stick.dx, stick.dy) > 22 ? '#e8a060' : '#c8ccd6');
  if (stick.id === null) ptext(ctx, 'ANDAR', sx, sy + 30, '#9aa2b0', '#0b0d12', 1, 'center');
  // the buttons
  for (const b of TBTN) {
    if (b.lit > 0) b.lit -= 1 / 60;
    ctx.globalAlpha = 0.7; pdisc(ctx, b.x, b.y, b.r, b.lit > 0 ? '#5a4a18' : '#1a1d26'); ctx.globalAlpha = 1;
    for (let a = 0; a < 32; a++) { const t = a / 32 * Math.PI * 2; prect(ctx, Math.round(b.x + Math.cos(t) * b.r), Math.round(b.y + Math.sin(t) * b.r), 1, 1, b.c === 'Space' ? '#e04848' : '#8a8f9c'); }
    ptext(ctx, b.l, b.x, b.y - 2, '#f0ead8', '#0b0d12', 1, 'center');
  }
}
function drawMenu() {
  const m = state.ui.menu, w = Math.max(...m.items.map(a => textW(a.label + (a.ok ? '' : ' - ' + a.why)))) + 22, h = m.items.length * 9 + 6, x = W / 2 - w / 2, y = H - 30 - h;
  panel(x, y, w, h, 0.92);
  m.items.forEach((a, k) => { const yy = y + 4 + k * 9; if (k === m.sel) prect(ctx, x + 2, yy - 1, w - 4, 8, '#3a3420'); ptext(ctx, `${k + 1} ${a.label}${a.ok ? '' : ' - ' + a.why}`, x + 6, yy, a.ok ? '#f0ead8' : '#8a8f9c'); hitRect(x, yy - 1, w, 9, () => { m.sel = k; runMenu(); }); });
}
function drawBuildBar() {
  const ui = state.ui, w = 116, x0 = W / 2 - (BUILDS.length * w) / 2, y = H - 30;
  BUILDS.forEach((B, k) => { const x = x0 + k * w; panel(x, y, w - 2, 26, k === ui.build.opt ? 0.95 : 0.75); if (k === ui.build.opt) prect(ctx, x, y, w - 2, 1, '#f0d040'); ptext(ctx, `${k + 1} ${B.n}`, x + 3, y + 3, k === ui.build.opt ? '#f0d040' : '#c8ccd6'); const c = B.cost.map(([id, n]) => `${n} ${itemDef(id).n}`).join(' + ') || 'Martelo'; ptext(ctx, c.slice(0, 28), x + 3, y + 11, '#9aa2b0'); const [ok, why] = buildOk(B); ptext(ctx, ok ? 'PRONTO' : why.slice(0, 28), x + 3, y + 18, ok ? '#9ad08a' : '#ff9080'); hitRect(x, y, w - 2, 26, () => { ui.build.opt = k; }); });
  ptext(ctx, 'CLIQUE NO LUGAR (OU ENTER)   B/ESC SAI', W / 2, y - 8, '#c8ccd6', '#0b0d12', 1, 'center');
  const t = buildTarget(); if (t && t.why) ptext(ctx, t.why, W / 2, y - 16, '#ff9080', '#0b0d12', 1, 'center'); else if (t && t.far) ptext(ctx, 'Longe demais', W / 2, y - 16, '#ff9080', '#0b0d12', 1, 'center');
}
function rowsList(x, y, w, rows, sel, max, draw) {
  const start = Math.max(0, Math.min(sel - Math.floor(max / 2), rows.length - max));
  for (let k = start; k < Math.min(rows.length, start + max); k++) { const yy = y + (k - start) * 12; if (k === sel) prect(ctx, x, yy - 1, w, 12, '#3a3420'); draw(rows[k], x, yy, k); }
  if (start > 0) ptext(ctx, '...', x + w - 12, y - 6, '#8a8f9c'); if (start + max < rows.length) ptext(ctx, '...', x + w - 12, y + max * 12 - 2, '#8a8f9c');
}
function drawCont() {
  const f = state.ui.cont, x = W - 176, y = 70, w = 150, rows = f.loot, h = Math.max(4, Math.min(10, rows.length)) * 12 + 26;
  panel(x, y, w, h, 0.9); ptext(ctx, (FNAME[f.t] || f.t), x + 5, y + 4, '#f0d040');
  if (!rows.length) ptext(ctx, 'VAZIO', x + 5, y + 16, '#8a8f9c');
  rowsList(x + 2, y + 14, w - 4, rows, state.ui.contSel, 10, (it, xx, yy, k) => { const d = itemDef(it.id), ic = iconImg(d.icon, d.tint); ctx.drawImage(ic, xx + 2, yy + (10 - ic.height) / 2 | 0); ptext(ctx, itemName(it), xx + 16, yy + 2, '#f0ead8'); hitRect(xx, yy - 1, w - 4, 12, () => { if (state.ui.contSel === k) { const it2 = f.loot.splice(k, 1)[0]; state.p.inv.push(it2); sfx('pick'); } else state.ui.contSel = k; }); });
  ptext(ctx, '[ENTER] PEGAR  [T] TUDO  [ESC]', x + 5, y + h - 9, '#9aa2b0');
  hitRect(x, y + h - 11, w / 2, 11, () => { const n = f.loot.length; for (const it of f.loot) state.p.inv.push(it); f.loot = []; if (n) sfx('pick'); });
  hitRect(x + w / 2, y + h - 11, w / 2, 11, () => { state.ui.cont = null; });
}
const TABS = ['ITENS', 'ROUPA', 'CRIAR', 'SABER'];
function drawInv() {
  const ui = state.ui, p = state.p, x = 8, y = 30, w = 270, h = 196;
  panel(x, y, w, h, 0.93);
  TABS.forEach((t, k) => { const tx = x + 4 + k * 52; prect(ctx, tx, y + 3, 50, 10, k === ui.tab ? '#3a3420' : '#1a1d26'); ptext(ctx, t, tx + 25, y + 6, k === ui.tab ? '#f0d040' : '#9aa2b0', '#0b0d12', 1, 'center'); hitRect(tx, y + 3, 50, 10, () => { ui.tab = k; ui.sel = 0; }); });
  ptext(ctx, '<- ->', x + w - 26, y + 6, '#6a7080');
  const ly = y + 18;
  if (ui.tab === 0) {
    const rows = invRows();
    if (!rows.length) ptext(ctx, 'NADA. VASCULHE ARMARIOS COM [E].', x + 6, ly + 4, '#8a8f9c');
    rowsList(x + 2, ly, 150, rows, ui.sel, 13, (r, xx, yy, k) => { const d = itemDef(r.it.id), ic = iconImg(d.icon || 'caixote', d.tint); ctx.drawImage(ic, xx + 2, yy + (10 - ic.height) / 2 | 0); ptext(ctx, (r.hand ? '* ' : '') + itemName(r.it).slice(0, 26) + (r.n > 1 ? ' x' + r.n : ''), xx + 16, yy + 2, r.hand ? '#e8c070' : '#f0ead8'); hitRect(xx, yy - 1, 150, 12, () => { if (ui.sel === k) { if (r.hand) { p.inv.push(p.hand); p.hand = null; } else useItem(r.it); } else ui.sel = k; }); });
    const r = rows[ui.sel];
    if (r) {
      const d = itemDef(r.it.id), ix = x + 158; ptext(ctx, d.n, ix, ly, '#f0d040');
      const info = [];
      if (d.cat === 'roupa') info.push(`${SLOT_NAME[d.slot]}`, `Calor ${d.warm}  Prot ${d.prot}`, d.cap ? `Carga +${d.cap}` : '', '[ENTER] VESTIR');
      if (d.cat === 'comida') info.push(`Fome -${d.fome}  Sede ${d.sede > 0 ? '+' : ''}${-d.sede > 0 ? '-' + (-d.sede) : d.sede}`, d.crua ? 'CRU: cozinhe antes!' : '', d.perec ? `Estraga em ${Math.max(0, d.perec - (r.it.age || 0))} dias` : '', '[ENTER] COMER');
      if (d.cat === 'arma') info.push(`Dano ${d.dmg}  Alcance ${d.range}`, r.hand ? '[ENTER] GUARDAR' : '[ENTER] EQUIPAR');
      if (d.cat === 'livro') info.push(`${SKILL_NAME[d.skill]} nível ${d.lvl}`, `Você: nível ${p.skills[d.skill]}`, d.lvl === p.skills[d.skill] + 1 ? '[ENTER] LER' : d.lvl <= p.skills[d.skill] ? 'Já sabe isto' : `Leia o ${p.skills[d.skill] + 1} antes`);
      if (d.cat === 'medico') info.push(r.it.id === 'analgesico' ? '[ENTER] TOMAR' : r.it.id === 'desinfetante' ? 'Bandagem limpa em CRIAR' : '[ENTER] ENFAIXAR (SAUDE)');
      if (d.cat === 'util' || d.cat === 'material') info.push(...wrapTxt(itemHint(r.it.id), 100), r.it.id === 'gerador' ? '[ENTER] COLOCAR' : r.it.id === 'lanterna' ? '[ENTER] LIGAR (F)' : r.it.id === 'municao' ? '[ENTER] CARREGAR' : '');
      info.push(`Peso ${d.w || 0}`);
      let iy = ly + 9; for (const s of info) if (s) { for (const ln of wrapTxt(s, 104)) { ptext(ctx, ln, ix, iy, '#c8ccd6'); iy += 7; } }
      if (!r.hand) { ptext(ctx, '[X] LARGAR', ix, y + h - 24, '#9aa2b0'); hitRect(ix, y + h - 26, 60, 9, () => { const k = p.inv.indexOf(r.it); if (k >= 0) { p.inv.splice(k, 1); addGround(Math.floor(p.x), Math.floor(p.y), r.it); sfx('pick'); } }); }
      if (ui.cont && !r.hand) { ptext(ctx, '[G] GUARDAR AQUI', ix, y + h - 17, '#9aa2b0'); hitRect(ix, y + h - 19, 80, 9, () => { const k = p.inv.indexOf(r.it); if (k >= 0) { p.inv.splice(k, 1); ui.cont.loot.push(r.it); sfx('pick'); } }); }
    }
    ptext(ctx, `PESO ${invWeight(p)}/${capacity(p)}`, x + 6, y + h - 9, invWeight(p) > capacity(p) ? '#ff6060' : '#9aa2b0');
  }
  if (ui.tab === 1) {
    rowsList(x + 2, ly, w - 4, SLOTS, ui.sel, 7, (s, xx, yy, k) => { const it = p.wear[s], d = it ? itemDef(it.id) : null; ptext(ctx, SLOT_NAME[s], xx + 4, yy + 2, '#9aa2b0'); if (d) { const ic = iconImg(d.icon); ctx.drawImage(ic, xx + 52, yy + (10 - ic.height) / 2 | 0); } ptext(ctx, d ? `${d.n}  (calor ${d.warm}, prot ${d.prot})` : '- nada -', xx + 68, yy + 2, d ? '#f0ead8' : '#d85a4a'); hitRect(xx, yy - 1, w - 4, 12, () => { ui.sel = k; }); });
    const yy = ly + 92;
    ptext(ctx, `CALOR TOTAL ${warmth(p)}    SENSACAO ${Math.round(state.felt || 0)} C (CONFORTO ${tune.comfort_temp} C)`, x + 6, yy, '#e8a060');
    PARTS.forEach((pt, k) => ptext(ctx, `${PART_NAME[pt]}: proteção ${protOf(p, pt)}%`, x + 6 + (k % 2) * 130, yy + 10 + Math.floor(k / 2) * 8, '#8ab0e0'));
    ptext(ctx, '[ENTER] TIRAR    MAIS ROUPA = MAIS CALOR E MENOS ARRANHAO/MORDIDA', x + 6, y + h - 9, '#9aa2b0');
  }
  if (ui.tab === 2) {
    rowsList(x + 2, ly, w - 4, RECIPES, ui.sel, 9, (r, xx, yy, k) => { const [ok, why] = recipeOk(r); ptext(ctx, r.n, xx + 4, yy + 2, ok ? '#f0ead8' : '#7a808c'); ptext(ctx, ok ? 'OK' : 'FALTA: ' + why, xx + 130, yy + 2, ok ? '#9ad08a' : '#ff9080'); hitRect(xx, yy - 1, w - 4, 12, () => { if (ui.sel === k) craft(r); else ui.sel = k; }); });
    ptext(ctx, '[ENTER] FAZER    COZINHAR: PERTO DE FOGUEIRA OU FOGAO COM LUZ', x + 6, y + h - 9, '#9aa2b0');
  }
  if (ui.tab === 3) {
    rowsList(x + 2, ly, w - 4, SKILLS, ui.sel, 5, (s, xx, yy, k) => { ptext(ctx, SKILL_NAME[s], xx + 4, yy + 2, '#f0ead8'); for (let q = 0; q < 10; q++) prect(ctx, xx + 110 + q * 9, yy + 1, 7, 6, q < p.skills[s] ? SKILL_COL[s] : '#2a2d36'); ptext(ctx, String(p.skills[s]), xx + 206, yy + 2, '#f0d040'); hitRect(xx, yy - 1, w - 4, 12, () => { ui.sel = k; }); });
    const s = SKILLS[ui.sel]; let iy = ly + 66;
    for (const ln of wrapTxt(SKILL_USE[s], w - 14)) { ptext(ctx, ln, x + 6, iy, '#c8ccd6'); iy += 7; }
    iy += 4; for (const ln of wrapTxt(`Só se aprende lendo o livro do nível seguinte (${SKILL_NAME[s]} ${p.skills[s] + 1}) ou vendo TV enquanto houver luz (até nível ${tune.tv_max_level}). Bibliotecas têm muitos livros.`, w - 14)) { ptext(ctx, ln, x + 6, iy, '#9aa2b0'); iy += 7; }
    const show = TV.map(t => `${t.h0}H ${t.n.toUpperCase()}`).join('  ');
    iy += 4; for (const ln of wrapTxt('TV: ' + show, w - 14)) { ptext(ctx, ln, x + 6, iy, '#9fd3f0'); iy += 7; }
  }
}
function drawHealth() {
  const p = state.p, x = 8, y = 30, w = 270, h = 160; panel(x, y, w, h, 0.93);
  ptext(ctx, 'SAUDE', x + 6, y + 5, '#f0d040'); ptext(ctx, `VIDA ${Math.round(p.hp)}%`, x + 60, y + 5, '#f08080');
  // the body, part by part
  const bx = x + 30, by = y + 22, col = (part) => { const ws = p.wounds.filter(wd => wd.part === part); if (!ws.length) return '#5a8a4a'; if (ws.every(wd => wd.band)) return '#e8e8e0'; if (ws.some(wd => wd.type === 'mordida')) return '#d83838'; if (ws.some(wd => wd.type === 'corte')) return '#e88a30'; return '#e8d050'; };
  const S = 4;
  prect(ctx, bx + 2 * S, by, 4 * S, 4 * S, col('cabeca')); prect(ctx, bx + 1 * S, by + 5 * S, 6 * S, 7 * S, col('tronco'));
  prect(ctx, bx - 1 * S, by + 5 * S, 2 * S, 6 * S, col('bracos')); prect(ctx, bx + 7 * S, by + 5 * S, 2 * S, 6 * S, col('bracos'));
  prect(ctx, bx - 1 * S, by + 11 * S, 2 * S, 2 * S, col('maos')); prect(ctx, bx + 7 * S, by + 11 * S, 2 * S, 2 * S, col('maos'));
  prect(ctx, bx + 1 * S, by + 13 * S, 3 * S, 7 * S, col('pernas')); prect(ctx, bx + 4 * S, by + 13 * S, 3 * S, 7 * S, col('pernas'));
  prect(ctx, bx + 1 * S, by + 20 * S, 3 * S, 2 * S, col('pes')); prect(ctx, bx + 4 * S, by + 20 * S, 3 * S, 2 * S, col('pes'));
  const lx = x + 90;
  if (!p.wounds.length) ptext(ctx, 'NENHUMA FERIDA.', lx, y + 20, '#9ad08a');
  rowsList(lx - 2, y + 18, 170, p.wounds, state.ui.sel, 8, (wd, xx, yy, k) => { ptext(ctx, `${PART_NAME[wd.part]}: ${wd.type === 'mordida' ? 'MORDIDA' : wd.type === 'corte' ? 'CORTE' : 'ARRANHAO'}`, xx + 2, yy + 2, wd.type === 'mordida' ? '#ff6060' : '#f0ead8'); ptext(ctx, wd.band ? `ENFAIXADO ${Math.round(wd.heal * 100)}%` : (wd.type === 'arranhao' ? 'ABERTO' : 'SANGRANDO'), xx + 104, yy + 2, wd.band ? '#9ad08a' : '#ff9080'); hitRect(xx, yy - 1, 170, 12, () => { if (state.ui.sel === k) bandageWound(wd); else state.ui.sel = k; }); });
  ptext(ctx, `BANDAGENS ${countItem(p, 'bandagem')}  TRAPOS ${countItem(p, 'trapo')}`, lx, y + h - 24, '#c8ccd6');
  ptext(ctx, '[ENTER] ENFAIXAR    [H] FECHAR', lx, y + h - 12, '#9aa2b0');
  ptext(ctx, 'VERDE OK  AMARELO ARRANHAO  LARANJA CORTE  VERMELHO MORDIDA', x + 6, y + h - 4 - 0, '#6a7080');
}
function drawMap() {
  const p = state.p, x = 10, y = 10, w = W - 20, h = H - 20; panel(x, y, w, h, 0.97);
  const [mx, my] = mapXY(p.x, p.y), off = state.mapOff || [0, 0], S = 2;
  ctx.save(); ctx.beginPath(); ctx.rect(x + 2, y + 12, w - 4, h - 22); ctx.clip();
  const ox = Math.round(x + w / 2 - (mx + off[0]) * S), oy = Math.round(y + h / 2 - (my + off[1]) * S);
  ctx.imageSmoothingEnabled = false; ctx.drawImage(mapCanvas, ox, oy, mapCanvas.width * S, mapCanvas.height * S); ctx.drawImage(fogCanvas, ox, oy, fogCanvas.width * S, fogCanvas.height * S);
  for (const q of world.pois) { if (!world.explored[idx(Math.floor(q.i), Math.floor(q.j))]) continue; const [qx, qy] = mapXY(q.i, q.j), sx = ox + qx * S, sy = oy + qy * S; prect(ctx, sx - 1, sy - 1, 3, 3, '#f0ead8'); ptext(ctx, q.n, sx + 4, sy - 2, '#f0ead8'); }
  for (const g of state.gens) { const [qx, qy] = mapXY(g.i, g.j); ptext(ctx, 'GERADOR', ox + qx * S + 4, oy + qy * S - 2, '#9ad08a'); }
  const sx = ox + mx * S, sy = oy + my * S; if (Math.floor(state.t * 3) % 2) { prect(ctx, sx - 2, sy - 2, 5, 5, '#0b0d12'); prect(ctx, sx - 1, sy - 1, 3, 3, '#f0d040'); }
  ctx.restore();
  ptext(ctx, 'MAPA DA CIDADE', x + 6, y + 4, '#f0d040'); ptext(ctx, 'SETAS MOVEM   M OU ESC FECHA   SO APARECE O QUE VOCE EXPLOROU', x + w - 6, y + 4, '#9aa2b0', '#0b0d12', 1, 'right');
  hitRect(x, y, w, h, () => { state.ui.map = false; }); // a tap closes the map
}

// ---- screens -------------------------------------------------------------------------------------
function bigText(s, x, y, sc, col) { ptext(ctx, s, x, y, col, '#0b0d12', sc, 'center'); }
function drawTitle() {
  if (state && state.p) { drawWorld(); }
  ctx.fillStyle = 'rgba(8,10,16,0.72)'; ctx.fillRect(0, 0, W, H);
  bigText('OS ULTIMOS DIAS', W / 2, 40, 5, '#d8d0a0'); prect(ctx, W / 2 - 155, 70, 310, 1, '#6e1418');
  ptext(ctx, 'SOBREVIVA O MAXIMO DE DIAS NUMA CIDADE INFESTADA', W / 2, 78, '#c8ccd6', '#0b0d12', 1, 'center');
  const C = ['WASD ANDAR   SHIFT CORRER   C AGACHAR', 'CLIQUE OU ESPACO ATACAR   Q EMPURRAR', 'E VASCULHAR/USAR   TAB INVENTARIO   H SAUDE', 'B CONSTRUIR/BARRICAR   F LANTERNA   M MAPA', 'Z OU + / - ZOOM   P PAUSA   N SOM'];
  C.forEach((c, k) => ptext(ctx, c, W / 2, 100 + k * 10, '#9aa2b0', '#0b0d12', 1, 'center'));
  const z = [humanImg(Object.assign(zombieLook({ outfit: 0, kind: 'comum' }), { pose: 'walk', f: Math.floor(clock.now() * 4) % 4 })), humanImg(Object.assign(zombieLook({ outfit: 2, kind: 'gordo' }), { pose: 'walk', f: (Math.floor(clock.now() * 4) + 2) % 4 })), humanImg({ skin: '#e2a57c', hair: '#4a3020', under: '#eef0f2', pose: 'idle' })];
  ctx.drawImage(z[0].c, 70, 176, 40, 56); ctx.drawImage(z[1].c, 30, 180, 40, 56); ctx.drawImage(z[2].c, W - 100, 176, 40, 56);
  if (Math.floor(clock.now() * 2) % 2) ptext(ctx, TOUCH ? 'TOQUE PARA COMECAR' : 'ENTER PARA COMECAR', W / 2, 168, '#f0d040', '#0b0d12', 2, 'center');
  let rec = 0; try { rec = +(localStorage.getItem('zonaMortaRecord') || 0); } catch (e) { rec = 0; }
  if (rec > 0) ptext(ctx, `RECORDE: ${Math.floor(rec / 24)} DIAS E ${Math.floor(rec % 24)} HORAS`, W / 2, 190, '#e8c070', '#0b0d12', 1, 'center');
  ptext(ctx, 'PIXEL ART ISOMETRICA - PROTOTIPO', W / 2, H - 10, '#4a4f5c', null, 1, 'center');
}
function drawCreate() {
  drawWorld(); ctx.fillStyle = 'rgba(8,10,16,0.85)'; ctx.fillRect(0, 0, W, H);
  bigText('SEU SOBREVIVENTE', W / 2, 10, 2, '#d8d0a0');
  const c = state.create;
  ptext(ctx, 'PROFISSAO  (SETAS)', 20, 34, '#f0d040');
  PROFS.forEach((pr, k) => { const y = 46 + k * 18; if (k === c.prof) prect(ctx, 16, y - 3, 190, 16, '#3a3420'); ptext(ctx, `${pr.n} (${pr.pts} PONTOS)`, 22, y, k === c.prof ? '#f0d040' : '#f0ead8'); ptext(ctx, pr.d, 22, y + 7, '#9aa2b0'); hitRect(16, y - 3, 190, 16, () => { c.prof = k; }); });
  ptext(ctx, `VANTAGENS ${traitCount(true)}/${MAX_GOOD}  DESVANTAGENS ${traitCount(false)}/${MAX_BAD}  (TECLAS 1-0)`, 230, 34, '#f0d040');
  TRAITS.forEach((t, k) => { const y = 46 + k * 14, on = c.traits.has(t.id); if (on) prect(ctx, 226, y - 3, 240, 13, '#2a3a2a'); ptext(ctx, `${(k + 1) % 10} ${on ? '[X]' : '[ ]'} ${t.n} (${t.c > 0 ? '+' : ''}${t.c})`, 230, y, t.c < 0 ? '#9ad08a' : '#ff9080'); ptext(ctx, t.d, 230, y + 6, '#7a808c'); hitRect(226, y - 3, 240, 13, () => toggleTrait(t.id)); });
  const pts = createPoints();
  ptext(ctx, `PONTOS SOBRANDO: ${pts}`, 22, 150, pts >= 0 ? '#9ad08a' : '#ff6060');
  ptext(ctx, 'VANTAGENS GASTAM PONTOS, DESVANTAGENS DAO PONTOS.', 22, 160, '#9aa2b0'); if (state.createMsg) ptext(ctx, state.createMsg, 22, 140, '#ff9080');
  ptext(ctx, 'VOCE COMECA SO DE CUECA, SEM NADA.', 22, 170, '#9aa2b0');
  ptext(ctx, 'HABILIDADES COMECAM NO NIVEL 1: SO LIVROS E TV ENSINAM.', 22, 180, '#9aa2b0');
  const im = humanImg({ skin: '#e2a57c', hair: '#4a3020', under: '#eef0f2', pose: 'idle' }); ctx.drawImage(im.c, 70, 196, 40, 56);
  const bx = W / 2 + 10, by = H - 26; prect(ctx, bx, by, 150, 18, pts >= 0 ? '#5a4a18' : '#4a1818'); prect(ctx, bx, by, 150, 1, '#f0d040'); prect(ctx, bx, by + 17, 150, 1, '#0b0d12');
  ptext(ctx, pts >= 0 ? 'COMECAR (ENTER OU TOQUE)' : 'TIRE UMA VANTAGEM', bx + 75, by + 7, pts >= 0 ? '#f0d040' : '#ff6060', '#0b0d12', 1, 'center');
  hitRect(bx, by, 150, 18, () => { state.startTap = true; });
}
function traitCount(good) { const c = state.create; return TRAITS.filter(t => c.traits.has(t.id) && (t.c < 0) === good).length; }
function toggleTrait(id) {
  const c = state.create, t = TRAITS.find(x => x.id === id), good = t.c < 0;
  state.createMsg = '';
  if (c.traits.has(id)) { if (!good && createPoints() - t.c < 0) { state.createMsg = 'TIRE UMA VANTAGEM ANTES: OS PONTOS FICARIAM NEGATIVOS'; return; } c.traits.delete(id); return; }
  if (traitCount(good) >= (good ? MAX_GOOD : MAX_BAD)) { state.createMsg = good ? `NO MAXIMO ${MAX_GOOD} VANTAGENS` : `NO MAXIMO ${MAX_BAD} DESVANTAGENS`; return; }
  if (good && createPoints() + t.c < 0) { state.createMsg = 'PONTOS INSUFICIENTES: PEGUE UMA DESVANTAGEM'; return; }
  c.traits.add(id);
}
function createPoints() { const c = state.create; let pts = PROFS[c.prof].pts || 0; for (const t of TRAITS) if (c.traits.has(t.id)) pts += t.c; return pts; }
function drawOver() {
  drawWorld(); lighting();
  const k = Math.min(1, (state.deathT || 0) / 2); ctx.fillStyle = `rgba(40,0,0,${0.55 * k + 0.2})`; ctx.fillRect(0, 0, W, H);
  bigText('VOCE MORREU', W / 2, 50, 4, '#ff5050');
  ptext(ctx, `CAUSA: ${state.cause}`, W / 2, 90, '#f0ead8', '#0b0d12', 1, 'center');
  ptext(ctx, state.gained, W / 2, 104, '#f0d040', '#0b0d12', 2, 'center');
  ptext(ctx, `ZUMBIS MORTOS: ${state.killed}`, W / 2, 126, '#c8ccd6', '#0b0d12', 1, 'center');
  const sk = SKILLS.filter(s => state.p.skills[s] > 1).map(s => `${SKILL_NAME[s]} ${state.p.skills[s]}`).join(', ');
  ptext(ctx, sk ? 'APRENDEU: ' + sk : 'NAO APRENDEU NENHUM OFICIO', W / 2, 136, '#9fd3f0', '#0b0d12', 1, 'center');
  if (state.record) ptext(ctx, `RECORDE: ${Math.floor(state.record / 24)} DIAS E ${Math.floor(state.record % 24)} HORAS`, W / 2, 150, '#e8c070', '#0b0d12', 1, 'center');
  ptext(ctx, TOUCH ? 'TOQUE PARA RECOMECAR DO ZERO' : 'R OU ENTER PARA RECOMECAR DO ZERO', W / 2, 180, '#f0ead8', '#0b0d12', 1, 'center');
}
function drawFigures() {
  ctx.fillStyle = '#1c1f27'; ctx.fillRect(0, 0, W, H);
  ptext(ctx, 'OS ULTIMOS DIAS - FIGURAS', 8, 6, '#f0ead8');
  const f = Math.floor(clock.now() * 4) % 4;
  const list = [
    ['VOCE (CUECA)', humanImg({ skin: '#e2a57c', hair: '#4a3020', under: '#eef0f2', pose: 'walk', f }).c],
    ['VESTIDO', humanImg({ skin: '#e2a57c', hair: '#4a3020', top: '#3f7f8c', pants: '#3b4f86', shoes: '#6b4428', pose: 'idle', weapon: 'machado' }).c],
    ['BOMBEIRO', humanImg({ skin: '#e2a57c', hair: '#4a3020', jacket: '#3a3a42', pants: '#3a3a42', shoes: '#6b4428', hat: '#e8c040', pose: 'idle' }).c],
    ['ZUMBI COMUM', humanImg(Object.assign(zombieLook({ outfit: 0, kind: 'comum' }), { pose: 'walk', f })).c],
    ['ZUMBI GORDO', humanImg(Object.assign(zombieLook({ outfit: 3, kind: 'gordo' }), { pose: 'walk', f })).c],
    ['CORREDOR', humanImg(Object.assign(zombieLook({ outfit: 1, kind: 'corredor' }), { pose: 'run', f })).c],
    ['RASTEJANTE', crawlerImg(zombieLook({ outfit: 2, kind: 'rastejante' }), f % 2).c],
    ['GALINHA', chickenImg(f % 2, false).c],
    ['VACA', cowImg(f, false).c],
  ];
  list.forEach(([n, c], k) => { const col = k % 5, row = Math.floor(k / 5), x = 14 + col * 94, y = 22 + row * 120, sc = 3, bw = c.width * sc, bh = c.height * sc; prect(ctx, x - 4, y, 88, 108, '#252934'); ctx.drawImage(c, Math.round(x + 40 - bw / 2), Math.round(y + 92 - bh), bw, bh); ptext(ctx, n, x + 40, y + 98, '#c8ccd6', '#0b0d12', 1, 'center'); });
  const poses = [['LENDO', 'read'], ['ENFAIXANDO', 'bandage'], ['VENDO TV', 'sit'], ['VASCULHANDO', 'search']];
  poses.forEach(([n, ps], k) => { const c = humanImg({ skin: '#e2a57c', hair: '#4a3020', top: '#3f7f8c', pants: '#3b4f86', shoes: '#6b4428', pose: ps, f, back: ps === 'sit' }).c; const x = 14 + 4 * 94 + (k % 2) * 46, y = 142 + Math.floor(k / 2) * 60; prect(ctx, x - 4, y, 44, 56, '#252934'); ctx.drawImage(c, x + 2, y + 2, c.width * 2, c.height * 2); ptext(ctx, n.slice(0, 10), x + 18, y + 50, '#c8ccd6', '#0b0d12', 1, 'center'); });
}

// ---- sound: all made in code ---------------------------------------------------------------------
let noiseBuf = null;
function noiseBurst(dur, vol, type = 'lowpass', freq = 800) {
  if (!audio || muted) return;
  const ac = audio.ac; if (!noiseBuf) { noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const d = noiseBuf.getChannelData(0); let s = 12345; for (let i = 0; i < d.length; i++) { s = (s * 16807) % 2147483647; d[i] = (s / 2147483647) * 2 - 1; } }
  const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(), t = ac.currentTime;
  src.buffer = noiseBuf; f.type = type; f.frequency.value = freq; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f).connect(g).connect(audio.out); src.start(t); src.stop(t + dur);
}
function sweep(f0, f1, dur, type, vol) { if (!audio || muted) return; const ac = audio.ac, t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); o.connect(g).connect(audio.out); o.start(t); o.stop(t + dur); }
function sfx(name, dist = 0) {
  if (!audio || muted) return;
  const v = Math.max(0, 1 - dist / 22); if (v <= 0.02) return;
  switch (name) {
    case 'swing': noiseBurst(0.09, 0.12 * v, 'highpass', 2000); break;
    case 'hit': tone(90, 0.09, 'square', 0.22 * v); noiseBurst(0.08, 0.2 * v, 'lowpass', 600); break;
    case 'kill': sweep(120, 40, 0.3, 'sawtooth', 0.2 * v); noiseBurst(0.2, 0.2 * v, 'lowpass', 300); break;
    case 'hurt': sweep(320, 120, 0.25, 'sawtooth', 0.25); break;
    case 'groan': sweep(80 + Math.floor(dist * 3) % 20, 60, 0.8, 'sawtooth', 0.07 * v); break;
    case 'alert': sweep(140, 90, 0.4, 'sawtooth', 0.12 * v); break;
    case 'bash': noiseBurst(0.18, 0.3 * v, 'lowpass', 220); tone(60, 0.12, 'square', 0.12 * v); break;
    case 'glass': noiseBurst(0.35, 0.3 * v, 'highpass', 3000); tone(2400, 0.08, 'triangle', 0.1 * v); tone(3100, 0.1, 'triangle', 0.08 * v); break;
    case 'break': noiseBurst(0.25, 0.3 * v, 'bandpass', 500); break;
    case 'door': tone(220, 0.05, 'square', 0.08); tone(160, 0.06, 'square', 0.06); break;
    case 'search': noiseBurst(0.3, 0.06, 'bandpass', 1200); break;
    case 'open': tone(440, 0.04, 'triangle', 0.08); break;
    case 'pick': tone(660, 0.05, 'triangle', 0.1); tone(880, 0.05, 'triangle', 0.06); break;
    case 'eat': noiseBurst(0.12, 0.08, 'bandpass', 900); break;
    case 'drink': sweep(400, 700, 0.18, 'sine', 0.08); break;
    case 'page': noiseBurst(0.12, 0.06, 'highpass', 4000); break;
    case 'learn': tone(523, 0.12, 'triangle', 0.12); tone(659, 0.12, 'triangle', 0.12, 0.11); tone(784, 0.2, 'triangle', 0.12, 0.22); break;
    case 'radio': noiseBurst(0.5, 0.08, 'bandpass', 1500); tone(880, 0.06, 'square', 0.04); break;
    case 'tv': noiseBurst(0.2, 0.05, 'highpass', 2500); break;
    case 'gun': noiseBurst(0.3, 0.6, 'lowpass', 1800); tone(70, 0.2, 'square', 0.3); break;
    case 'chop': tone(140, 0.08, 'square', 0.18 * v); noiseBurst(0.1, 0.2 * v, 'bandpass', 700); break;
    case 'fall': noiseBurst(0.6, 0.3, 'lowpass', 200); break;
    case 'hammer': tone(900, 0.04, 'square', 0.1); noiseBurst(0.05, 0.15, 'highpass', 2000); break;
    case 'saw': noiseBurst(0.3, 0.08, 'bandpass', 2500); break;
    case 'fire': noiseBurst(0.4, 0.08, 'lowpass', 500); break;
    case 'power': sweep(300, 60, 0.6, 'sawtooth', 0.15); break;
    case 'horde': sweep(70, 50, 1.4, 'sawtooth', 0.12); sweep(95, 60, 1.4, 'sawtooth', 0.08); break;
    case 'death': sweep(200, 30, 1.6, 'sawtooth', 0.25); break;
    case 'miss': noiseBurst(0.08, 0.08 * v, 'highpass', 1500); break;
    case 'cloth': noiseBurst(0.15, 0.06, 'bandpass', 1800); break;
    case 'equip': tone(300, 0.05, 'square', 0.08); break;
    case 'craft': tone(520, 0.06, 'triangle', 0.08); break;
    case 'click': tone(1200, 0.02, 'square', 0.05); break;
    case 'break2': break;
  }
}
