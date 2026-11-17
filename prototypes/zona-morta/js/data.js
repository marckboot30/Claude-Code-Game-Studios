// PROTOTYPE - NOT FOR PRODUCTION
// Question: vasculhar a cidade só de cueca, sob a pressão do barulho, do frio e da fome, e montar uma base barricada é tenso e divertido por 20 minutos?
// Date: 2026-11-17
// Data: items, loot tables, recipes, skills, radio and TV. Numbers a designer tunes live in
// config.js; these are the game's content.
'use strict';

const SLOTS = ['cabeca', 'tronco', 'casaco', 'pernas', 'pes', 'maos', 'costas'];
const SLOT_NAME = { cabeca: 'Cabeça', tronco: 'Tronco', casaco: 'Casaco', pernas: 'Pernas', pes: 'Pés', maos: 'Mãos', costas: 'Costas' };
// which clothing slots protect which body part
const PART_SLOTS = { cabeca: ['cabeca'], tronco: ['tronco', 'casaco'], bracos: ['casaco', 'tronco'], maos: ['maos'], pernas: ['pernas'], pes: ['pes'] };
const PARTS = ['cabeca', 'tronco', 'bracos', 'maos', 'pernas', 'pes'];
const PART_NAME = { cabeca: 'Cabeça', tronco: 'Tronco', bracos: 'Braços', maos: 'Mãos', pernas: 'Pernas', pes: 'Pés' };

// warm: how much heat it keeps (0-100 summed); prot: chance-like protection 0-100 against scratch and bite
const ITEMS = {
  cueca: { n: 'Cueca', icon: 'cueca', w: 0.1, cat: 'roupa', slot: 'pernas', warm: 2, prot: 0, under: true },
  camiseta: { n: 'Camiseta', icon: 'camiseta', w: 0.2, cat: 'roupa', slot: 'tronco', warm: 8, prot: 10, tecido: true, col: '#3f7f8c' },
  camisa: { n: 'Camisa social', icon: 'camisa', w: 0.3, cat: 'roupa', slot: 'tronco', warm: 10, prot: 12, tecido: true, col: '#e8e0d0', long: true },
  moletom: { n: 'Moletom', icon: 'moletom', w: 0.6, cat: 'roupa', slot: 'tronco', warm: 20, prot: 18, tecido: true, col: '#7a3a6a', long: true },
  jaqueta: { n: 'Jaqueta de couro', icon: 'jaqueta', w: 1.0, cat: 'roupa', slot: 'casaco', warm: 28, prot: 40, col: '#6d7a3a' },
  jaquetaBomb: { n: 'Jaqueta de bombeiro', icon: 'jaquetaBomb', w: 1.6, cat: 'roupa', slot: 'casaco', warm: 34, prot: 55, col: '#3a3a42' },
  jeans: { n: 'Calça jeans', icon: 'jeans', w: 0.6, cat: 'roupa', slot: 'pernas', warm: 14, prot: 30, tecido: true, col: '#3b4f86' },
  calcaMol: { n: 'Calça de moletom', icon: 'calcaMol', w: 0.4, cat: 'roupa', slot: 'pernas', warm: 16, prot: 12, tecido: true, col: '#7a3a6a' },
  calcaBomb: { n: 'Calça de bombeiro', icon: 'calcaBomb', w: 1.2, cat: 'roupa', slot: 'pernas', warm: 22, prot: 50, col: '#3a3a42' },
  tenis: { n: 'Tênis', icon: 'tenis', w: 0.4, cat: 'roupa', slot: 'pes', warm: 6, prot: 25, col: '#e8e8e0' },
  botas: { n: 'Botas', icon: 'botas', w: 0.8, cat: 'roupa', slot: 'pes', warm: 12, prot: 55, col: '#6b4428' },
  gorro: { n: 'Gorro', icon: 'gorro', w: 0.1, cat: 'roupa', slot: 'cabeca', warm: 10, prot: 5, tecido: true, col: '#c9302c' },
  capacete: { n: 'Capacete de bombeiro', icon: 'capacete', w: 0.8, cat: 'roupa', slot: 'cabeca', warm: 6, prot: 60, col: '#e8c040' },
  luvas: { n: 'Luvas', icon: 'luvas', w: 0.1, cat: 'roupa', slot: 'maos', warm: 8, prot: 35, col: '#8a6038' },
  mochila: { n: 'Mochila', icon: 'mochila', w: 0.6, cat: 'roupa', slot: 'costas', warm: 0, prot: 0, cap: 10 },

  feijao: { n: 'Feijão em lata', icon: 'feijao', w: 0.5, cat: 'comida', fome: 30, sede: 0 },
  sopa: { n: 'Sopa em lata', icon: 'sopa', w: 0.5, cat: 'comida', fome: 25, sede: -8 },
  salgadinho: { n: 'Salgadinho', icon: 'salgadinho', w: 0.1, cat: 'comida', fome: 10, sede: 4 },
  pao: { n: 'Pão', icon: 'pao', w: 0.2, cat: 'comida', fome: 18, sede: 2, perec: 3 },
  maca: { n: 'Maçã', icon: 'maca', w: 0.2, cat: 'comida', fome: 10, sede: -4, perec: 6 },
  carne: { n: 'Carne crua', icon: 'carne', w: 0.4, cat: 'comida', fome: 5, sede: 0, perec: 2, crua: true },
  bife: { n: 'Bife assado', icon: 'bife', w: 0.3, cat: 'comida', fome: 40, sede: 0, perec: 3 },
  ovo: { n: 'Ovo', icon: 'ovo', w: 0.1, cat: 'comida', fome: 4, sede: 0, perec: 5, crua: true },
  ovoFrito: { n: 'Ovo frito', icon: 'ovoFrito', w: 0.1, cat: 'comida', fome: 14, sede: 0, perec: 2 },
  leite: { n: 'Leite', icon: 'leite', w: 0.5, cat: 'comida', fome: 8, sede: -20, perec: 2, vira: 'garrafa' },
  agua: { n: 'Garrafa de água', icon: 'agua', w: 0.6, cat: 'comida', fome: 0, sede: -40, vira: 'garrafa' },
  garrafa: { n: 'Garrafa vazia', icon: 'garrafa', w: 0.1, cat: 'util' },
  refri: { n: 'Refrigerante', icon: 'refri', w: 0.4, cat: 'comida', fome: 3, sede: -25 },
  racao: { n: 'Saco de ração', icon: 'racao', w: 1.5, cat: 'util' },

  punho: { n: 'Mãos', cat: 'arma', dmg: 0.35, range: 0.8, cd: 0.55, noise: 3, push: 0.3, dur: 1e9 },
  cano: { n: 'Cano de ferro', icon: 'cano', w: 1.2, cat: 'arma', dmg: 1.3, range: 1.15, cd: 0.8, noise: 4, push: 0.7, dur: 40 },
  taco: { n: 'Taco de beisebol', icon: 'taco', w: 1.0, cat: 'arma', dmg: 1.5, range: 1.15, cd: 0.8, noise: 4, push: 0.8, dur: 30 },
  faca: { n: 'Faca de cozinha', icon: 'faca', w: 0.3, cat: 'arma', dmg: 1.1, range: 0.85, cd: 0.45, noise: 2, push: 0.1, dur: 25, tool: ['cortar'] },
  machado: { n: 'Machado', icon: 'machado', w: 2.0, cat: 'arma', dmg: 2.6, range: 1.2, cd: 1.05, noise: 5, push: 0.9, dur: 60, tool: ['cortarArvore'] },
  martelo: { n: 'Martelo', icon: 'martelo', w: 0.6, cat: 'arma', dmg: 0.9, range: 0.9, cd: 0.6, noise: 4, push: 0.4, dur: 50, tool: ['martelar'] },
  lanca: { n: 'Lança de madeira', icon: 'lanca', w: 1.0, cat: 'arma', dmg: 1.4, range: 1.6, cd: 0.75, noise: 3, push: 0.3, dur: 20 },
  pistola: { n: 'Pistola', icon: 'pistola', w: 0.8, cat: 'arma', dmg: 3.5, range: 10, cd: 0.6, noise: 26, push: 0.2, dur: 400, gun: true },
  municao: { n: 'Munição (caixa)', icon: 'municao', w: 0.2, cat: 'util', balas: 10 },
  serrote: { n: 'Serrote', icon: 'serrote', w: 0.6, cat: 'util', tool: ['serrar'] },
  pregos: { n: 'Pregos', icon: 'pregos', w: 0.05, cat: 'material' },
  tabua: { n: 'Tábua', icon: 'tabua', w: 1.0, cat: 'material' },
  tora: { n: 'Tora', icon: 'tora', w: 3.0, cat: 'material' },
  trapo: { n: 'Trapo', icon: 'trapo', w: 0.05, cat: 'medico', cura: 1 },
  bandagem: { n: 'Bandagem', icon: 'bandagem', w: 0.05, cat: 'medico', cura: 2 },
  desinfetante: { n: 'Desinfetante', icon: 'desinfetante', w: 0.3, cat: 'medico' },
  analgesico: { n: 'Analgésico', icon: 'analgesico', w: 0.05, cat: 'medico', dor: true },
  isqueiro: { n: 'Isqueiro', icon: 'isqueiro', w: 0.05, cat: 'util', fogo: true },
  fosforo: { n: 'Fósforos', icon: 'fosforo', w: 0.05, cat: 'util', fogo: true },
  lanterna: { n: 'Lanterna', icon: 'lanterna', w: 0.3, cat: 'util' },
  galao: { n: 'Galão vazio', icon: 'galao', w: 0.5, cat: 'util' },
  galaoCheio: { n: 'Galão de gasolina', icon: 'galaoCheio', w: 4.0, cat: 'util', litros: 10 },
  gerador: { n: 'Gerador', icon: 'gerador', w: 22, cat: 'util' },
  pecas: { n: 'Peças de carro', icon: 'pecas', w: 1.2, cat: 'util' },
  panela: { n: 'Panela', icon: 'panela', w: 0.8, cat: 'util' },
};
const SKILLS = ['carpintaria', 'mecanica', 'culinaria', 'socorros', 'eletricidade'];
const SKILL_NAME = { carpintaria: 'Carpintaria', mecanica: 'Mecânica', culinaria: 'Culinária', socorros: 'Primeiros socorros', eletricidade: 'Eletricidade' };
const SKILL_COL = { carpintaria: '#a83a3a', mecanica: '#3a6aa8', culinaria: '#d8b040', socorros: '#e8e0d0', eletricidade: '#8a4aa8' };
const SKILL_USE = {
  carpintaria: 'Nível 1: barricar. Nível 2: paredes e desmontar móveis. Mais nível: madeira mais forte e mais rápida.',
  mecanica: 'Nível 2: tirar gasolina de carros. Nível 3: tirar peças. Mais nível: mais rápido.',
  culinaria: 'Comida cozida rende mais a cada nível.',
  socorros: 'Bandagens mais rápidas e feridas fecham mais rápido.',
  eletricidade: 'Nível 2: ligar o gerador.',
};
function itemDef(id) {
  if (id.startsWith('livro:')) { const [, sk, lv] = id.split(':'); return { n: `${SKILL_NAME[sk]} ${lv}`, icon: 'livro', w: 0.4, cat: 'livro', skill: sk, lvl: +lv, tint: SKILL_COL[sk] }; }
  return ITEMS[id];
}
function itemName(it) { const d = itemDef(it.id); let s = d.n; if (it.id === 'pistola') s += ` (${it.balas || 0})`; if (d.cat === 'arma' && it.dur != null && d.dur < 1e8) s += ` ${Math.round(100 * it.dur / d.dur)}%`; if (d.perec && it.age != null && it.age > d.perec) s += ' (estragado)'; return s; }
function newItem(id) { const d = itemDef(id); const it = { id }; if (d && d.cat === 'arma' && d.dur < 1e8) it.dur = d.dur; if (d && d.perec) it.age = 0; if (id === 'pistola') it.balas = 0; return it; }

// loot tables: [id, weight]; books by 'livro~min~max'
const LOOT = {
  guarda: { n: [1, 3], t: [['camiseta', 5], ['camisa', 3], ['moletom', 3], ['jeans', 5], ['calcaMol', 3], ['tenis', 4], ['botas', 1.5], ['gorro', 2], ['jaqueta', 1.2], ['luvas', 1.5], ['mochila', 1.2]] },
  comoda: { n: [0, 3], t: [['camiseta', 4], ['calcaMol', 2], ['gorro', 2], ['luvas', 1], ['isqueiro', 1], ['lanterna', 1], ['analgesico', 1], ['livro~1~3', 1.5]] },
  armario: { n: [1, 3], t: [['jaquetaBomb', 3], ['calcaBomb', 3], ['botas', 3], ['capacete', 2], ['machado', 4], ['camiseta', 2], ['lanterna', 1.5], ['luvas', 2]] },
  geladeira: { n: [1, 3], t: [['carne', 3], ['leite', 3], ['ovo', 3], ['maca', 3], ['pao', 2], ['agua', 3], ['refri', 2]] },
  balcao: { n: [0, 3], t: [['feijao', 4], ['sopa', 3], ['salgadinho', 3], ['agua', 3], ['faca', 2], ['fosforo', 2], ['isqueiro', 1], ['panela', 1.5], ['refri', 1]] },
  pia: { n: [0, 2], t: [['desinfetante', 2], ['trapo', 3], ['agua', 1]] },
  fogao: { n: [0, 1], t: [['panela', 3], ['fosforo', 1]] },
  estante: { n: [1, 3], t: [['livro~1~3', 10]] },
  estanteBib: { n: [2, 4], t: [['livro~1~4', 8], ['livro~3~6', 4], ['livro~5~10', 1.2]] },
  escrivaninha: { n: [0, 2], t: [['livro~1~3', 2], ['isqueiro', 1], ['lanterna', 1.5], ['analgesico', 1], ['municao', 0.3]] },
  prateleira: { n: [1, 3], t: [['martelo', 3], ['pregos', 5], ['serrote', 2.5], ['tabua', 3], ['galao', 2.5], ['cano', 2], ['lanterna', 1], ['taco', 1], ['luvas', 1.5]] },
  caixote: { n: [1, 3], t: [['pregos', 4], ['tabua', 3], ['feijao', 2], ['sopa', 2], ['agua', 1]] },
  remedios: { n: [1, 3], t: [['bandagem', 5], ['desinfetante', 3], ['analgesico', 3], ['livro~1~4:socorros', 1]] },
  loja: { n: [1, 4], t: [['salgadinho', 4], ['refri', 4], ['agua', 4], ['feijao', 2], ['isqueiro', 2], ['lanterna', 1], ['galao', 2]] },
  feno: { n: [0, 2], t: [['racao', 5], ['martelo', 1], ['pregos', 1.5], ['galao', 1]] },
  carro: { n: [0, 2], t: [['galao', 3], ['martelo', 1], ['mochila', 1], ['agua', 1], ['taco', 0.8], ['livro~1~3:mecanica', 1.2]] },
  caminhao: { n: [2, 3], t: [['machado', 5], ['lanterna', 3], ['capacete', 2], ['bandagem', 2]] },
  delegacia: { n: [1, 2], t: [['pistola', 2], ['municao', 4]] },
};

const RECIPES = [
  { id: 'tabuas', n: 'Serrar tora em 3 tábuas', need: [['tora', 1]], tools: ['serrote'], out: [['tabua', 3]], time: 4, skill: ['carpintaria', 1], anim: 'hammer', noise: 5 },
  { id: 'trapos', n: 'Rasgar roupa em trapos', needAny: 'tecido', out: [['trapo', 3]], time: 2, anim: 'search' },
  { id: 'bandagem', n: 'Bandagem limpa', need: [['trapo', 2], ['desinfetante', 1]], out: [['bandagem', 2]], time: 2, skill: ['socorros', 1], anim: 'bandage' },
  { id: 'lanca', n: 'Lança de madeira', need: [['tabua', 1]], tools: ['faca'], out: [['lanca', 1]], time: 4, skill: ['carpintaria', 1], anim: 'search' },
  { id: 'bife', n: 'Assar carne', need: [['carne', 1]], fire: true, out: [['bife', 1]], time: 4, skill: ['culinaria', 1], anim: 'search', cook: true },
  { id: 'ovoFrito', n: 'Fritar ovo', need: [['ovo', 1]], fire: true, out: [['ovoFrito', 1]], time: 3, skill: ['culinaria', 1], anim: 'search', cook: true },
  { id: 'municao', n: 'Abrir caixa de munição', need: [['municao', 1]], out: [], time: 1, anim: 'search', balas: true },
];

const BUILDS = [
  { id: 'barricar', n: 'Barricar janela/porta', cost: [['tabua', 1], ['pregos', 2]], tool: 'martelo', skill: ['carpintaria', 1], time: 4 },
  { id: 'parede', n: 'Parede de madeira', cost: [['tabua', 3], ['pregos', 4]], tool: 'martelo', skill: ['carpintaria', 2], time: 7 },
  { id: 'fogueira', n: 'Fogueira', cost: [['tabua', 2]], alt: [['tora', 1]], fire: true, skill: ['carpintaria', 1], time: 3 },
  { id: 'desmontar', n: 'Desmontar móvel', cost: [], tool: 'martelo', skill: ['carpintaria', 2], time: 5 },
];

// the emergency radio: one line every two game hours, by day
const RADIO = {
  1: ['Rádio de emergência: fiquem em casa e tranquem portas e janelas.', 'Atenção: a companhia de energia avisa que em 4 dias a cidade ficará sem luz.', 'Os infectados são atraídos pelo barulho. Evitem correr e atirar.'],
  2: ['Repetindo: em 3 dias a cidade ficará sem luz.', 'Uma mordida é fatal. Não há cura. Protejam braços e pernas.', 'Barricadas de madeira seguram os infectados por um tempo.'],
  3: ['Em 2 dias a cidade ficará sem luz.', 'Relatos de infectados que correm. Muito cuidado à noite.', 'Bibliotecas guardam livros de ofícios. Aprendam enquanto podem.'],
  4: ['Hoje a cidade fica sem luz. Procurem geradores em galpões e fazendas.', 'Gasolina nos postos. Um gerador faz barulho: protejam a base.', 'A água vai acabar amanhã. Guardem garrafas.'],
  5: ['...shhhh... água cortada... shhh...', '...os animais das fazendas... alguém cuide... shhh...', '...shhhhhhhh...'],
};
// TV: what airs at each hour while there is power
const TV = [
  { h0: 8, h1: 10, n: 'Mãos à Obra', skill: 'carpintaria' },
  { h0: 11, h1: 13, n: 'Cozinha Fácil', skill: 'culinaria' },
  { h0: 14, h1: 16, n: 'Garagem do Zé', skill: 'mecanica' },
  { h0: 17, h1: 19, n: 'Socorro em Casa', skill: 'socorros' },
  { h0: 19, h1: 21, n: 'Eletricista Amigo', skill: 'eletricidade' },
];

const PROFS = [
  { id: 'bombeiro', n: 'Bombeiro', d: 'Mais fôlego para correr e golpear.', mod: { folego: 1.35 }, pts: 5 },
  { id: 'policial', n: 'Policial', d: 'Mira melhor com a pistola.', mod: { mira: 1.5 }, pts: 6 },
  { id: 'enfermeira', n: 'Enfermeira', d: 'Bandagens e feridas curam mais rápido.', mod: { cura: 1.6 }, pts: 6 },
  { id: 'cozinheiro', n: 'Cozinheiro', d: 'Fica com fome mais devagar.', mod: { fome: 0.8 }, pts: 7 },
  { id: 'desempregado', n: 'Desempregado', d: 'Nenhuma vantagem de ofício, mais pontos.', mod: {}, pts: 8 },
];
const MAX_GOOD = 3, MAX_BAD = 3; // at most three advantages and three disadvantages
const TRAITS = [
  { id: 'pesLeves', n: 'Pés leves', c: -4, d: 'Faz menos barulho ao andar e correr.' },
  { id: 'forte', n: 'Forte', c: -6, d: 'Golpes 25% mais fortes, carrega +4.' },
  { id: 'leitor', n: 'Leitor rápido', c: -3, d: 'Lê livros 40% mais rápido.' },
  { id: 'olhos', n: 'Olhos de gato', c: -2, d: 'Enxerga melhor no escuro.' },
  { id: 'resist', n: 'Pele dura', c: -4, d: 'Menos chance de se ferir.' },
  { id: 'desastrado', n: 'Desastrado', c: 4, d: 'Mais barulho em tudo.' },
  { id: 'fraco', n: 'Fraco', c: 5, d: 'Golpes 25% mais fracos, carrega -3.' },
  { id: 'fominha', n: 'Fome rápida', c: 3, d: 'Fome e sede sobem mais rápido.' },
  { id: 'friorento', n: 'Friorento', c: 3, d: 'Sente mais frio.' },
  { id: 'lento', n: 'Leitor lento', c: 2, d: 'Lê livros 40% mais devagar.' },
];

const ZKINDS = {
  comum: { n: 'Zumbi comum', hp: 3, speed: 'zumbi_speed', reach: 0.62, hitRate: 1.0, sight: 1 },
  gordo: { n: 'Zumbi gordo', hp: 6.5, speed: 'zumbi_gordo_speed', reach: 0.66, hitRate: 0.9, sight: 0.8, fat: true },
  corredor: { n: 'Corredor', hp: 2.6, speed: 'corredor_speed', reach: 0.62, hitRate: 1.2, sight: 1.3, runner: true },
  rastejante: { n: 'Rastejante', hp: 2, speed: 'rastejante_speed', reach: 0.5, hitRate: 0.8, sight: 0.6, crawl: true },
};
const ZOUTFITS = [
  { top: '#6d7f9a', pants: '#5b4a3a', hair: '#3a3a30' }, { top: '#9a6a5a', pants: '#3b4f86', hair: null }, { top: '#5a7a5a', pants: '#4a4a4a', hair: '#6a4a2a' },
  { top: '#c8c0b0', pants: '#2a3860', hair: '#2a2420' }, { top: '#7a5a8a', pants: '#5a5048', hair: null }, { top: '#3a4a6a', pants: '#6a5a4a', hair: '#a08060' },
];
