// PROTOTYPE - NOT FOR PRODUCTION
// Question: vasculhar a cidade só de cueca, sob a pressão do barulho, do frio e da fome, e montar uma base barricada é tenso e divertido por 20 minutos?
// Date: 2026-11-17
// 3D models of everything that stands on a tile: furniture, trees, cars, lamps, farm things.
// Each model is a list of parts [material key, positions, normals] in tile-local units: x and z
// from -0.5 to 0.5 across the tile, y up, the front facing +z. The world merges them per chunk.
'use strict';

// materials by key; made once r3Init has three.js
function r3MatTable(T) {
  const S = (color, o = {}) => new T.MeshStandardMaterial(Object.assign({ color, roughness: 0.8 }, o));
  return {
    woodL: S('#a07a52', { roughness: 0.7 }), woodD: S('#5e4230', { roughness: 0.7 }), woodR: S('#7a5a3a', { roughness: 0.9 }),
    white: S('#e6e6e0', { roughness: 0.35, metalness: 0.1 }), steel: S('#9aa0a6', { roughness: 0.35, metalness: 0.8 }), dark: S('#24262a', { roughness: 0.5 }),
    screen: S('#0c0e12', { roughness: 0.1, metalness: 0.4 }), screenOn: S('#6aa8e0', { emissive: '#3a78c0', emissiveIntensity: 1.2 }),
    sheet: S('#e8eaec', { roughness: 0.95 }), red: S('#a83a3a'), blue: S('#3a5a9a'), green: S('#4a7a4a'), purple: S('#7a5a9a'), yellow: S('#d8b040'),
    fabric0: S('#6a5a4a', { roughness: 1 }), fabric1: S('#4a5a6a', { roughness: 1 }), fabric2: S('#7a4a3a', { roughness: 1 }), fabric3: S('#5a6a4a', { roughness: 1 }),
    bark: S('#4e3a28', { roughness: 1 }), leaf0: S('#3a6a2a', { roughness: 0.95 }), leaf1: S('#4a7a30', { roughness: 0.95 }), leaf2: S('#2f5a28', { roughness: 0.95 }), leafHi: S('#6a9a44', { roughness: 0.95 }),
    stump: S('#c8a070', { roughness: 0.9 }), hay: S('#d8b860', { roughness: 1 }), crate: S('#9a7a4a', { roughness: 0.9 }), concrete: S('#8a8a86', { roughness: 0.9 }),
    pole: S('#3a3c40', { roughness: 0.5, metalness: 0.6 }), lamp: S('#f0e0b0', { emissive: '#000000' }), lampOn: S('#fff0c0', { emissive: '#ffd890', emissiveIntensity: 2 }),
    rubber: S('#18181a', { roughness: 0.9 }), chrome: S('#c8c8c8', { roughness: 0.25, metalness: 1 }), glassCar: S('#1a242c', { roughness: 0.05, metalness: 0.7 }),
    light: S('#f0f0e0', { emissive: '#303028' }), redLight: S('#a01010', { emissive: '#300000' }), fireRed: S('#c02018', { roughness: 0.4, metalness: 0.3 }),
    green2: S('#3a6a3a'), orange: S('#d07020'), water: S('#3a6a8a', { roughness: 0.1 }), food: S('#a08040'), fire: S('#ffa040', { emissive: '#ff7020', emissiveIntensity: 3 }),
    paint0: S('#5a6a8a', { roughness: 0.35, metalness: 0.5 }), paint1: S('#8a3a3a', { roughness: 0.35, metalness: 0.5 }), paint2: S('#d8d4c8', { roughness: 0.35, metalness: 0.5 }),
    paint3: S('#3a5a3a', { roughness: 0.35, metalness: 0.5 }), paint4: S('#c8a040', { roughness: 0.35, metalness: 0.5 }), paint5: S('#4a4a52', { roughness: 0.35, metalness: 0.5 }),
    tarp: S('#4a4e52', { roughness: 0.95 }), books: S('#8a5a3a'), blood: S('#3a0806', { roughness: 0.25, transparent: true, opacity: 0.85, depthWrite: false }),
  };
}
const CAR_PAINT = { '#5a6a8a': 'paint0', '#8a3a3a': 'paint1', '#d8d4c8': 'paint2', '#3a5a3a': 'paint3', '#c8a040': 'paint4', '#4a4a52': 'paint5' };

// ---- building parts ---------------------------------------------------------------------------------
function r3Part(T, geo) { const g = geo.index ? geo.toNonIndexed() : geo; return { p: g.attributes.position.array, n: g.attributes.normal.array }; }
function r3ModelMaker(T) {
  const list = []; // geometries are read when the model is done, so a part can still be turned after it is made
  const put = (mat, geo) => { list.push([mat, geo]); return geo; };
  return {
    get parts() { return list.map(([m, g]) => [m, r3Part(T, g)]); },
    box(mat, x0, y0, z0, x1, y1, z1) { const g = new T.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); return put(mat, g); },
    cyl(mat, x, y0, z, r0, r1, h, seg = 10) { const g = new T.CylinderGeometry(r1, r0, h, seg); g.translate(x, y0 + h / 2, z); return put(mat, g); },
    cylX(mat, x0, x1, y, z, r, seg = 12) { const g = new T.CylinderGeometry(r, r, x1 - x0, seg); g.rotateZ(Math.PI / 2); g.translate((x0 + x1) / 2, y, z); return put(mat, g); },
    ball(mat, x, y, z, r, sy = 1, det = 1) { const g = new T.IcosahedronGeometry(r, det); g.scale(1, sy, 1); g.translate(x, y, z); return put(mat, g); },
    cone(mat, x, y0, z, r, h, seg = 8) { const g = new T.ConeGeometry(r, h, seg); g.translate(x, y0 + h / 2, z); return put(mat, g); },
    // a side profile (in x,y) pushed out along z: car bodies
    extrude(mat, pts, z0, z1, bevel = 0.02) { const s = new T.Shape(); s.moveTo(pts[0][0], pts[0][1]); for (const q of pts.slice(1)) s.lineTo(q[0], q[1]); const g = new T.ExtrudeGeometry(s, { depth: z1 - z0 - bevel * 2, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2 }); g.translate(0, 0, z0 + bevel); g.computeVertexNormals(); return put(mat, g); },
  };
}

// ---- the models -------------------------------------------------------------------------------------
/** The model for furniture of type t, variant v, in state st. Cached by the caller. */
function r3FurnModel(T, t, v, st) {
  const M = r3ModelMaker(T), B = M.box.bind(M);
  const fab = 'fabric' + (v % 4), sheet = ['blue', 'red', 'green', 'purple'][v % 4];
  switch (t) {
    case 'arvore': {
      // a broadleaf: trunk, a fork, a crown of leafy clumps, lit on top
      const s = 0.9 + (v % 5) * 0.06, lv = 'leaf' + (v % 3);
      M.cyl('bark', 0, 0, 0, 0.09 * s, 0.06 * s, 0.75 * s, 7);
      M.cyl('bark', 0.05, 0.55 * s, 0.02, 0.04, 0.025, 0.35 * s, 5).rotateZ(-0.5);
      const clumps = [[0, 1.12, 0, 0.5], [0.3, 1.0, 0.12, 0.36], [-0.28, 1.02, -0.08, 0.36], [0.08, 1.04, -0.3, 0.34], [-0.1, 1.0, 0.3, 0.34], [0.05, 1.4, 0.02, 0.36]];
      for (const [x, y, z, r] of clumps) M.ball(lv, x * s, y * s, z * s, r * s, 0.9, 1);
      M.ball('leafHi', -0.08 * s, 1.5 * s, -0.06 * s, 0.22 * s, 0.8, 1);
      return M.parts;
    }
    case 'toco': M.cyl('bark', 0, 0, 0, 0.11, 0.1, 0.14, 8); M.cyl('stump', 0, 0.14, 0, 0.1, 0.1, 0.005, 8); return M.parts;
    case 'arbusto': { const lv = 'leaf' + (v % 3); M.ball(lv, 0, 0.18, 0, 0.26, 0.75, 1); M.ball(lv, 0.15, 0.14, 0.1, 0.17, 0.8, 1); M.ball('leafHi', -0.08, 0.26, -0.05, 0.12, 0.8, 1); return M.parts; }
    case 'cama': B('woodD', -0.38, 0, -0.45, 0.38, 0.14, 0.45); B('sheet', -0.36, 0.14, -0.43, 0.36, 0.24, 0.43); B(sheet, -0.37, 0.2, -0.1, 0.37, 0.26, 0.44); B('sheet', -0.28, 0.24, -0.42, 0.28, 0.3, -0.24); B('woodD', -0.38, 0, -0.48, 0.38, 0.42, -0.43); return M.parts;
    case 'camaHosp': B('steel', -0.36, 0, -0.45, 0.36, 0.22, 0.45); B('sheet', -0.34, 0.22, -0.43, 0.34, 0.3, 0.43); B('blue', -0.35, 0.27, -0.05, 0.35, 0.31, 0.43); B('steel', -0.36, 0.22, -0.47, 0.36, 0.46, -0.43); M.cyl('steel', 0.4, 0, -0.35, 0.01, 0.01, 0.7, 6); return M.parts;
    case 'sofa': B(fab, -0.44, 0, -0.32, 0.44, 0.2, 0.3); B(fab, -0.44, 0.2, -0.32, 0.44, 0.42, -0.16); B(fab, -0.44, 0.2, -0.32, -0.34, 0.3, 0.3); B(fab, 0.34, 0.2, -0.32, 0.44, 0.3, 0.3); B(fab, -0.33, 0.2, -0.15, 0.33, 0.25, 0.28); return M.parts;
    case 'mesa': B('woodL', -0.4, 0.34, -0.3, 0.4, 0.37, 0.3); for (const [x, z] of [[-0.36, -0.26], [0.36, -0.26], [-0.36, 0.26], [0.36, 0.26]]) B('woodL', x - 0.025, 0, z - 0.025, x + 0.025, 0.34, z + 0.025); return M.parts;
    case 'escrivaninha': B('woodD', -0.42, 0.34, -0.25, 0.42, 0.37, 0.25); B('woodD', -0.42, 0, -0.25, -0.18, 0.34, 0.25); B('woodD', 0.38, 0, -0.25, 0.42, 0.34, 0.25); B('dark', -0.1, 0.37, -0.15, 0.12, 0.38, 0.05); return M.parts;
    case 'cadeira': B('woodL', -0.17, 0.2, -0.17, 0.17, 0.23, 0.17); B('woodL', -0.17, 0.23, -0.19, 0.17, 0.48, -0.15); for (const [x, z] of [[-0.15, -0.15], [0.15, -0.15], [-0.15, 0.15], [0.15, 0.15]]) B('woodL', x - 0.02, 0, z - 0.02, x + 0.02, 0.2, z + 0.02); return M.parts;
    case 'banco': B('woodR', -0.42, 0.2, -0.14, 0.42, 0.24, 0.14); B('woodR', -0.42, 0.26, -0.16, 0.42, 0.42, -0.12); for (const x of [-0.36, 0.36]) B('pole', x - 0.03, 0, -0.14, x + 0.03, 0.2, 0.14); return M.parts;
    case 'guarda': B('woodD', -0.4, 0, -0.42, 0.4, 0.95, -0.12); B('woodL', -0.38, 0.03, -0.12, -0.01, 0.92, -0.11); B('woodL', 0.01, 0.03, -0.12, 0.38, 0.92, -0.11); B('chrome', -0.05, 0.45, -0.11, -0.03, 0.55, -0.1); B('chrome', 0.03, 0.45, -0.11, 0.05, 0.55, -0.1); return M.parts;
    case 'armario': for (const x of [-0.27, 0, 0.27]) { B('steel', x - 0.13, 0, -0.42, x + 0.13, 0.92, -0.16); B('dark', x - 0.06, 0.78, -0.16, x + 0.06, 0.8, -0.15); B('dark', x - 0.06, 0.74, -0.16, x + 0.06, 0.76, -0.15); } return M.parts;
    case 'comoda': B('woodL', -0.38, 0, -0.42, 0.38, 0.45, -0.12); for (const y of [0.08, 0.22, 0.36]) B('woodD', -0.35, y, -0.12, 0.35, y + 0.1, -0.11); return M.parts;
    case 'geladeira': B('white', -0.24, 0, -0.44, 0.24, 0.9, -0.12); B('steel', 0.18, 0.5, -0.12, 0.2, 0.8, -0.1); B('dark', -0.24, 0.6, -0.12, 0.24, 0.61, -0.11); return M.parts;
    case 'fogao': B('white', -0.24, 0, -0.44, 0.24, 0.45, -0.14); B('dark', -0.22, 0.45, -0.42, 0.22, 0.46, -0.16); for (const [x, z] of [[-0.1, -0.35], [0.1, -0.35], [-0.1, -0.24], [0.1, -0.24]]) M.cyl('steel', x, 0.46, z, 0.045, 0.045, 0.01, 10); B('dark', -0.2, 0.08, -0.14, 0.2, 0.32, -0.13); return M.parts;
    case 'pia': B('woodL', -0.4, 0, -0.44, 0.4, 0.44, -0.14); B('steel', -0.25, 0.44, -0.4, 0.15, 0.46, -0.18); M.cyl('chrome', -0.05, 0.46, -0.42, 0.012, 0.012, 0.14, 6); return M.parts;
    case 'balcao': B('woodD', -0.48, 0, -0.3, 0.48, 0.45, 0.2); B('woodL', -0.5, 0.45, -0.32, 0.5, 0.48, 0.22); return M.parts;
    case 'estante': {
      B('woodD', -0.42, 0, -0.44, 0.42, 0.95, -0.2);
      const cols = ['red', 'blue', 'yellow', 'green', 'purple', 'sheet'];
      for (let r = 0; r < 4; r++) for (let k = 0; k < 7; k++) { const x = -0.38 + k * 0.11, y = 0.06 + r * 0.22; B(cols[(k * 3 + r + v) % 6], x, y, -0.39, x + 0.09, y + 0.15 + ((k + r) % 3) * 0.015, -0.2); }
      return M.parts;
    }
    case 'prateleira': {
      for (const x of [-0.45, 0.45]) B('steel', x - 0.02, 0, -0.3, x + 0.02, 0.85, 0.3);
      for (const y of [0.05, 0.32, 0.6]) { B('steel', -0.45, y, -0.3, 0.45, y + 0.02, 0.3); for (let k = 0; k < 5; k++) B(['red', 'yellow', 'blue', 'green', 'orange'][(k + v) % 5], -0.38 + k * 0.16, y + 0.02, -0.15, -0.28 + k * 0.16, y + 0.16, 0.12); }
      return M.parts;
    }
    case 'remedios': B('white', -0.35, 0, -0.44, 0.35, 0.85, -0.18); B('red', -0.06, 0.62, -0.18, 0.06, 0.66, -0.17); B('red', -0.02, 0.58, -0.18, 0.02, 0.7, -0.17); return M.parts;
    case 'tv': B('woodD', -0.3, 0, -0.38, 0.3, 0.3, -0.12); B('dark', -0.26, 0.3, -0.28, 0.26, 0.62, -0.24); B(st === 'on' ? 'screenOn' : 'screen', -0.24, 0.32, -0.24, 0.24, 0.6, -0.23); return M.parts;
    case 'radio': B('woodL', -0.2, 0, -0.2, 0.2, 0.34, 0.2); B('dark', -0.12, 0.34, -0.06, 0.12, 0.46, 0.04); B(st === 'on' ? 'lampOn' : 'steel', -0.1, 0.36, 0.04, 0.0, 0.44, 0.045); M.cyl('chrome', 0.1, 0.46, -0.02, 0.005, 0.005, 0.18, 4); return M.parts;
    case 'caixote': B('crate', -0.22, 0, -0.22, 0.22, 0.36, 0.22); B('woodD', -0.23, 0.15, -0.23, 0.23, 0.2, 0.23); return M.parts;
    case 'feno': M.cylX('hay', -0.35, 0.35, 0.28, 0, 0.28, 14); return M.parts;
    case 'lixeira': M.cyl('green2', 0, 0, 0, 0.17, 0.19, 0.45, 12); M.cyl('dark', 0, 0.45, 0, 0.2, 0.19, 0.03, 12); return M.parts;
    case 'placa': M.cyl('pole', 0, 0, 0, 0.025, 0.025, 0.85, 6); B('white', -0.3, 0.6, -0.02, 0.3, 0.9, 0.02); B('red', -0.28, 0.62, 0.02, 0.28, 0.88, 0.025); return M.parts;
    case 'poste': M.cyl('pole', 0, 0, 0, 0.05, 0.035, 2.1, 8); B('pole', -0.02, 2.05, -0.02, 0.5, 2.08, 0.02); B(st === 'on' ? 'lampOn' : 'lamp', 0.38, 1.98, -0.06, 0.56, 2.05, 0.06); return M.parts;
    case 'bomba': B('red', -0.18, 0, -0.12, 0.18, 0.75, 0.12); B('white', -0.16, 0.5, 0.12, 0.16, 0.68, 0.13); B(st === 'on' ? 'screenOn' : 'screen', -0.1, 0.55, 0.13, 0.1, 0.63, 0.135); M.cyl('dark', 0.2, 0.2, 0, 0.02, 0.02, 0.35, 6); B('concrete', -0.3, 0, -0.25, 0.3, 0.04, 0.25); return M.parts;
    case 'gerador': B('yellow', -0.24, 0, -0.18, 0.24, 0.32, 0.18); B('dark', -0.26, 0, -0.2, 0.26, 0.05, 0.2); B('dark', -0.1, 0.32, -0.08, 0.1, 0.38, 0.08); B(st === 'on' ? 'lampOn' : 'steel', 0.12, 0.2, 0.18, 0.18, 0.26, 0.19); return M.parts;
    case 'fogueira': { for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; M.ball('concrete', Math.cos(a) * 0.22, 0.04, Math.sin(a) * 0.22, 0.06, 0.7, 0); } for (let k = 0; k < 3; k++) M.cylX('woodD', -0.18, 0.18, 0.05, 0, 0.035, 6).rotateY(k * 1.05); if (st === 'on') { M.cone('fire', 0, 0.04, 0, 0.13, 0.36, 7); M.cone('yellow', 0.04, 0.04, 0.03, 0.07, 0.24, 6); } return M.parts; }
    case 'cocho': B('woodR', -0.42, 0, -0.2, 0.42, 0.22, 0.2); if (st === 'agua' || st === 'ambos') B('water', -0.38, 0.17, -0.16, 0, 0.19, 0.16); if (st === 'comida' || st === 'ambos') B('food', 0, 0.17, -0.16, 0.38, 0.2, 0.16); return M.parts;
    case 'galinheiro': B('woodR', -0.4, 0, -0.35, 0.4, 0.5, 0.35); M.extrude('red', [[-0.45, 0.5], [0.45, 0.5], [0, 0.78]], -0.4, 0.4, 0); B('dark', -0.1, 0, 0.35, 0.1, 0.25, 0.36); return M.parts;
  }
  B('crate', -0.25, 0, -0.25, 0.25, 0.4, 0.25); return M.parts;
}
/** A car (or the fire truck) as parts in its own frame: length along z, centred. */
function r3CarModel(T, kind, colKey) {
  const M = r3ModelMaker(T), B = M.box.bind(M);
  if (kind === 'caminhao') {
    // a fire truck: cab, long body, ladder
    const L = 3.6, w = 0.95;
    M.extrude('fireRed', [[-w / 2, 0.22], [w / 2, 0.22], [w / 2, 0.95], [-w / 2, 0.95]], -L / 2, L / 2 - 0.9, 0.03);
    M.extrude('fireRed', [[-w / 2, 0.22], [w / 2, 0.22], [w / 2, 0.85], [w / 2 - 0.05, 1.05], [-w / 2 + 0.05, 1.05], [-w / 2, 0.85]], L / 2 - 0.88, L / 2, 0.04);
    B('glassCar', -w / 2 + 0.06, 0.72, L / 2 - 0.02, w / 2 - 0.06, 1.0, L / 2 + 0.005);
    for (const x of [-0.18, 0.18]) B('chrome', x - 0.03, 0.98, -L / 2 + 0.2, x + 0.03, 1.02, L / 2 - 1.0);
    for (let k = 0; k < 9; k++) B('chrome', -0.18, 0.98, -L / 2 + 0.3 + k * 0.28, 0.18, 1.01, -L / 2 + 0.33 + k * 0.28);
    B('redLight', -0.3, 1.05, L / 2 - 0.5, 0.3, 1.1, L / 2 - 0.4);
    for (const z of [-L / 2 + 0.6, -L / 2 + 1.1, L / 2 - 0.6]) for (const x of [-w / 2 + 0.02, w / 2 - 0.02]) { M.cylX('rubber', x - 0.1, x + 0.1, 0.22, z, 0.22, 16); M.cylX('chrome', x - 0.105, x + 0.105, 0.22, z, 0.11, 10); }
    return M.parts;
  }
  // a sedan: side profile with hood, cabin and trunk, rounded by bevels
  const L = 1.9, w = 0.82, h0 = 0.12, paint = colKey || 'paint0';
  const prof = [[-L / 2, h0 + 0.06], [-L / 2 + 0.05, h0], [L / 2 - 0.05, h0], [L / 2, h0 + 0.06], [L / 2, 0.38], [L / 2 - 0.42, 0.42], [L / 2 - 0.7, 0.66], [-L / 2 + 0.55, 0.66], [-L / 2 + 0.28, 0.44], [-L / 2, 0.4]];
  M.extrude(paint, prof.map(([z, y]) => [z, y]), -w / 2, w / 2, 0.04).rotateY(-Math.PI / 2);
  // windows: a band of dark glass just outside the cabin
  const win = [[L / 2 - 0.44, 0.44], [L / 2 - 0.69, 0.64], [-L / 2 + 0.56, 0.64], [-L / 2 + 0.31, 0.45]];
  M.extrude('glassCar', win, -w / 2 - 0.006, w / 2 + 0.006, 0).rotateY(-Math.PI / 2);
  for (const z of [-L / 2 + 0.34, L / 2 - 0.34]) for (const x of [-w / 2 + 0.02, w / 2 - 0.02]) { M.cylX('rubber', x - 0.07, x + 0.07, 0.15, z, 0.15, 16); M.cylX('chrome', x - 0.075, x + 0.075, 0.15, z, 0.08, 10); }
  for (const x of [-0.28, 0.28]) { B('light', x - 0.09, 0.3, L / 2 - 0.01, x + 0.09, 0.36, L / 2 + 0.01); B('redLight', x - 0.09, 0.32, -L / 2 - 0.01, x + 0.09, 0.37, -L / 2 + 0.01); }
  B('chrome', -w / 2 + 0.04, 0.14, L / 2 - 0.02, w / 2 - 0.04, 0.2, L / 2 + 0.03); B('chrome', -w / 2 + 0.04, 0.14, -L / 2 - 0.03, w / 2 - 0.04, 0.2, -L / 2 + 0.02);
  return M.parts;
}
