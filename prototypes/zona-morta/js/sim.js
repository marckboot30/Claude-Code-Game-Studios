// PROTOTYPE - NOT FOR PRODUCTION
// Question: vasculhar a cidade só de cueca, sob a pressão do barulho, do frio e da fome, e montar uma base barricada é tenso e divertido por 20 minutos?
// Date: 2026-11-17
// The simulation: the survivor, zombies, noise, needs, cold, wounds, learning, power and farms.
// Everything runs on the fixed step.
'use strict';

const HOURS = () => tune.day_seconds / 24; // real seconds per game hour
function hourOf(t) { return (tune.start_hour + t) % 24; }
function dayOf(t) { return Math.floor((tune.start_hour + t) / 24) + 1; }
function clockStr(t) { const h = hourOf(t), hh = Math.floor(h), mm = Math.floor((h - hh) * 60 / 10) * 10; return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0'); }
function powerOn() { const d = dayOf(state.time), h = hourOf(state.time); return d < tune.power_off_day || (d === tune.power_off_day && h < 8); }
function waterOn() { const d = dayOf(state.time), h = hourOf(state.time); return d < tune.water_off_day || (d === tune.water_off_day && h < 8); }
function ambientTemp() { const h = hourOf(state.time), d = dayOf(state.time); return tune.temp_night + (tune.temp_day - tune.temp_night) * (0.5 - 0.5 * Math.cos(2 * Math.PI * (h - 4) / 24)) - tune.temp_drop_day * (d - 1); }
function daylight() { const h = hourOf(state.time); if (h >= 7 && h < 18) return 1; if (h >= 18 && h < 20.5) return 1 - (h - 18) / 2.5; if (h >= 5 && h < 7) return (h - 5) / 2; return 0; }
function isNight() { return daylight() < 0.35; }

function msg(s, col = '#f0ead8') { state.msgs.push({ s, col, t: 8 }); if (state.msgs.length > 6) state.msgs.shift(); events.push({ msg: s }); }
function hasTrait(t) { return state.traits.has(t); }
function profMod(k) { return (state.prof.mod && state.prof.mod[k]) || 1; }

// ---- the survivor --------------------------------------------------------------------------------
function newPlayer() {
  const s = world.start;
  const p = { x: s.i, y: s.j, dir: [1, 1], f: 0, ft: 0, moving: false, run: false, crouch: false,
    hp: 100, hunger: 12, thirst: 15, fatigue: 10, cold: tune.start_cold, stamina: 100, panic: 0, pain: 0, sick: 0, analg: 0,
    inv: [], wear: { cabeca: null, tronco: null, casaco: null, pernas: newItem('cueca'), pes: null, maos: null, costas: null }, hand: null, light: false,
    wounds: [], infected: false, infT: 0, skills: {}, action: null, swing: 0, swingHit: false, cd: 0, shoveCd: 0, sleeping: false, hurt: 0, lastTile: -1, noiseT: 0 };
  for (const s2 of SKILLS) p.skills[s2] = 1;
  return p;
}
function invWeight(p) { let w = 0; for (const it of p.inv) w += itemDef(it.id).w || 0; if (p.hand) w += itemDef(p.hand.id).w || 0; return Math.round(w * 10) / 10; }
function capacity(p) { let c = tune.carry_base; if (p.wear.costas) c += itemDef(p.wear.costas.id).cap || 0; if (hasTrait('forte')) c += 4; if (hasTrait('fraco')) c -= 3; return c; }
function warmth(p) { let w = 0; for (const s of SLOTS) if (p.wear[s]) w += itemDef(p.wear[s].id).warm || 0; return w; }
function protOf(p, part) { let pr = 0; for (const s of PART_SLOTS[part]) if (p.wear[s]) pr = Math.max(pr, itemDef(p.wear[s].id).prot || 0) + (pr ? 10 : 0); return Math.min(95, pr); }
function countItem(p, id) { let n = 0; for (const it of p.inv) if (it.id === id) n++; if (p.hand && p.hand.id === id) n++; return n; }
function hasTool(p, id) { return countItem(p, id) > 0; }
function takeItems(p, id, n) { for (let k = 0; k < n; k++) { const i = p.inv.findIndex(it => it.id === id); if (i >= 0) p.inv.splice(i, 1); else if (p.hand && p.hand.id === id) p.hand = null; } }
function giveItem(p, id) { p.inv.push(newItem(id)); }
function tileOf(e) { return [Math.floor(e.x), Math.floor(e.y)]; }
function buildingAt(x, y) { const i = Math.floor(x), j = Math.floor(y); if (!inMap(i, j)) return null; const b = world.bld[idx(i, j)]; return b >= 0 ? world.buildings[b] : null; }

// ---- walls and collision -------------------------------------------------------------------------
function edgeBlocks(e) { if (!e) return false; if (e.door) return !(e.open || e.broken) || e.barr > 0; return true; }
function tileSolid(i, j) { if (!inMap(i, j)) return true; const f = world.furn[idx(i, j)]; if (f && f.solid) return true; return world.floor[idx(i, j)] === 'agua'; }
function pushOut(e, ax, ay, bx, by, r) {
  const vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy;
  let t = l2 ? ((e.x - ax) * vx + (e.y - ay) * vy) / l2 : 0; t = Math.max(0, Math.min(1, t));
  const cx = ax + vx * t, cy = ay + vy * t, dx = e.x - cx, dy = e.y - cy, d = Math.hypot(dx, dy);
  if (d < r) { if (d < 1e-6) { e.x += 0.01; return; } e.x = cx + dx / d * r; e.y = cy + dy / d * r; }
}
function moveBody(e, dx, dy, r) {
  e.x += dx; e.y += dy;
  const ci = Math.floor(e.x), cj = Math.floor(e.y);
  for (let it = 0; it < 2; it++) for (let i = ci - 1; i <= ci + 1; i++) for (let j = cj - 1; j <= cj + 1; j++) {
    if (!inMap(i, j)) { pushOut(e, i, j, i + 1, j, r); pushOut(e, i, j + 1, i + 1, j + 1, r); pushOut(e, i, j, i, j + 1, r); pushOut(e, i + 1, j, i + 1, j + 1, r); continue; }
    if (edgeBlocks(getV(i, j))) pushOut(e, i, j, i, j + 1, r);
    if (edgeBlocks(getH(i, j))) pushOut(e, i, j, i + 1, j, r);
    if (tileSolid(i, j) && !(i === ci && j === cj && e.inSolid)) { pushOut(e, i, j, i + 1, j, r); pushOut(e, i, j + 1, i + 1, j + 1, r); pushOut(e, i, j, i, j + 1, r); pushOut(e, i + 1, j, i + 1, j + 1, r); }
  }
  e.x = Math.max(0.3, Math.min(N - 0.3, e.x)); e.y = Math.max(0.3, Math.min(N - 0.3, e.y));
}
// sight: walls and closed doors block; glass and fences do not; three planks do
function sightBlocks(e) { if (!e) return false; if (e.kind === 'fence') return false; if (e.door) return !(e.open || e.broken); if (e.win) return e.barr >= 3; return true; }
function los(ax, ay, bx, by) {
  const d = Math.hypot(bx - ax, by - ay), n = Math.ceil(d / 0.2);
  let pi = Math.floor(ax), pj = Math.floor(ay);
  for (let k = 1; k <= n; k++) {
    const x = ax + (bx - ax) * k / n, y = ay + (by - ay) * k / n, i = Math.floor(x), j = Math.floor(y);
    if (i !== pi) { if (sightBlocks(getV(Math.max(i, pi), pj))) return false; pi = i; }
    if (j !== pj) { if (sightBlocks(getH(pi, Math.max(j, pj)))) return false; pj = j; }
  }
  return true;
}
// the edge crossed going from tile (i,j) to a 4-neighbour
function edgeBetween(i, j, ni, nj) { if (ni > i) return getV(ni, j); if (ni < i) return getV(i, j); if (nj > j) return getH(i, nj); return getH(i, j); }

// ---- noise -----------------------------------------------------------------------------------------
function noise(x, y, r, fromPlayer = true) {
  if (fromPlayer && hasTrait('desastrado')) r *= 1.3;
  state.noises.push({ x, y, r, t: 0.7 });
  for (const z of world.zombies) {
    if (z.dead || z.state === 'chase') continue;
    if (Math.abs(z.x - x) > r || Math.abs(z.y - y) > r) continue;
    if (Math.hypot(z.x - x, z.y - y) <= r) { z.state = 'invest'; z.tx = x + (rng() - 0.5) * 1.5; z.ty = y + (rng() - 0.5) * 1.5; z.stuck = 0; z.give = 14; }
  }
}

// ---- wounds ----------------------------------------------------------------------------------------
function addWound(part, type) {
  const p = state.p;
  p.wounds.push({ part, type, band: false, heal: 0, q: 1 });
  const ch = type === 'mordida' ? 1 : type === 'corte' ? tune.infect_cut : tune.infect_scratch;
  if (!p.infected && rng() < ch) { p.infected = true; p.infT = 0; }
  msg(`${PART_NAME[part]}: ${type === 'mordida' ? 'MORDIDA!' : type === 'corte' ? 'corte fundo' : 'arranhão'}`, type === 'mordida' ? '#ff5050' : '#f0a070');
  sfx('hurt');
}
function hurtPlayer(z) {
  const p = state.p;
  const crawl = ZKINDS[z.kind].crawl;
  const part = crawl ? (rng() < 0.5 ? 'pernas' : 'pes') : wpick([['cabeca', 0.1], ['tronco', 0.25], ['bracos', 0.3], ['maos', 0.15], ['pernas', 0.12], ['pes', 0.08]]);
  p.hp -= tune.zombie_hit_dmg; p.hurt = 0.4; p.panic = Math.min(100, p.panic + 25);
  if (p.action) cancelAction();
  if (p.sleeping) wake('Você acordou com um zumbi em cima!');
  let pr = protOf(p, part); if (hasTrait('resist')) pr += 15;
  if (rng() * 100 < pr * 0.85) { msg(`A roupa protegeu ${PART_NAME[part].toLowerCase()}.`, '#9ad08a'); sfx('cloth'); return; }
  const type = wpick([['arranhao', tune.wound_scratch_w], ['corte', tune.wound_cut_w], ['mordida', tune.wound_bite_w]]);
  addWound(part, type);
  if (p.hp <= 0) die(type === 'mordida' ? 'Devorado por zumbis' : 'Ferimentos de zumbi');
}

// ---- actions (a timed task with a bar above the head) ------------------------------------------
function startAction(a) { const p = state.p; if (p.action) cancelAction(); a.t = 0; p.action = a; }
function cancelAction(silent) { const p = state.p; if (!p.action) return; if (p.action.onCancel) p.action.onCancel(); if (!silent && p.action.label) msg(`${p.action.label}: interrompido.`, '#a0a6b0'); p.action = null; }
function wake(why) { const p = state.p; p.sleeping = false; if (p.action && p.action.kind === 'sleep') p.action = null; if (why) msg(why, '#ff8060'); }

// ---- light for reading -----------------------------------------------------------------------------
function lightHere(x, y) {
  if (daylight() > 0.5) return true;
  const p = state.p;
  if (p.light && hasTool(p, 'lanterna')) return true;
  for (const f of state.fires) if (f.fuel > 0 && Math.hypot(f.i + 0.5 - x, f.j + 0.5 - y) < 3.2) return true;
  const b = buildingAt(x, y); if (b && b.powered) return true;
  return false;
}
function nearFire(x, y) {
  for (const f of state.fires) if (f.fuel > 0 && Math.hypot(f.i + 0.5 - x, f.j + 0.5 - y) < 2.2) return true;
  for (let i = Math.floor(x) - 1; i <= Math.floor(x) + 1; i++) for (let j = Math.floor(y) - 1; j <= Math.floor(y) + 1; j++) { if (!inMap(i, j)) continue; const f = world.furn[idx(i, j)]; if (f && f.t === 'fogao') { const b = world.buildings[f.b]; if (b && b.powered) return true; } }
  return false;
}
function warmFire(x, y) { for (const f of state.fires) if (f.fuel > 0 && Math.hypot(f.i + 0.5 - x, f.j + 0.5 - y) < 3.2) return true; return false; }

// ---- the survivor each step ----------------------------------------------------------------------
function updatePlayer(dt) {
  const p = state.p, hrs = dt / HOURS() * (p.sleeping ? tune.sleep_speed : 1);
  // input: movement in screen directions
  let mx = 0, my = 0;
  const uiTakesArrows = !!state.ui.panel || state.ui.map;
  if (down.has('KeyW') || (!uiTakesArrows && down.has('ArrowUp'))) { mx -= 1; my -= 1; }
  if (down.has('KeyS') || (!uiTakesArrows && down.has('ArrowDown'))) { mx += 1; my += 1; }
  if (down.has('KeyA') || (!uiTakesArrows && down.has('ArrowLeft'))) { mx -= 1; my += 1; }
  if (down.has('KeyD') || (!uiTakesArrows && down.has('ArrowRight'))) { mx += 1; my -= 1; }
  if (state.ui.map) { mx = 0; my = 0; }
  if (pressed('KeyC')) { p.crouch = !p.crouch; msg(p.crouch ? 'Agachado: silencioso e mais lento.' : 'De pé.', '#a0a6b0'); }
  const len = Math.hypot(mx, my);
  p.moving = len > 0 && !p.sleeping;
  if (p.moving && p.action && p.action.kind !== 'chop') cancelAction();
  if (p.moving && p.action && p.action.kind === 'chop') cancelAction();
  const enc = Math.max(0.35, Math.min(1, capacity(p) / Math.max(0.1, invWeight(p))));
  const wantRun = (down.has('ShiftLeft') || down.has('ShiftRight')) && p.stamina > 5 && !p.crouch;
  p.run = p.moving && wantRun;
  let spd = p.crouch ? tune.crouch_speed : p.run ? tune.run_speed : tune.walk_speed;
  spd *= enc; if (p.wounds.some(w => (w.part === 'pernas' || w.part === 'pes') && !w.band && w.type !== 'arranhao')) spd *= 0.8;
  if (p.moving) {
    const nx = mx / len, ny = my / len; p.dir = [nx, ny];
    moveBody(p, nx * spd * dt, ny * spd * dt, 0.24);
    p.ft += dt * spd * 2.2; p.f = 1 + (Math.floor(p.ft) % 4); if (p.f === 4) p.f = 0;
    if (p.run) { p.stamina = Math.max(0, p.stamina - tune.stamina_run * dt); }
    p.noiseT -= dt;
    if (p.noiseT <= 0) { p.noiseT = 0.5; const r = p.run ? tune.noise_run : p.crouch ? 0 : tune.noise_walk; if (r > 0) noise(p.x, p.y, r * (hasTrait('pesLeves') ? 0.6 : 1)); }
    // glass on the floor
    const ti = idx(Math.floor(p.x), Math.floor(p.y));
    if (ti !== p.lastTile) { p.lastTile = ti; if (world.glass.has(ti) && !p.wear.pes && rng() < 0.5) { addWound('pes', 'corte'); msg('Você pisou em vidro descalço!', '#ff8060'); } }
  } else { p.f = 0; p.ft = 0; }
  if (!p.run) p.stamina = Math.min(100, p.stamina + tune.stamina_regen * dt * (p.fatigue > 85 ? 0.4 : 1) * (state.prof.mod.folego || 1));
  // the mouse or the last move sets the facing; the aim follows the mouse
  if (state.mouseMoved && !p.moving) { const w = screenToWorld(state.mx, state.my); const dx = w[0] - p.x, dy = w[1] - p.y, l = Math.hypot(dx, dy); if (l > 0.2) p.dir = [dx / l, dy / l]; }
  // attack and shove
  p.cd -= dt; p.shoveCd -= dt;
  if (p.swing > 0) { p.swing -= dt; if (!p.swingHit && p.swing < 0.18) { p.swingHit = true; resolveSwing(); } }
  if ((state.click || pressed('Space')) && !p.sleeping && !state.ui.map && !state.ui.build && p.cd <= 0 && !(state.ui.panel && state.click)) {
    if (state.click && state.clickWorld) { const dx = state.clickWorld[0] - p.x, dy = state.clickWorld[1] - p.y, l = Math.hypot(dx, dy); if (l > 0.05) p.dir = [dx / l, dy / l]; }
    startSwing();
  }
  if (pressed('KeyQ') && p.shoveCd <= 0 && p.stamina > 5) shove();
  // the timed action
  if (p.action) {
    const a = p.action; a.t += a.realTime ? dt : dt;
    if (a.tick) a.tick(dt);
    if (p.action === a && a.dur && a.t >= a.dur) { p.action = null; a.done(); }
  }
  // needs
  const fm = (hasTrait('fominha') ? 1.3 : 1) * profMod('fome');
  p.hunger = Math.min(100, p.hunger + tune.hunger_rate * hrs * fm * (p.sleeping ? 0.5 : 1));
  p.thirst = Math.min(100, p.thirst + tune.thirst_rate * hrs * (hasTrait('fominha') ? 1.3 : 1) * (p.sleeping ? 0.5 : 1));
  if (p.sleeping) p.fatigue = Math.max(0, p.fatigue - 12 * hrs); else p.fatigue = Math.min(100, p.fatigue + tune.fatigue_rate * hrs * (p.run ? 1.6 : 1));
  if (p.sleeping && p.fatigue <= 0) { wake(null); msg('Você acordou descansado.', '#9ad08a'); }
  // cold
  const inside = !!buildingAt(p.x, p.y);
  const felt = ambientTemp() - (hasTrait('friorento') ? 3 : 0) + warmth(p) * tune.warmth_per_point + (inside ? tune.indoor_bonus : 0) + (warmFire(p.x, p.y) ? tune.fire_bonus : 0) + (p.sleeping ? 4 : 0);
  state.felt = felt;
  const short = tune.comfort_temp - felt;
  if (short > 0) p.cold = Math.min(100, p.cold + short * tune.chill_rate * hrs); else p.cold = Math.max(0, p.cold - tune.warm_rate * hrs);
  // damage over time
  let dmg = 0, cause = '';
  if (p.hunger >= 90) { dmg += tune.starve_dmg * hrs; cause = 'Fome'; }
  if (p.thirst >= 90) { dmg += tune.thirst_dmg * hrs; cause = 'Sede'; }
  if (p.cold >= 70) { dmg += tune.cold_dmg * hrs * (p.cold - 60) / 40; cause = 'Hipotermia'; }
  for (const w of p.wounds) {
    if (!w.band && w.type !== 'arranhao') { dmg += tune.bleed_dmg * hrs; cause = 'Sangramento'; }
    else if (!w.band) dmg += tune.scratch_dmg * hrs;
    w.heal += hrs / tune.heal_hours * (w.band ? 1 : (w.type === 'arranhao' ? 0.5 : 0)) * (1 + 0.2 * (p.skills.socorros - 1)) * profMod('cura') * w.q;
  }
  const healed = p.wounds.filter(w => w.heal >= 1); if (healed.length) { p.wounds = p.wounds.filter(w => w.heal < 1); msg('Uma ferida fechou.', '#9ad08a'); }
  if (p.infected) { p.infT += hrs; if (p.infT > tune.infect_drain_h) { dmg += tune.infect_dmg * hrs; cause = 'Infecção zumbi'; } }
  if (p.sick > 0) { p.sick -= hrs; dmg += 2 * hrs; if (!cause) cause = 'Doença'; }
  p.hp -= dmg;
  if (dmg === 0 && p.hunger < 60 && p.thirst < 60 && p.cold < 30 && !p.infected) p.hp = Math.min(100, p.hp + 1.5 * hrs * (p.sleeping ? 3 : 1));
  p.pain = Math.min(100, p.wounds.reduce((s, w) => s + (w.type === 'mordida' ? 30 : w.type === 'corte' ? 18 : 6) * (1 - w.heal * 0.6), 0) * (p.analg > 0 ? 0.3 : 1));
  if (p.analg > 0) p.analg -= hrs;
  p.hurt = Math.max(0, p.hurt - dt);
  // panic
  let seen = 0; for (const z of state.near) if (!z.dead && Math.hypot(z.x - p.x, z.y - p.y) < 6 && z.visible) seen++;
  p.panic = Math.max(0, Math.min(100, p.panic + (seen ? seen * 10 * dt : -7 * dt)));
  if (p.hp <= 0) die(cause || 'Ferimentos');
}
function die(cause) {
  if (state.dead) return; state.dead = true; state.cause = cause; state.p.action = null;
  state.gained = `Você sobreviveu ${dayOf(state.time) - 1} dias e ${Math.floor(hourOf(state.time))} horas`;
  try { const best = +(localStorage.getItem('zonaMortaRecord') || 0); if (state.time > best) localStorage.setItem('zonaMortaRecord', String(state.time)); state.record = Math.max(best, state.time); } catch (e) { state.record = state.time; }
  sfx('death'); events.push({ dead: cause });
  state.deathT = 0; scene = 'over';
}

// ---- fighting --------------------------------------------------------------------------------------
function weaponDef(p) { return p.hand ? itemDef(p.hand.id) : ITEMS.punho; }
function startSwing() {
  const p = state.p, w = weaponDef(p);
  if (p.action) cancelAction(true);
  if (w.gun) { fireGun(); return; }
  if (p.stamina < 3) { msg('Sem fôlego!', '#a0a6b0'); p.cd = 0.4; return; }
  p.swing = 0.32; p.swingHit = false; p.cd = w.cd * (p.stamina < 20 ? 1.4 : 1); p.stamina = Math.max(0, p.stamina - tune.stamina_swing / (state.prof.mod.folego || 1));
  sfx('swing');
}
function resolveSwing() {
  const p = state.p, w = weaponDef(p);
  let best = null, bd = 1e9;
  for (const z of state.near) {
    if (z.dead) continue;
    const dx = z.x - p.x, dy = z.y - p.y, d = Math.hypot(dx, dy);
    if (d > w.range + 0.25) continue;
    const dot = (dx * p.dir[0] + dy * p.dir[1]) / (d || 1);
    if (dot < 0.45 && d > 0.45) continue;
    if (!los(p.x, p.y, z.x, z.y)) continue;
    if (d < bd) { bd = d; best = z; }
  }
  // a tree in front with an axe chops it
  if (!best) { noise(p.x, p.y, 2); return; }
  let dmg = w.dmg * (hasTrait('forte') ? 1.25 : 1) * (hasTrait('fraco') ? 0.75 : 1) * (p.stamina < 20 ? 0.6 : 1) * (best.down > 0 ? 1.8 : 1) * (0.85 + rng() * 0.3);
  hitZombie(best, dmg, w.push);
  noise(p.x, p.y, w.noise);
  if (p.hand && p.hand.dur != null) { p.hand.dur -= 1; if (p.hand.dur <= 0) { msg(`${itemDef(p.hand.id).n} quebrou!`, '#ff8060'); p.hand = null; sfx('break'); } }
}
function hitZombie(z, dmg, push) {
  const p = state.p;
  z.hp -= dmg; z.flash = 0.15; sfx('hit');
  const dx = z.x - p.x, dy = z.y - p.y, d = Math.hypot(dx, dy) || 1;
  if (!ZKINDS[z.kind].crawl) moveBody(z, dx / d * push * 0.35, dy / d * push * 0.35, 0.22);
  if (z.down <= 0 && !ZKINDS[z.kind].crawl && rng() < push * 0.3) z.down = 1.8;
  z.atk = 0; z.state = 'chase';
  state.decals.push({ x: z.x + (rng() - 0.5) * 0.4, y: z.y + (rng() - 0.5) * 0.4, r: 1 + Math.floor(rng() * 2) });
  if (z.hp <= 0) { z.dead = true; z.deadT = 0; state.killed++; sfx('kill'); state.decals.push({ x: z.x, y: z.y, r: 3 }); }
}
function fireGun() {
  const p = state.p;
  if (!p.hand.balas) { msg('Sem munição. Abra uma caixa de munição em CRIAR.', '#ff8060'); p.cd = 0.4; sfx('click'); return; }
  p.hand.balas--; p.cd = itemDef('pistola').cd; p.swing = 0.2; p.swingHit = true; state.muzzle = 0.08;
  sfx('gun'); noise(p.x, p.y, itemDef('pistola').noise);
  let best = null, bt = 1e9;
  for (const z of state.near) {
    if (z.dead) continue; const dx = z.x - p.x, dy = z.y - p.y, t = dx * p.dir[0] + dy * p.dir[1];
    if (t < 0 || t > 10) continue; const off = Math.abs(dx * p.dir[1] - dy * p.dir[0]);
    if (off > 0.45 + 0.1 * (1 - profMod('mira'))) continue; if (!los(p.x, p.y, z.x, z.y)) continue;
    if (t < bt) { bt = t; best = z; }
  }
  const miss = rng() > 0.75 * profMod('mira');
  if (best && !miss) hitZombie(best, 3.5, 0.4);
}
function shove() {
  const p = state.p; p.shoveCd = 0.7; p.stamina -= 8; p.swing = 0.25; p.swingHit = true; sfx('swing');
  for (const z of state.near) {
    if (z.dead) continue; const dx = z.x - p.x, dy = z.y - p.y, d = Math.hypot(dx, dy);
    if (d > 1.05) continue; if ((dx * p.dir[0] + dy * p.dir[1]) / (d || 1) < 0.3) continue;
    moveBody(z, dx / (d || 1) * 0.6, dy / (d || 1) * 0.6, 0.22); z.atk = 0; if (rng() < 0.5 && !ZKINDS[z.kind].crawl) z.down = 1.5;
  }
}

// ---- the zombies' path to you: a cost field around the survivor ---------------------------------
const FR = 22, FS = FR * 2 + 1;
let field = { cx: -999, cy: -999, d: new Float32Array(FS * FS), t: 0 };
function obstacleCost(e) {
  if (!e) return 0;
  if (e.kind === 'fence') return e.door ? (e.open ? 0 : Infinity) : Infinity;
  if (e.door) { if ((e.open || e.broken) && !e.barr) return 0; return 4 + (e.barr || 0) * 3 + (e.broken ? 0 : 3); }
  if (e.win) return 3 + (e.barr || 0) * 3;
  if (e.kind === 'wood') return 6;
  return Infinity;
}
function buildField() {
  const p = state.p, cx = Math.floor(p.x), cy = Math.floor(p.y);
  field.cx = cx; field.cy = cy; const d = field.d; d.fill(Infinity);
  const heap = []; const push = (k, v) => { heap.push([v, k]); let n = heap.length - 1; while (n > 0) { const pa = (n - 1) >> 1; if (heap[pa][0] <= heap[n][0]) break; [heap[pa], heap[n]] = [heap[n], heap[pa]]; n = pa; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let n = 0; for (;;) { const l = 2 * n + 1, r = l + 1; let m = n; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === n) break; [heap[m], heap[n]] = [heap[n], heap[m]]; n = m; } } return top; };
  const k0 = FR * FS + FR; d[k0] = 0; push(k0, 0);
  while (heap.length) {
    const [v, k] = pop(); if (v > d[k]) continue;
    const li = Math.floor(k / FS), lj = k % FS, i = cx - FR + li, j = cy - FR + lj;
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ni = i + a, nj = j + b, nli = li + a, nlj = lj + b;
      if (nli < 0 || nlj < 0 || nli >= FS || nlj >= FS || !inMap(ni, nj)) continue;
      if (tileSolid(ni, nj) && !(ni === cx && nj === cy)) continue;
      const c = obstacleCost(edgeBetween(i, j, ni, nj)); if (c === Infinity) continue;
      const nk = nli * FS + nlj, nv = v + 1 + c;
      if (nv < d[nk]) { d[nk] = nv; push(nk, nv); }
    }
  }
}
function fieldAt(i, j) { const li = i - field.cx + FR, lj = j - field.cy + FR; if (li < 0 || lj < 0 || li >= FS || lj >= FS) return Infinity; return field.d[li * FS + lj]; }

// ---- zombies each step ---------------------------------------------------------------------------
function zSpeed(z) { return tune[ZKINDS[z.kind].speed]; }
function steer(z, tx, ty, spd, dt) {
  const dx = tx - z.x, dy = ty - z.y, d = Math.hypot(dx, dy); if (d < 0.02) return 0;
  const s = Math.min(d, spd * dt); const ox = z.x, oy = z.y;
  moveBody(z, dx / d * s, dy / d * s, 0.22);
  z.dirx = dx / d; z.diry = dy / d; z.moving = true;
  return Math.hypot(z.x - ox, z.y - oy);
}
function bashEdge(z, e, dt) {
  z.bash -= dt; z.moving = false; z.attackPose = true;
  if (z.bash > 0) return;
  z.bash = tune.zombie_bash_cd;
  const ex = e.dir === 'V' ? e.i : e.i + 0.5, ey = e.dir === 'V' ? e.j + 0.5 : e.j;
  noise(ex, ey, tune.noise_bash, false); sfx('bash', Math.hypot(ex - state.p.x, ey - state.p.y));
  if (e.barr > 0) { e.bhp[e.barr - 1] -= tune.zombie_bash; if (e.bhp[e.barr - 1] <= 0) { e.barr--; e.bhp.pop(); sfx('break', Math.hypot(ex - state.p.x, ey - state.p.y)); if (Math.hypot(ex - state.p.x, ey - state.p.y) < 14) msg('Uma tábua da barricada caiu!', '#ff8060'); } return; }
  if (e.win && e.glass === 'ok') { e.ghp -= tune.zombie_bash; if (e.ghp <= 0) breakGlass(e); return; }
  if (e.door) { e.hp -= tune.zombie_bash; if (e.hp <= 0) { e.broken = true; e.open = true; sfx('break', Math.hypot(ex - state.p.x, ey - state.p.y)); if (Math.hypot(ex - state.p.x, ey - state.p.y) < 14) msg('Arrombaram uma porta!', '#ff5050'); } return; }
  if (e.kind === 'wood') { e.hp -= tune.zombie_bash; if (e.hp <= 0) { if (e.dir === 'V') setV(e.i, e.j, null); else setH(e.i, e.j, null); sfx('break'); msg('Uma parede de madeira caiu!', '#ff5050'); } }
}
function breakGlass(e) {
  e.glass = 'broken';
  const ex = e.dir === 'V' ? e.i : e.i + 0.5, ey = e.dir === 'V' ? e.j + 0.5 : e.j;
  noise(ex, ey, tune.noise_glass, false); sfx('glass', Math.hypot(ex - state.p.x, ey - state.p.y));
  const a = e.dir === 'V' ? [[e.i - 1, e.j], [e.i, e.j]] : [[e.i, e.j - 1], [e.i, e.j]];
  for (const [i, j] of a) if (inMap(i, j)) world.glass.add(idx(i, j));
}
function updateZombies(dt) {
  const p = state.p, night = isNight();
  field.t -= dt; if (field.t <= 0 || Math.floor(p.x) !== field.cx || Math.floor(p.y) !== field.cy) { if (field.t <= 0) field.t = 0.45; buildField(); }
  state.near = [];
  const sightBase = (night ? tune.sight_night : tune.sight_day) * (p.crouch ? tune.sight_crouch : 1) * ((night && p.light) ? 1.8 : 1);
  for (const z of world.zombies) {
    if (z.dead) { z.deadT = (z.deadT || 0) + dt; continue; }
    const dx = p.x - z.x, dy = p.y - z.y;
    if (Math.abs(dx) > 34 || Math.abs(dy) > 34) continue;
    state.near.push(z);
    const d = Math.hypot(dx, dy), K = ZKINDS[z.kind];
    z.flash = Math.max(0, (z.flash || 0) - dt); z.moving = false; z.attackPose = false;
    if (z.down > 0) { z.down -= dt; continue; }
    if (z.climb > 0) { z.climb -= dt; if (z.climb <= 0) { z.x = z.cx2; z.y = z.cy2; } continue; }
    // groans
    z.groan -= dt; if (z.groan <= 0) { z.groan = 5 + rng() * 9; if (d < 12) sfx('groan', d); }
    // look
    z.t -= dt;
    if (z.t <= 0) {
      z.t = 0.3 + rng() * 0.1;
      const sight = sightBase * K.sight;
      if (d < sight && !state.dead && los(z.x, z.y, p.x, p.y)) { if (z.state !== 'chase') { z.state = 'chase'; if (d < 9) sfx('alert', d); } z.lost = 0; z.tx = p.x; z.ty = p.y; }
      else if (z.state === 'chase') { z.lost = (z.lost || 0) + 0.35; if (z.lost > 6) { z.state = 'invest'; z.tx = p.x; z.ty = p.y; z.give = 8; } }
    }
    const spd = zSpeed(z) * (K.runner && z.state !== 'chase' ? 0.35 : 1);
    if (z.state === 'chase' || (z.state === 'invest' && Math.hypot(z.tx - p.x, z.ty - p.y) < 3)) {
      // attack when close and nothing between
      if (d < K.reach + 0.12 && los(z.x, z.y, p.x, p.y)) {
        z.dirx = dx / (d || 1); z.diry = dy / (d || 1); z.attackPose = true;
        z.cd -= dt;
        if (z.cd <= 0) { z.atk += dt; if (z.atk >= tune.zombie_windup) { z.atk = 0; z.cd = tune.zombie_attack_cd; if (!state.dead && d < K.reach + 0.3 && rng() < tune.zombie_hit_chance * K.hitRate) hurtPlayer(z); else sfx('miss'); } }
        continue;
      }
      z.atk = 0; if (z.cd > 0) z.cd -= dt;
      const ti = Math.floor(z.x), tj = Math.floor(z.y), here = fieldAt(ti, tj);
      if (here < Infinity && (ti !== Math.floor(p.x) || tj !== Math.floor(p.y))) {
        let bi = ti, bj = tj, bv = here;
        for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const v = fieldAt(ti + a, tj + b); if (v < bv) { const e = edgeBetween(ti, tj, ti + a, tj + b); if (obstacleCost(e) === Infinity) continue; bv = v; bi = ti + a; bj = tj + b; } }
        if (bi !== ti || bj !== tj) {
          const e = edgeBetween(ti, tj, bi, bj), oc = obstacleCost(e);
          if (e && oc > 0) {
            // stand at the obstacle and break or climb it
            const sx = ti + 0.5 + (bi - ti) * 0.28, sy = tj + 0.5 + (bj - tj) * 0.28;
            if (Math.hypot(sx - z.x, sy - z.y) > 0.12) steer(z, sx, sy, spd, dt);
            else if (e.win && e.glass !== 'ok' && !e.barr) { z.climb = 1.6; z.cx2 = bi + 0.5; z.cy2 = bj + 0.5; }
            else bashEdge(z, e, dt);
          } else steer(z, bi + 0.5, bj + 0.5, spd, dt);
        } else steer(z, p.x, p.y, spd, dt);
      } else steer(z, z.state === 'chase' ? p.x : z.tx, z.state === 'chase' ? p.y : z.ty, spd, dt);
    } else if (z.state === 'invest') {
      const moved = steer(z, z.tx, z.ty, spd, dt);
      z.give -= dt; if (Math.hypot(z.tx - z.x, z.ty - z.y) < 0.4 || z.give <= 0 || moved < spd * dt * 0.2) { z.stuck = (z.stuck || 0) + dt; if (z.stuck > 1.5 || z.give <= 0) { z.state = 'idle'; z.stuck = 0; } }
    } else {
      z.wander -= dt;
      if (z.wander <= 0) { z.wander = 3 + rng() * 6; if (rng() < 0.5) { z.tx = z.x + (rng() - 0.5) * 4; z.ty = z.y + (rng() - 0.5) * 4; z.walking = 2 + rng() * 2; } }
      if (z.walking > 0) { z.walking -= dt; steer(z, z.tx, z.ty, spd * 0.5, dt); }
    }
  }
  // keep bodies apart
  const nz = state.near;
  for (let a = 0; a < nz.length; a++) {
    const A = nz[a]; if (A.dead) continue;
    for (let b = a + 1; b < nz.length; b++) { const B = nz[b]; if (B.dead) continue; const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy); if (d < 0.42 && d > 0) { const k = (0.42 - d) / 2 / d; A.x -= dx * k; A.y -= dy * k; B.x += dx * k; B.y += dy * k; } }
    const dx = p.x - A.x, dy = p.y - A.y, d = Math.hypot(dx, dy); if (d < 0.45 && d > 0 && A.down <= 0) { const k = (0.45 - d) / d; moveBody(p, dx * k * 0.5, dy * k * 0.5, 0.24); A.x -= dx * k * 0.5; A.y -= dy * k * 0.5; }
  }
  for (const z of nz) { if (z.moving) { z.ft = (z.ft || 0) + dt * (ZKINDS[z.kind].runner ? 9 : 3.5); z.f = Math.floor(z.ft) % 4; } else z.f = 0; }
  // visible to the survivor?
  for (const z of nz) z.visible = Math.hypot(z.x - p.x, z.y - p.y) < 1.5 || los(p.x, p.y, z.x, z.y);
  // the long dead are cleared away
  if (world.zombies.length > 900) world.zombies = world.zombies.filter(z => !z.dead || z.deadT < 200);
}

// ---- the world's clock: days, the horde, power, radio, farms, fires, generators -----------------
function spawnAway(n, kind, minD, maxD, invest) {
  const p = state.p; let made = 0, tries = 0;
  while (made < n && tries++ < n * 60) {
    const a = rng() * Math.PI * 2, r = minD + rng() * (maxD - minD), x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r;
    const i = Math.floor(x), j = Math.floor(y); if (!inMap(i, j) || tileSolid(i, j)) continue;
    if (world.bld[idx(i, j)] >= 0) continue;
    let k = kind; if (!k) k = (dayOf(state.time) >= tune.runner_day && rng() < tune.runner_chance) ? 'corredor' : rng() < 0.12 ? 'gordo' : rng() < 0.05 ? 'rastejante' : 'comum';
    const z = spawnZombie(x, y, k); if (invest) { z.state = 'invest'; z.tx = p.x; z.ty = p.y; z.give = 40; }
    made++;
  }
  return made;
}
function onHour(h, d) {
  if (h === 6) { const n = spawnAway(tune.zombies_per_day, null, 20, 60, false); if (d > 1) msg(`Amanheceu o dia ${d}. Mais mortos vagam pela cidade.`, '#e8c070'); state.dayMarks.push(d); }
  if (h === 20) { const n = tune.horde_base + tune.horde_per_day * (d - 1); spawnAway(n, null, 18, 26, true); msg('Anoiteceu. Grunhidos se juntam lá fora...', '#ff8060'); sfx('horde'); }
  if (h === 8 && d === tune.power_off_day) { msg('A LUZ ACABOU! A cidade apagou.', '#ff5050'); sfx('power'); }
  if (h === 8 && d === tune.water_off_day) msg('As torneiras secaram.', '#ff8060');
  if (h === 6) for (const pn of world.pens) { const alive = world.animals.filter(a => a.pen === pn && !a.dead); if (pn.kind === 'galinha') for (const a of alive) if (a.hunger < 50 && rng() < tune.egg_chance) addGround(Math.floor(a.x), Math.floor(a.y), newItem('ovo')); }
  // food goes off unless in a powered fridge
  if (h === 0) {
    for (const it of state.p.inv) if (it.age != null) it.age++;
    for (const f of world.furn) { if (!f || !f.loot) continue; const cold = f.t === 'geladeira' && world.buildings[f.b] && world.buildings[f.b].powered; if (!cold) for (const it of f.loot) if (it.age != null) it.age++; }
    for (const g of world.ground.values()) for (const it of g) if (it.age != null) it.age++;
  }
}
function updateWorldClock(dt) {
  const p = state.p, hrs = dt / HOURS() * (p.sleeping ? tune.sleep_speed : 1);
  const before = state.time; state.time += hrs;
  const hb = Math.floor(tune.start_hour + before), ha = Math.floor(tune.start_hour + state.time);
  for (let H = hb + 1; H <= ha; H++) onHour(H % 24, Math.floor(H / 24) + 1);
  // farms
  for (const pn of world.pens) {
    const alive = world.animals.filter(a => a.pen === pn && !a.dead).length, tr = pn.trough;
    const use = alive * tune.animal_eat / 24 * hrs; tr.food = Math.max(0, tr.food - use); tr.water = Math.max(0, tr.water - use);
    for (const a of world.animals) if (a.pen === pn && !a.dead) { if (tr.food <= 0 || tr.water <= 0) { a.hunger = Math.min(100, a.hunger + 8 * hrs); a.hp -= tune.animal_starve * hrs; if (a.hp <= 0) { a.dead = true; if (Math.hypot(a.x - p.x, a.y - p.y) < 20) msg(`Um${a.kind === 'vaca' ? 'a vaca' : 'a galinha'} morreu de fome.`, '#ff8060'); } } else a.hunger = Math.max(0, a.hunger - 10 * hrs); }
  }
  // fires burn down
  for (const f of state.fires) if (f.fuel > 0) { f.fuel -= hrs; if (f.fuel <= 0) { f.fuel = 0; if (Math.hypot(f.i - p.x, f.j - p.y) < 12) msg('A fogueira apagou.', '#a0a6b0'); } }
  // generators
  for (const g of state.gens) if (g.on) { g.fuel -= tune.gen_use * hrs; g.noise -= dt; if (g.noise <= 0) { g.noise = 20; noise(g.i + 0.5, g.j + 0.5, tune.noise_generator, false); } if (g.fuel <= 0) { g.fuel = 0; g.on = false; g.st = ''; msg('O gerador ficou sem gasolina.', '#ff8060'); } }
  // which buildings have power
  state.powerT -= dt;
  if (state.powerT <= 0) {
    state.powerT = 1;
    const global = powerOn();
    for (const b of world.buildings) {
      if (global) { b.powered = true; continue; }
      b.powered = false;
      for (const g of state.gens) if (g.on) { const cx = Math.max(b.x0, Math.min(b.x1, g.i + 0.5)), cy = Math.max(b.y0, Math.min(b.y1, g.j + 0.5)); if (Math.hypot(cx - g.i - 0.5, cy - g.j - 0.5) <= tune.gen_radius) { b.powered = true; break; } }
    }
  }
  // the radio: a line every two game hours to anyone close
  const slot = Math.floor(state.time / 2);
  if (slot !== state.radioSlot) {
    state.radioSlot = slot;
    let best = null; for (const f of state.radios) if (f.st === 'on' && Math.hypot(f.i + 0.5 - p.x, f.j + 0.5 - p.y) < 8) best = f;
    if (best) {
      const d = Math.min(5, dayOf(state.time)), lines = RADIO[d], line = lines[slot % lines.length];
      msg('RÁDIO: ' + line, '#9fd3f0'); state.subs.push({ i: best.i, j: best.j, s: line, t: 7 }); sfx('radio');
    }
  }
  // explore around the survivor
  state.exploreT -= dt; if (state.exploreT <= 0) { state.exploreT = 0.4; explore(p.x, p.y, 13); }
  for (const s of state.subs) s.t -= dt; state.subs = state.subs.filter(s => s.t > 0);
  for (const m of state.msgs) m.t -= dt; state.msgs = state.msgs.filter(m => m.t > 0);
  for (const n of state.noises) n.t -= dt; state.noises = state.noises.filter(n => n.t > 0);
}
function updateAnimals(dt) {
  const p = state.p;
  for (const a of world.animals) {
    if (a.dead || Math.abs(a.x - p.x) > 30 || Math.abs(a.y - p.y) > 30) continue;
    a.t -= dt; if (a.t <= 0) { a.t = 2 + rng() * 4; a.tx = a.pen.x0 + 0.6 + rng() * (a.pen.x1 - a.pen.x0 - 1.2); a.ty = a.pen.y0 + 0.6 + rng() * (a.pen.y1 - a.pen.y0 - 1.2); }
    const dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy), sp = a.kind === 'vaca' ? 0.35 : 0.6;
    if (d > 0.1) { const s = Math.min(d, sp * dt); a.x += dx / d * s; a.y += dy / d * s; a.fl = dx - dy < 0; a.ft = (a.ft || 0) + dt * 4; a.f = Math.floor(a.ft) % 4; } else a.f = 0;
  }
}
