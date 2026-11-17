// PROTOTYPE - NOT FOR PRODUCTION
// Question: vasculhar a cidade só de cueca, sob a pressão do barulho, do frio e da fome, e montar uma base barricada é tenso e divertido por 20 minutos?
// Date: 2026-11-17
// What the survivor can do with things: search, wear, eat, read, bandage, build, chop, fuel,
// feed animals, and the panels that drive it (inventory, health, container, menus, build mode).
'use strict';

const FNAME = { guarda: 'Guarda-roupa', armario: 'Armário', comoda: 'Cômoda', geladeira: 'Geladeira', balcao: 'Armário de cozinha', pia: 'Pia', fogao: 'Fogão', estante: 'Estante', escrivaninha: 'Escrivaninha', prateleira: 'Prateleira', caixote: 'Caixote', remedios: 'Armário de remédios', feno: 'Fardo de feno', carro: 'Carro', caminhao: 'Caminhão de bombeiros', tv: 'TV', radio: 'Rádio', cama: 'Cama', camaHosp: 'Leito', bomba: 'Bomba de gasolina', cocho: 'Cocho', gerador: 'Gerador', fogueira: 'Fogueira', arvore: 'Árvore', sofa: 'Sofá', mesa: 'Mesa', galinheiro: 'Galinheiro', lixeira: 'Lixeira', banco: 'Banco', placa: 'Placa', poste: 'Poste', cadeira: 'Cadeira', toco: 'Toco', arbusto: 'Arbusto' };
const WOODEN = { guarda: [2, 3], comoda: [1, 2], estante: [2, 3], mesa: [1, 2], cadeira: [1, 1], escrivaninha: [1, 2], caixote: [1, 2], cama: [2, 2], sofa: [1, 2], banco: [1, 2], balcao: [1, 2] };

function genLoot(f) {
  if (f.loot) return;
  f.loot = (f.preset || []).map(id => newItem(id));
  const T = LOOT[f.cont]; if (!T) return;
  const n = rint(T.n[0], T.n[1]);
  for (let k = 0; k < n; k++) {
    let id = wpick(T.t);
    if (id.startsWith('livro~')) { const [, a, rest] = id.split('~'); const [b, sk] = rest.split(':'); id = `livro:${sk || pick(SKILLS)}:${rint(+a, +b)}`; }
    f.loot.push(newItem(id));
  }
}

// ---- targets near the survivor --------------------------------------------------------------------
function distToRect(x, y, x0, y0, x1, y1) { const cx = Math.max(x0, Math.min(x1, x)), cy = Math.max(y0, Math.min(y1, y)); return Math.hypot(x - cx, y - cy); }
function distToSeg(x, y, ax, ay, bx, by) { const vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy; let t = ((x - ax) * vx + (y - ay) * vy) / l2; t = Math.max(0, Math.min(1, t)); return Math.hypot(x - ax - vx * t, y - ay - vy * t); }
function targetsNear() {
  const p = state.p, out = [], ci = Math.floor(p.x), cj = Math.floor(p.y), seen = new Set();
  const score = (d, tx, ty) => { const dx = tx - p.x, dy = ty - p.y, l = Math.hypot(dx, dy) || 1; return d - 0.4 * ((dx * p.dir[0] + dy * p.dir[1]) / l); };
  for (let i = ci - 1; i <= ci + 1; i++) for (let j = cj - 1; j <= cj + 1; j++) {
    if (!inMap(i, j)) continue;
    const f = world.furn[idx(i, j)];
    if (f && !seen.has(f)) {
      seen.add(f);
      const w = f.w || 1, dd = f.d || 1, d = distToRect(p.x, p.y, f.i, f.j, f.i + w, f.j + dd);
      if (d < 0.85) out.push({ kind: 'furn', f, d, s: score(d, f.i + w / 2, f.j + dd / 2) });
    }
    const g = world.ground.get(idx(i, j));
    if (g && g.length) { const d = Math.hypot(p.x - i - 0.5, p.y - j - 0.5); if (d < 1.0) out.push({ kind: 'ground', i, j, d, s: score(d, i + 0.5, j + 0.5) - 0.2 }); }
    if (world.floor[idx(i, j)] === 'agua') { const d = distToRect(p.x, p.y, i, j, i + 1, j + 1); if (d < 0.7) out.push({ kind: 'agua', i, j, d, s: score(d, i + 0.5, j + 0.5) + 0.2 }); }
    for (const e of [getV(i, j), getH(i, j)]) {
      if (!e || !(e.door || e.win) || seen.has(e)) continue; seen.add(e);
      const a = e.dir === 'V' ? [e.i, e.j, e.i, e.j + 1] : [e.i, e.j, e.i + 1, e.j], d = distToSeg(p.x, p.y, ...a);
      if (d < 0.75) out.push({ kind: 'edge', e, d, s: score(d, (a[0] + a[2]) / 2, (a[1] + a[3]) / 2) });
    }
  }
  for (const a of world.animals) { const d = Math.hypot(a.x - p.x, a.y - p.y); if (d < 1.2 && a.kind === 'vaca' && !a.dead) out.push({ kind: 'animal', a, d, s: score(d, a.x, a.y) }); }
  for (const t of out) t.ok = actionsFor(t).some(a => a.ok) ? 1 : 0;
  out.sort((a, b) => (b.ok - a.ok) || (a.s - b.s));
  return out;
}

// ---- the actions a target offers -------------------------------------------------------------
function A(label, fn, ok = true, why = '') { return { label, fn, ok, why }; }
function actionsFor(t) {
  const p = state.p, L2 = [];
  if (t.kind === 'furn') {
    const f = t.f, nm = FNAME[f.t] || f.t;
    if (f.cont) L2.push(f.searched ? A(`Abrir ${nm}`, () => openCont(f)) : A(`Vasculhar ${nm}`, () => searchCont(f)));
    if (f.t === 'tv') { const pw = world.buildings[f.b] && world.buildings[f.b].powered; L2.push(A('Assistir TV', () => watchTv(f), pw, 'Sem luz')); }
    if (f.t === 'radio') L2.push(A(f.st === 'on' ? 'Desligar rádio' : 'Ligar rádio', () => { f.st = f.st === 'on' ? '' : 'on'; sfx('click'); if (f.st === 'on') { state.radioSlot = -1; } }));
    if (f.t === 'cama' || f.t === 'camaHosp') L2.push(A('Dormir', () => sleepIn(f), p.fatigue > 30, 'Sem sono'));
    if (f.t === 'pia') { L2.push(A('Beber da torneira', () => drinkFrom('pia'), waterOn(), 'Sem água')); L2.push(A('Encher garrafa', () => fillBottle(), waterOn() && hasTool(p, 'garrafa'), waterOn() ? 'Precisa de garrafa vazia' : 'Sem água')); }
    if (f.t === 'bomba') L2.push(A('Encher galão de gasolina', () => timed('Enchendo galão', 3, 'search', () => { takeItems(p, 'galao', 1); giveItem(p, 'galaoCheio'); msg('Galão cheio de gasolina (10 L).', '#9ad08a'); }), hasTool(p, 'galao'), 'Precisa de galão vazio'));
    if (f.t === 'carro') L2.push(A(`Tirar gasolina (${f.fuel || 0} L)`, () => timed('Tirando gasolina', 5 / (1 + 0.15 * (p.skills.mecanica - 1)), 'search', () => { takeItems(p, 'galao', 1); giveItem(p, 'galaoCheio'); f.fuel = Math.max(0, f.fuel - 10); msg('Você tirou gasolina do tanque.', '#9ad08a'); }), p.skills.mecanica >= 2 && hasTool(p, 'galao') && f.fuel > 0, p.skills.mecanica < 2 ? 'Precisa de Mecânica 2' : !hasTool(p, 'galao') ? 'Precisa de galão vazio' : 'Tanque vazio'));
    if (f.t === 'carro') L2.push(A('Tirar peças do motor', () => timed('Desmontando o motor', 6 / (1 + 0.15 * (p.skills.mecanica - 1)), 'hammer', () => { f.parts = true; giveItem(p, 'pecas'); msg('Você tirou peças do motor.', '#9ad08a'); }, { tick(dt) { this.nt = (this.nt || 0) - dt; if (this.nt <= 0) { this.nt = 1; noise(p.x, p.y, 4); sfx('hammer'); } } }), p.skills.mecanica >= 3 && !f.parts, f.parts ? 'Já desmontado' : 'Precisa de Mecânica 3'));
    if (f.t === 'arvore') L2.push(A('Cortar árvore', () => chopTree(f), hasTool(p, 'machado'), 'Precisa de machado'));
    if (f.t === 'cocho') {
      L2.push(A(`Pôr ração (comida ${Math.round(f.food)}%)`, () => timed('Enchendo cocho', 2, 'search', () => { takeItems(p, 'racao', 1); f.food = 100; msg('Cocho com ração.', '#9ad08a'); }), hasTool(p, 'racao'), 'Precisa de saco de ração (celeiro/fazenda)'));
      L2.push(A(`Pôr água (água ${Math.round(f.water)}%)`, () => timed('Enchendo cocho', 2, 'search', () => { takeItems(p, 'agua', 1); giveItem(p, 'garrafa'); f.water = Math.min(100, f.water + 50); msg('Água no cocho.', '#9ad08a'); }), hasTool(p, 'agua'), 'Precisa de garrafa de água'));
    }
    if (f.t === 'gerador') {
      L2.push(A(f.on ? 'Desligar gerador' : `Ligar gerador (${Math.round(f.fuel)} L)`, () => { if (f.on) { f.on = false; f.st = ''; msg('Gerador desligado.'); } else { f.on = true; f.st = 'on'; f.noise = 2; msg('O gerador roncou. Luz na base!', '#9ad08a'); sfx('power'); } state.powerT = 0; }, f.on || (p.skills.eletricidade >= 2 && f.fuel > 0), p.skills.eletricidade < 2 ? 'Precisa de Eletricidade 2' : 'Sem gasolina'));
      L2.push(A('Abastecer gerador', () => timed('Abastecendo', 3, 'search', () => { takeItems(p, 'galaoCheio', 1); giveItem(p, 'galao'); f.fuel = Math.min(tune.gen_tank, f.fuel + 10); msg(`Gerador com ${Math.round(f.fuel)} L.`, '#9ad08a'); }), hasTool(p, 'galaoCheio'), 'Precisa de galão de gasolina'));
      L2.push(A('Pegar gerador', () => { world.furn[idx(f.i, f.j)] = null; state.gens = state.gens.filter(g => g !== f); const it = newItem('gerador'); it.fuel = f.fuel; p.inv.push(it); msg('Gerador no inventário (pesado!).'); }, !f.on, 'Desligue antes'));
    }
    if (f.t === 'fogueira') {
      L2.push(A(`Pôr lenha (${f.fuel > 0 ? Math.round(f.fuel) + ' h' : 'apagada'})`, () => { const id = hasTool(p, 'tora') ? 'tora' : 'tabua'; takeItems(p, id, 1); f.fuel += id === 'tora' ? 5 : 2.5; sfx('fire'); msg('Fogo alimentado.'); }, (hasTool(p, 'tabua') || hasTool(p, 'tora')) && (f.fuel > 0 || hasTool(p, 'isqueiro') || hasTool(p, 'fosforo')), 'Precisa de lenha (e fogo)'));
    }
    if (WOODEN[f.t] && !f.cont) { /* only through build mode */ }
  } else if (t.kind === 'edge') {
    const e = t.e;
    if (e.door) {
      if (e.broken) L2.push(A('Porta arrombada', () => {}, false, 'Barricar com [B]'));
      else if (e.barr) L2.push(A('Porta barricada', () => {}, false, `${e.barr} tábuas`));
      else L2.push(A(e.open ? 'Fechar porta' : 'Abrir porta', () => { e.open = !e.open; sfx('door'); }));
    }
    if (e.win) {
      if (e.glass !== 'broken' && !e.barr) L2.push(A(e.glass === 'open' ? 'Fechar janela' : 'Abrir janela', () => { e.glass = e.glass === 'open' ? 'ok' : 'open'; sfx('door'); }));
      if (e.glass !== 'ok' && !e.barr) L2.push(A('Pular a janela', () => climbWindow(e)));
      if (e.barr) L2.push(A(`Janela barricada (${e.barr})`, () => {}, false, 'Mais tábuas com [B]'));
    }
  } else if (t.kind === 'ground') {
    const g = world.ground.get(idx(t.i, t.j)) || [], ids = [...new Set(g.map(it => it.id))];
    for (const id of ids.slice(0, 6)) { const n = g.filter(it => it.id === id).length; L2.push(A(`Pegar ${itemDef(id).n}${n > 1 ? ' x' + n : ''}`, () => pickGround(t.i, t.j, id))); }
  } else if (t.kind === 'agua') {
    L2.push(A('Beber da lagoa', () => drinkFrom('lagoa')));
    L2.push(A('Encher garrafa', () => fillBottle(), hasTool(p, 'garrafa'), 'Precisa de garrafa vazia'));
  } else if (t.kind === 'animal') {
    const a = t.a, day = dayOf(state.time);
    L2.push(A('Ordenhar a vaca', () => timed('Ordenhando', 3, 'search', () => { takeItems(p, 'garrafa', 1); giveItem(p, 'leite'); a.milked = day; msg('Uma garrafa de leite.', '#9ad08a'); }), hasTool(p, 'garrafa') && a.milked !== day && a.hunger < 50, a.milked === day ? 'Já ordenhada hoje' : a.hunger >= 50 ? 'Vaca faminta' : 'Precisa de garrafa vazia'));
  }
  return L2;
}

// ---- doing things ----------------------------------------------------------------------------------
function timed(label, dur, anim, done, extra = {}) { startAction(Object.assign({ label, dur, anim, done }, extra)); }
function searchCont(f) { timed('Vasculhando', tune.search_seconds * (f.big ? 1.6 : 1), 'search', () => { f.searched = true; genLoot(f); noise(state.p.x, state.p.y, 1.2); openCont(f); state.tutSearch = true; }); sfx('search'); }
function openCont(f) { genLoot(f); state.ui.cont = f; state.ui.contSel = 0; sfx('open'); }
function pickGround(i, j, id) {
  const g = world.ground.get(idx(i, j)) || [];
  const mine = g.filter(it => it.id === id); world.ground.set(idx(i, j), g.filter(it => it.id !== id));
  for (const it of mine) state.p.inv.push(it); sfx('pick'); msg(`Pegou ${itemDef(id).n}${mine.length > 1 ? ' x' + mine.length : ''}.`);
}
function drinkFrom(src) { timed('Bebendo', 1.5, 'search', () => { const p = state.p; p.thirst = Math.max(0, p.thirst - 35); sfx('drink'); if (src === 'lagoa' && rng() < 0.15) { p.sick = 4; msg('A água da lagoa fez mal...', '#c0e070'); } }); }
function fillBottle() { timed('Enchendo garrafa', 1.2, 'search', () => { takeItems(state.p, 'garrafa', 1); giveItem(state.p, 'agua'); sfx('drink'); }); }
function sleepIn(f) {
  const p = state.p;
  if (state.near.some(z => !z.dead && z.state === 'chase' && Math.hypot(z.x - p.x, z.y - p.y) < 14)) { msg('Não dá para dormir com zumbis atrás de você.', '#ff8060'); return; }
  p.x = f.i + 0.5; p.y = f.j + 0.5; p.sleeping = true; startAction({ kind: 'sleep', label: '', anim: 'sleep', bed: f, done() {} }); msg('Você dormiu. O tempo passa rápido...', '#b8a0e0');
}
function watchTv(f) {
  const p = state.p, fx = f.i + 0.5, fy = f.j + 0.5;
  const dx = p.x - fx, dy = p.y - fy, d = Math.hypot(dx, dy) || 1;
  p.dir = [-dx / d, -dy / d];
  f.st = 'on'; f.on = true; sfx('tv');
  startAction({ kind: 'tv', label: 'TV', anim: 'sit', tv: f, prog: 0, tick(dt) {
    const b = world.buildings[f.b];
    if (!b || !b.powered) { cancelAction(true); msg('A TV apagou: sem luz.', '#ff8060'); return; }
    const h = hourOf(state.time), show = TV.find(s => h >= s.h0 && h < s.h1);
    this.show = show;
    if (!show) { this.label = 'TV: Notícias'; return; }
    this.label = 'TV: ' + show.n;
    const lv = p.skills[show.skill];
    if (lv >= tune.tv_max_level) { this.capped = true; return; }
    this.capped = false; this.prog += dt / tune.tv_seconds;
    if (this.prog >= 1) { this.prog = 0; p.skills[show.skill] = lv + 1; msg(`Aprendeu ${SKILL_NAME[show.skill]} nível ${lv + 1} com "${show.n}"!`, '#f0d040'); sfx('learn'); }
  }, onCancel() { f.st = ''; f.on = false; }, done() {} });
  const h = hourOf(state.time), show = TV.find(s => h >= s.h0 && h < s.h1);
  msg(show ? `Na TV: "${show.n}" ensina ${SKILL_NAME[show.skill]}.` : 'Só notícias agora. Programas: 8h, 11h, 14h, 17h e 19h.', '#9fd3f0');
}
function chopTree(f) {
  const p = state.p;
  if (!p.hand || p.hand.id !== 'machado') { const k = p.inv.findIndex(it => it.id === 'machado'); if (p.hand) p.inv.push(p.hand); p.hand = p.inv.splice(k, 1)[0]; msg('Machado na mão.'); }
  const fx = f.i + 0.5, fy = f.j + 0.5, dx = fx - p.x, dy = fy - p.y, d = Math.hypot(dx, dy) || 1; p.dir = [dx / d, dy / d];
  startAction({ kind: 'chop', label: 'Cortando árvore', anim: 'chop', next: 0.3, tick(dt) {
    this.next -= dt;
    if (this.next <= 0) {
      this.next = 1.0; p.swing = 0.32; p.swingHit = true; f.hits = (f.hits || 0) + 1; f.shake = 0.2;
      sfx('chop'); noise(p.x, p.y, tune.noise_chop); p.stamina = Math.max(0, p.stamina - 4);
      if (p.hand && p.hand.dur != null) p.hand.dur -= 0.25;
      this.dur = tune.tree_hits; this.t = f.hits;
      if (f.hits >= tune.tree_hits) {
        world.furn[idx(f.i, f.j)] = null; placeFurn('toco', f.i, f.j, { solid: false });
        addGround(f.i, f.j, newItem('tora')); addGround(f.i, f.j, newItem('tora')); sfx('fall'); msg('A árvore caiu! 2 toras no chão.', '#9ad08a');
        p.action = null;
      }
    }
  }, done() {} });
}
function climbWindow(e) {
  const p = state.p;
  let tx, ty; if (e.dir === 'V') { tx = p.x < e.i ? e.i + 0.5 : e.i - 0.5; ty = e.j + 0.5; } else { ty = p.y < e.j ? e.j + 0.5 : e.j - 0.5; tx = e.i + 0.5; }
  if (tileSolid(Math.floor(tx), Math.floor(ty))) { msg('Tem um móvel do outro lado.'); return; }
  timed('Pulando a janela', 1.2, 'crouch', () => { p.x = tx; p.y = ty; sfx('door'); if (e.glass === 'broken' && rng() < 0.3) addWound(rng() < 0.5 ? 'bracos' : 'maos', 'arranhao'); });
}

// ---- using items -----------------------------------------------------------------------------------
function useItem(it) {
  const p = state.p, d = itemDef(it.id);
  const rm = () => { const k = p.inv.indexOf(it); if (k >= 0) p.inv.splice(k, 1); };
  if (d.cat === 'roupa') { rm(); const old = p.wear[d.slot]; if (old && !itemDef(old.id).under) p.inv.push(old); else if (old && d.slot !== 'pernas') p.inv.push(old); p.wear[d.slot] = it; sfx('cloth'); msg(`Vestiu ${d.n}.`, '#9ad08a'); return; }
  if (d.cat === 'arma') { rm(); if (p.hand) p.inv.push(p.hand); p.hand = it; sfx('equip'); msg(`${d.n} na mão.`, '#9ad08a'); return; }
  if (d.cat === 'comida') {
    timed(d.sede < -10 && d.fome < 10 ? 'Bebendo' : 'Comendo', tune.eat_seconds, 'search', () => {
      rm(); const spoiled = d.perec && it.age > d.perec; const cookBonus = it.bonus || 1;
      p.hunger = Math.max(0, p.hunger - (d.fome || 0) * cookBonus); p.thirst = Math.max(0, Math.min(100, p.thirst + (d.sede || 0)));
      if (d.vira) giveItem(p, d.vira);
      if ((d.crua && rng() < 0.5) || spoiled) { p.sick = 5; msg(spoiled ? 'Estava estragado... você passou mal.' : 'Cru! Você passou mal.', '#c0e070'); }
      sfx(d.sede < -10 ? 'drink' : 'eat');
    }); return;
  }
  if (d.cat === 'livro') return readBook(it);
  if (it.id === 'analgesico') { rm(); p.analg = 6; msg('A dor diminuiu.', '#9ad08a'); return; }
  if (it.id === 'bandagem' || it.id === 'trapo') { state.ui.panel = 'saude'; state.ui.sel = 0; return; }
  if (it.id === 'gerador') {
    const fi = Math.floor(p.x + p.dir[0] * 0.9), fj = Math.floor(p.y + p.dir[1] * 0.9);
    if (!inMap(fi, fj) || world.furn[idx(fi, fj)] || tileSolid(fi, fj) || (fi === Math.floor(p.x) && fj === Math.floor(p.y))) { msg('Não há espaço livre na sua frente.'); return; }
    rm(); const g = placeFurn('gerador', fi, fj, { fuel: it.fuel || 0, on: false, noise: 0 }); state.gens.push(g); sfx('equip'); msg('Gerador no chão. Abasteça com gasolina e ligue (Eletricidade 2).', '#9ad08a'); return;
  }
  if (it.id === 'lanterna') { p.light = !p.light; sfx('click'); return; }
  if (it.id === 'municao') { const gun = (p.hand && p.hand.id === 'pistola') ? p.hand : p.inv.find(x => x.id === 'pistola'); if (!gun) { msg('Precisa de uma pistola.'); return; } rm(); gun.balas = (gun.balas || 0) + 10; msg('Pistola carregada.', '#9ad08a'); return; }
  msg(itemHint(it.id), '#a0a6b0');
}
function itemHint(id) {
  return { garrafa: 'Encha numa pia ou lagoa.', galao: 'Encha numa bomba de gasolina ou tire de um carro.', galaoCheio: 'Use para abastecer um gerador.', racao: 'Ponha no cocho dos animais.', pecas: 'Peças de motor: guarde para consertos futuros.', tora: 'Serre em tábuas em CRIAR (serrote) ou use numa fogueira.', tabua: 'Para barricar ([B]) ou fogueira.', pregos: 'Para barricar e construir.', desinfetante: 'Bandagem limpa em CRIAR.', martelo: 'Ferramenta para [B]: barricar e construir.', serrote: 'Ferramenta para serrar toras.', isqueiro: 'Acende fogueiras.', fosforo: 'Acende fogueiras.', panela: 'Para cozinhar.' }[id] || 'Nada a fazer com isso agora.';
}
function readBook(it) {
  const p = state.p, d = itemDef(it.id), cur = p.skills[d.skill];
  if (d.lvl <= cur) { msg(`Você já sabe ${SKILL_NAME[d.skill]} ${cur}. Este livro não ensina nada novo.`, '#ff8060'); return; }
  if (d.lvl > cur + 1) { msg(`Difícil demais: leia antes ${SKILL_NAME[d.skill]} ${cur + 1}.`, '#ff8060'); return; }
  if (!lightHere(p.x, p.y)) { msg('Está escuro demais para ler. Lanterna, fogo ou luz.', '#ff8060'); return; }
  const dur = tune.read_seconds * (1 + tune.read_per_level * (d.lvl - 2)) * (hasTrait('leitor') ? 0.6 : 1) * (hasTrait('lento') ? 1.4 : 1);
  sfx('page');
  startAction({ kind: 'read', label: `Lendo ${d.n}`, dur, anim: 'read', book: d, tick() { if (!lightHere(p.x, p.y)) { cancelAction(true); msg('Escureceu: parou de ler.', '#ff8060'); } }, done() { p.skills[d.skill] = d.lvl; msg(`Aprendeu ${SKILL_NAME[d.skill]} nível ${d.lvl}!`, '#f0d040'); sfx('learn'); } });
}
function bandageWound(w) {
  const p = state.p, id = hasTool(p, 'bandagem') ? 'bandagem' : hasTool(p, 'trapo') ? 'trapo' : null;
  if (!id) { msg('Precisa de bandagem ou trapo (rasgue roupa em CRIAR).', '#ff8060'); return; }
  if (w.band) { msg('Já está enfaixado.'); return; }
  state.ui.panel = null;
  const dur = tune.bandage_seconds / (1 + 0.15 * (p.skills.socorros - 1)) / profMod('cura');
  timed(`Enfaixando ${PART_NAME[w.part].toLowerCase()}`, dur, 'bandage', () => { takeItems(p, id, 1); w.band = true; w.q = id === 'bandagem' ? 1.3 : 1; msg('Ferida enfaixada.', '#9ad08a'); sfx('cloth'); });
}
function recipeOk(r) {
  const p = state.p;
  if (r.skill && p.skills[r.skill[0]] < r.skill[1]) return [false, `${SKILL_NAME[r.skill[0]]} ${r.skill[1]}`];
  if (r.need) for (const [id, n] of r.need) if (countItem(p, id) < n) return [false, `${itemDef(id).n} x${n}`];
  if (r.needAny === 'tecido' && !p.inv.some(it => itemDef(it.id).tecido)) return [false, 'roupa de tecido'];
  if (r.tools) for (const id of r.tools) if (!hasTool(p, id)) return [false, itemDef(id).n];
  if (r.fire && !nearFire(p.x, p.y)) return [false, 'perto de fogo ou fogão com luz'];
  if (r.balas && !hasTool(p, 'pistola')) return [false, 'pistola'];
  return [true, ''];
}
function craft(r) {
  const [ok, why] = recipeOk(r); if (!ok) { msg('Falta: ' + why, '#ff8060'); return; }
  const p = state.p; state.ui.panel = null;
  timed(r.n, r.time, r.anim, () => {
    if (r.balas) { useItem(p.inv.find(x => x.id === 'municao')); return; }
    if (r.need) for (const [id, n] of r.need) takeItems(p, id, n);
    if (r.needAny === 'tecido') { const k = p.inv.findIndex(it => itemDef(it.id).tecido); p.inv.splice(k, 1); }
    for (const [id, n] of r.out) for (let k = 0; k < n; k++) giveItem(p, id);
    if (r.cook) { const last = p.inv[p.inv.length - 1]; last.bonus = 1 + 0.1 * (p.skills.culinaria - 1); } // better cooks feed more
    msg(`Feito: ${r.n}.`, '#9ad08a'); sfx(r.anim === 'hammer' ? 'hammer' : 'craft');
  }, { tick(dt) { if (r.noise) { this.nt = (this.nt || 0) - dt; if (this.nt <= 0) { this.nt = 1; noise(p.x, p.y, r.noise); sfx('saw'); } } } });
}

// ---- build mode -------------------------------------------------------------------------------------
function buildTarget() {
  const p = state.p, B = BUILDS[state.ui.build.opt];
  const pt = state.mouseRecent ? screenToWorld(state.mx, state.my) : [p.x + p.dir[0] * 0.9, p.y + p.dir[1] * 0.9];
  if (B.id === 'barricar') {
    let best = null, bd = 0.9;
    const ci = Math.floor(pt[0]), cj = Math.floor(pt[1]);
    for (let i = ci - 1; i <= ci + 1; i++) for (let j = cj - 1; j <= cj + 1; j++) for (const e of [getV(i, j), getH(i, j)]) {
      if (!e || !(e.win || e.door) || e.kind === 'fence') continue;
      const a = e.dir === 'V' ? [e.i, e.j, e.i, e.j + 1] : [e.i, e.j, e.i + 1, e.j], d = distToSeg(pt[0], pt[1], ...a);
      if (d < bd) { bd = d; best = e; }
    }
    if (!best) return null;
    const a = best.dir === 'V' ? [best.i, best.j, best.i, best.j + 1] : [best.i, best.j, best.i + 1, best.j];
    return { kind: 'edge', e: best, dir: best.dir, i: best.i, j: best.j, far: distToSeg(p.x, p.y, ...a) > 1.6, why: best.barr >= 4 ? 'Já tem 4 tábuas' : (best.door && best.open && !best.broken) ? 'Feche a porta antes' : '' };
  }
  if (B.id === 'parede') {
    const i = Math.floor(pt[0]), j = Math.floor(pt[1]), fx = pt[0] - i, fy = pt[1] - j;
    const opts = [['V', i, j, fx], ['V', i + 1, j, 1 - fx], ['H', i, j, fy], ['H', i, j + 1, 1 - fy]].sort((a, b) => a[3] - b[3]);
    const [dir, ei, ej] = opts[0];
    const cur = dir === 'V' ? getV(ei, ej) : getH(ei, ej);
    const a = dir === 'V' ? [ei, ej, ei, ej + 1] : [ei, ej, ei + 1, ej];
    const pd = distToSeg(p.x, p.y, ...a);
    return { kind: 'newedge', dir, i: ei, j: ej, far: pd > 2.2, why: cur ? 'Já tem parede aqui' : pd < 0.3 ? 'Você está no caminho' : '' };
  }
  const i = Math.floor(pt[0]), j = Math.floor(pt[1]);
  if (!inMap(i, j)) return null;
  const f = world.furn[idx(i, j)], far = Math.hypot(i + 0.5 - p.x, j + 0.5 - p.y) > 2.3;
  if (B.id === 'fogueira') return { kind: 'tile', i, j, far, why: f ? 'Ocupado' : world.floor[idx(i, j)] === 'agua' ? 'Água' : world.bld[idx(i, j)] >= 0 ? 'Não dentro de casa' : (i === Math.floor(p.x) && j === Math.floor(p.y)) ? 'Você está em cima' : '' };
  if (B.id === 'desmontar') return { kind: 'tile', i, j, far, f, why: !f || !WOODEN[f.t] ? 'Escolha um móvel de madeira' : '' };
  return null;
}
function buildOk(B) {
  const p = state.p;
  if (B.skill && p.skills[B.skill[0]] < B.skill[1]) return [false, `Precisa de ${SKILL_NAME[B.skill[0]]} ${B.skill[1]} (leia um livro)`];
  if (B.tool && !hasTool(p, B.tool)) return [false, `Precisa de ${itemDef(B.tool).n}`];
  if (B.fire && !hasTool(p, 'isqueiro') && !hasTool(p, 'fosforo')) return [false, 'Precisa de isqueiro ou fósforos'];
  const costOk = (c) => c.every(([id, n]) => countItem(p, id) >= n);
  if (!costOk(B.cost) && !(B.alt && costOk(B.alt))) return [false, 'Falta: ' + B.cost.map(([id, n]) => `${itemDef(id).n} x${n}`).join(', ')];
  return [true, ''];
}
function doBuild() {
  const p = state.p, B = BUILDS[state.ui.build.opt], t = buildTarget();
  const [ok, why] = buildOk(B); if (!ok) { msg(why, '#ff8060'); return; }
  if (!t) { msg('Aponte para um lugar válido.', '#ff8060'); return; }
  if (t.why) { msg(t.why, '#ff8060'); return; }
  if (t.far) { msg('Longe demais. Chegue mais perto.', '#ff8060'); return; }
  const costOk = (c) => c.every(([id, n]) => countItem(p, id) >= n);
  const cost = costOk(B.cost) ? B.cost : B.alt;
  const lv = p.skills.carpintaria, dur = B.time / (1 + 0.12 * (lv - 1));
  const tx = t.kind === 'edge' || t.kind === 'newedge' ? (t.dir === 'V' ? t.i : t.i + 0.5) : t.i + 0.5, ty = t.kind === 'edge' || t.kind === 'newedge' ? (t.dir === 'V' ? t.j + 0.5 : t.j) : t.j + 0.5;
  const dx = tx - p.x, dy = ty - p.y, dd = Math.hypot(dx, dy) || 1; p.dir = [dx / dd, dy / dd];
  startAction({ label: B.n, dur, anim: B.id === 'fogueira' ? 'search' : 'hammer', nt: 0, tick(dt) { this.nt -= dt; if (this.nt <= 0 && B.tool) { this.nt = 0.8; sfx('hammer'); noise(p.x, p.y, tune.noise_hammer); p.swing = 0.32; p.swingHit = true; } }, done() {
    for (const [id, n] of cost) takeItems(p, id, n);
    const hpMul = 1 + tune.skill_hp_bonus * (lv - 1);
    if (B.id === 'barricar') { const e = t.e; if (e.barr < 4) { e.barr++; e.bhp.push(tune.plank_hp * hpMul); if (e.door) e.open = false; } msg(`Barricada: ${e.barr} tábua${e.barr > 1 ? 's' : ''}.`, '#9ad08a'); state.tutBarr = true; }
    if (B.id === 'parede') { const e = wallEdge('wood', null, { hp: tune.wall_hp * hpMul }); if (t.dir === 'V') setV(t.i, t.j, e); else setH(t.i, t.j, e); msg('Parede de madeira erguida.', '#9ad08a'); state.tutBarr = true; field.t = 0; }
    if (B.id === 'fogueira') { const f = placeFurn('fogueira', t.i, t.j, { fuel: cost[0][0] === 'tora' ? 5 : 4, solid: true }); state.fires.push(f); msg('Fogueira acesa. Aquece e cozinha.', '#9ad08a'); sfx('fire'); }
    if (B.id === 'desmontar') { const f = t.f, [a, b] = WOODEN[f.t]; world.furn[idx(f.i, f.j)] = null; for (let k = 0; k < rint(a, b); k++) addGround(f.i, f.j, newItem('tabua')); if (rng() < 0.6) addGround(f.i, f.j, newItem('pregos')); if (f.loot) for (const it of f.loot) addGround(f.i, f.j, it); msg('Móvel desmontado: tábuas no chão.', '#9ad08a'); }
  } });
}

// ---- panel input ------------------------------------------------------------------------------------
function invRows() {
  const p = state.p, rows = [], groups = new Map();
  if (p.hand) rows.push({ hand: true, it: p.hand, n: 1 });
  for (const it of p.inv) {
    const d = itemDef(it.id), key = (d.cat === 'arma' || it.id === 'gerador') ? it : it.id + (it.age != null && d.perec && it.age > d.perec ? '#x' : '');
    if (groups.has(key)) groups.get(key).n++; else { const r = { it, n: 1 }; groups.set(key, r); rows.push(r); }
  }
  return rows;
}
function panelInput() {
  const ui = state.ui, p = state.p;
  // the context menu
  if (ui.menu) {
    const m = ui.menu;
    if (pressed('ArrowDown') || pressed('KeyS')) m.sel = (m.sel + 1) % m.items.length;
    if (pressed('ArrowUp') || pressed('KeyW')) m.sel = (m.sel + m.items.length - 1) % m.items.length;
    for (let k = 0; k < 9; k++) if (pressed('Digit' + (k + 1)) && m.items[k]) { m.sel = k; runMenu(); return true; }
    if (pressed('Enter') || pressed('KeyE')) { runMenu(); return true; }
    if (pressed('Escape')) ui.menu = null;
    return true;
  }
  if (ui.panel) {
    if (pressed('Escape') || (ui.panel === 'inv' && (pressed('Tab') || pressed('KeyI'))) || (ui.panel === 'saude' && pressed('KeyH'))) { ui.panel = null; return true; }
    if (ui.panel === 'inv') {
      if (pressed('ArrowRight')) { ui.tab = (ui.tab + 1) % 4; ui.sel = 0; }
      if (pressed('ArrowLeft')) { ui.tab = (ui.tab + 3) % 4; ui.sel = 0; }
      const rows = ui.tab === 0 ? invRows() : ui.tab === 1 ? SLOTS : ui.tab === 2 ? RECIPES : SKILLS;
      if (pressed('ArrowDown')) ui.sel = Math.min(rows.length - 1, ui.sel + 1);
      if (pressed('ArrowUp')) ui.sel = Math.max(0, ui.sel - 1);
      ui.sel = Math.max(0, Math.min(ui.sel, rows.length - 1));
      if (pressed('Enter')) {
        if (ui.tab === 0 && rows[ui.sel]) { const r = rows[ui.sel]; if (r.hand) { p.inv.push(p.hand); p.hand = null; msg('Mãos livres.'); } else useItem(r.it); }
        if (ui.tab === 1) { const s = SLOTS[ui.sel], it = p.wear[s]; if (it && !itemDef(it.id).under) { p.wear[s] = null; p.inv.push(it); if (s === 'pernas') p.wear.pernas = newItem('cueca'); msg(`Tirou ${itemDef(it.id).n}.`); } }
        if (ui.tab === 2 && rows[ui.sel]) craft(rows[ui.sel]);
      }
      if (ui.tab === 0 && rows[ui.sel] && !rows[ui.sel].hand) {
        const r = rows[ui.sel];
        if (pressed('KeyX')) { const k = p.inv.indexOf(r.it); p.inv.splice(k, 1); addGround(Math.floor(p.x), Math.floor(p.y), r.it); msg(`Largou ${itemDef(r.it.id).n}.`); sfx('pick'); }
        if (pressed('KeyG') && ui.cont) { const k = p.inv.indexOf(r.it); p.inv.splice(k, 1); ui.cont.loot.push(r.it); msg(`Guardou ${itemDef(r.it.id).n}.`); sfx('pick'); }
      }
      return true;
    }
    if (ui.panel === 'saude') {
      if (pressed('ArrowDown')) ui.sel = Math.min(p.wounds.length - 1, ui.sel + 1);
      if (pressed('ArrowUp')) ui.sel = Math.max(0, ui.sel - 1);
      if (pressed('Enter') && p.wounds[ui.sel]) bandageWound(p.wounds[ui.sel]);
      return true;
    }
  }
  if (ui.cont) {
    const f = ui.cont;
    if (distToRect(p.x, p.y, f.i, f.j, f.i + (f.w || 1), f.j + (f.d || 1)) > 1.4) { ui.cont = null; return false; }
    if (pressed('Escape')) { ui.cont = null; return true; }
    if (pressed('ArrowDown')) ui.contSel = Math.min(f.loot.length - 1, ui.contSel + 1);
    if (pressed('ArrowUp')) ui.contSel = Math.max(0, ui.contSel - 1);
    if (pressed('Enter') && f.loot[ui.contSel]) { const it = f.loot.splice(ui.contSel, 1)[0]; p.inv.push(it); ui.contSel = Math.min(ui.contSel, f.loot.length - 1); sfx('pick'); msg(`Pegou ${itemDef(it.id).n}.`); }
    if (pressed('KeyT') && f.loot.length) { const n = f.loot.length; for (const it of f.loot) p.inv.push(it); f.loot = []; sfx('pick'); msg(`Pegou ${n} ite${n > 1 ? 'ns' : 'm'}.`); }
    if (pressed('ArrowUp') || pressed('ArrowDown') || pressed('Enter') || pressed('KeyT')) return true;
  }
  if (ui.build) {
    for (let k = 0; k < BUILDS.length; k++) if (pressed('Digit' + (k + 1))) ui.build.opt = k;
    if (pressed('Escape') || pressed('KeyB')) { ui.build = null; return true; }
    if (pressed('Enter') || state.click) { doBuild(); state.click = false; }
    return false;
  }
  return false;
}
function runMenu() { const m = state.ui.menu, a = m.items[m.sel]; state.ui.menu = null; if (!a.ok) { msg(`${a.label}: ${a.why}`, '#ff8060'); return; } a.fn(); }
function interact() {
  const ts = state.targets; if (!ts.length) return;
  const t = ts[0], acts = actionsFor(t);
  if (!acts.length) return;
  if (acts.length === 1) { const a = acts[0]; if (!a.ok) { msg(`${a.label}: ${a.why}`, '#ff8060'); return; } a.fn(); return; }
  state.ui.menu = { items: acts, sel: Math.max(0, acts.findIndex(a => a.ok)) };
}
// the first-minute hints, taught by doing
const TUT = [
  { s: 'Você acordou só de cueca e com frio. Chegue perto de um armário e aperte [E] para vasculhar.', done: () => state.tutSearch },
  { s: 'Pegue o que achou: [SETAS] e [ENTER], ou [T] para pegar tudo.', done: () => state.p.inv.length > 0 },
  { s: 'Abra o inventário com [TAB] e vista as roupas com [ENTER]. Roupa esquenta e protege.', done: () => ['tronco', 'casaco', 'pes'].some(s => state.p.wear[s]) || (state.p.wear.pernas && state.p.wear.pernas.id !== 'cueca') },
  { s: 'Os armários do bombeiro guardam um machado. Equipe uma arma no inventário com [ENTER].', done: () => !!state.p.hand },
  { s: 'Lá fora, correr [SHIFT] faz barulho e atrai zumbis. Ataque: clique ou [ESPAÇO]. Empurrar: [Q].', done: () => state.killed > 0 },
  { s: 'Com o machado, corte uma árvore com [E]. Toras viram tábuas em [TAB] > CRIAR (com serrote).', done: () => hasTool(state.p, 'tabua') || hasTool(state.p, 'tora') || state.tutBarr },
  { s: 'Barricar: [B], tecla 1, clique na janela. Precisa de martelo, tábua e pregos (prateleira da garagem).', done: () => state.tutBarr },
  { s: 'Aprenda lendo livros e vendo TV. O rádio avisa: em 4 dias a luz acaba. Sobreviva o máximo de dias!', done: () => state.tutLast > 20 },
];
