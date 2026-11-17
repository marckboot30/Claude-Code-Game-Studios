// PROTOTYPE - NOT FOR PRODUCTION
// Question: vasculhar a cidade só de cueca, sob a pressão do barulho, do frio e da fome, e montar uma base barricada é tenso e divertido por 20 minutos?
// Date: 2026-11-17
// The people in 3D: the survivor and every zombie share one body of jointed parts. Each part is a
// single instanced mesh for the whole crowd, coloured per figure (skin, shirt, trousers, shoes,
// hair), so a street full of zombies costs a handful of draw calls. A pose sets the joints; the
// walk swings them with the same phase the rules already keep (ft).
'use strict';

const PEOPLE_MAX = 220;
// the parts: name, geometry maker, how many per figure (paired parts are two)
function r3PeopleInit(T) {
  const cap = (r, l, ry = 0) => { const g = new T.CapsuleGeometry(r, l, 3, 8); g.translate(0, ry, 0); return g; };
  const P = {
    pelvis: (() => { const g = new T.CapsuleGeometry(0.058, 0.07, 3, 8); g.rotateZ(Math.PI / 2); g.scale(1, 1, 0.8); return g; })(),
    chest: (() => { const g = new T.CapsuleGeometry(0.085, 0.13, 4, 10); g.scale(1, 1, 0.66); g.translate(0, 0.12, 0); return g; })(),
    head: (() => { const g = new T.SphereGeometry(0.066, 14, 12); g.scale(0.9, 1.08, 1); return g; })(),
    hair: (() => { const g = new T.SphereGeometry(0.07, 14, 8, 0, Math.PI * 2, 0, 1.55); g.scale(0.92, 1.05, 1.04); g.translate(0, 0.008, -0.004); return g; })(),
    eye: (() => { const g = new T.SphereGeometry(0.011, 6, 5); return g; })(),
    brow: (() => { const g = new T.BoxGeometry(0.03, 0.008, 0.01); return g; })(),
    nose: (() => { const g = new T.BoxGeometry(0.018, 0.026, 0.02); g.translate(0, -0.005, 0.064); return g; })(),
    upperArm: cap(0.031, 0.12, -0.09), lowerArm: cap(0.027, 0.11, -0.085), hand: (() => { const g = new T.SphereGeometry(0.03, 8, 6); g.scale(0.8, 1, 0.6); return g; })(),
    upperLeg: cap(0.045, 0.14, -0.105), lowerLeg: cap(0.037, 0.14, -0.1), shoe: (() => { const g = new T.BoxGeometry(0.065, 0.04, 0.12); g.translate(0, -0.02, 0.025); return g; })(),
    bag: (() => { const g = new T.BoxGeometry(0.15, 0.17, 0.07); g.translate(0, 0, 0); return g; })(),
    hat: (() => { const g = new T.CylinderGeometry(0.07, 0.074, 0.05, 12); g.translate(0, 0.05, 0); return g; })(),
    weapon: (() => { const g = new T.BoxGeometry(0.03, 0.03, 0.42); g.translate(0, 0, 0.17); return g; })(),
    book: (() => { const g = new T.BoxGeometry(0.11, 0.015, 0.08); return g; })(),
  };
  const PAIR = { eye: 2, brow: 2, upperArm: 2, lowerArm: 2, hand: 2, upperLeg: 2, lowerLeg: 2, shoe: 2 };
  const mat = new T.MeshStandardMaterial({ color: '#ffffff', roughness: 0.75 });
  const parts = {};
  for (const [k, g] of Object.entries(P)) {
    const n = PEOPLE_MAX * (PAIR[k] || 1), m = new T.InstancedMesh(g, mat, n);
    m.instanceMatrix.setUsage(T.DynamicDrawUsage); m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; m.count = 0;
    m.setColorAt(0, new T.Color('#ffffff')); parts[k] = m; R3.root.add(m);
  }
  // the skeleton: joints, reused for every figure in turn
  const J = n => { const o = new T.Object3D(); o.name = n; return o; };
  const sk = {}; for (const n of ['root', 'hips', 'spine', 'neck', 'shL', 'elL', 'haL', 'shR', 'elR', 'haR', 'hipL', 'knL', 'anL', 'hipR', 'knR', 'anR', 'back']) sk[n] = J(n);
  sk.root.add(sk.hips); sk.hips.add(sk.spine, sk.hipL, sk.hipR); sk.spine.add(sk.neck, sk.shL, sk.shR, sk.back);
  sk.shL.add(sk.elL); sk.elL.add(sk.haL); sk.shR.add(sk.elR); sk.elR.add(sk.haR); sk.hipL.add(sk.knL); sk.knL.add(sk.anL); sk.hipR.add(sk.knR); sk.knR.add(sk.anR);
  sk.hips.position.y = 0.42; sk.spine.position.y = 0.035; sk.neck.position.y = 0.33; sk.back.position.set(0, 0.15, -0.085);
  sk.shL.position.set(0.105, 0.25, 0); sk.shR.position.set(-0.105, 0.25, 0); sk.elL.position.y = sk.elR.position.y = -0.18; sk.haL.position.y = sk.haR.position.y = -0.17;
  sk.hipL.position.set(0.055, -0.01, 0); sk.hipR.position.set(-0.055, -0.01, 0); sk.knL.position.y = sk.knR.position.y = -0.21; sk.anL.position.y = sk.anR.position.y = -0.2;
  R3.people = { parts, sk, col: new T.Color(), m: new T.Matrix4(), tmp: new T.Matrix4(), cnt: {} };
}
function r3PeopleBegin() { const P = R3.people; for (const k in P.parts) P.cnt[k] = 0; }
function r3PeopleEnd() { const P = R3.people; for (const k in P.parts) { const m = P.parts[k]; m.count = P.cnt[k]; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; } }
function r3Put(part, node, col, local) {
  const P = R3.people, m = P.parts[part], k = P.cnt[part]; if (k >= m.instanceMatrix.count) return;
  if (local) { P.tmp.multiplyMatrices(node.matrixWorld, local); m.setMatrixAt(k, P.tmp); } else m.setMatrixAt(k, node.matrixWorld);
  m.setColorAt(k, P.col.set(col)); P.cnt[part] = k + 1;
}
/**
 * Poses the shared skeleton and adds one figure to the crowd.
 * o: { x, y, face, look (colours), pose, ph (walk phase), lying, prone, fat, t }
 */
function r3Figure(o) {
  const sk = R3.people.sk, L = o.look, T = R3.T;
  // reset the joints
  for (const k in sk) sk[k].rotation.set(0, 0, 0);
  sk.hips.position.y = 0.42; sk.spine.rotation.x = 0;
  const ph = o.ph || 0, pose = o.pose || '';
  const sw = Math.sin(ph), sw2 = Math.sin(ph + Math.PI);
  if (pose === 'walk' || pose === 'run') {
    const a = pose === 'run' ? 0.85 : 0.5;
    sk.hipL.rotation.x = sw * a; sk.hipR.rotation.x = sw2 * a; sk.knL.rotation.x = Math.max(0, -Math.cos(ph)) * a * 1.4; sk.knR.rotation.x = Math.max(0, Math.cos(ph)) * a * 1.4;
    sk.shL.rotation.x = sw2 * a * 0.8; sk.shR.rotation.x = sw * a * 0.8; sk.elL.rotation.x = sk.elR.rotation.x = -0.3 - (pose === 'run' ? 0.9 : 0);
    sk.hips.position.y = 0.42 + Math.abs(Math.cos(ph)) * 0.012; if (pose === 'run') sk.spine.rotation.x = 0.18;
  }
  if (o.zombie && !o.lying) { // arms out in front, a shamble
    sk.shL.rotation.x = -1.35 + sw * 0.12; sk.shR.rotation.x = -1.25 + sw2 * 0.12; sk.shL.rotation.z = -0.12; sk.shR.rotation.z = 0.12; sk.elL.rotation.x = sk.elR.rotation.x = -0.15;
    sk.spine.rotation.x = 0.16; sk.neck.rotation.z = 0.25; sk.neck.rotation.x = 0.2;
    if (pose === 'attack') { sk.shL.rotation.x = sk.shR.rotation.x = -1.6 - (o.atk || 0) * 0.4; sk.spine.rotation.x = 0.35; }
  }
  if (!o.zombie) {
    if (pose === 'attack') { const k = o.swing || 0; sk.shR.rotation.x = -2.6 + (1 - k) * 2.6; sk.elR.rotation.x = -0.3; sk.spine.rotation.y = -0.3 + (1 - k) * 0.6; }
    if (pose === 'crouch') { sk.hips.position.y = 0.3; sk.hipL.rotation.x = sk.hipR.rotation.x = -1.0; sk.knL.rotation.x = sk.knR.rotation.x = 1.9; sk.spine.rotation.x = 0.35; }
    if (pose === 'sit') { sk.hips.position.y = 0.07; sk.hipL.rotation.x = sk.hipR.rotation.x = -1.5; sk.knL.rotation.x = sk.knR.rotation.x = 0.9; sk.shL.rotation.x = sk.shR.rotation.x = -0.4; sk.elL.rotation.x = sk.elR.rotation.x = -0.6; }
    if (pose === 'read') { sk.shL.rotation.x = sk.shR.rotation.x = -0.9; sk.shL.rotation.z = -0.3; sk.shR.rotation.z = 0.3; sk.elL.rotation.x = sk.elR.rotation.x = -1.2; sk.neck.rotation.x = 0.45; }
    if (pose === 'bandage') { const k = Math.sin((o.t || 0) * 8) * 0.25; sk.shL.rotation.x = -0.8 + k; sk.shR.rotation.x = -0.7 - k; sk.elL.rotation.x = sk.elR.rotation.x = -1.4; sk.shL.rotation.z = -0.35; sk.shR.rotation.z = 0.35; sk.neck.rotation.x = 0.5; }
    if (pose === 'search') { const k = Math.sin((o.t || 0) * 9) * 0.3; sk.spine.rotation.x = 0.45; sk.shL.rotation.x = -1.2 + k; sk.shR.rotation.x = -1.2 - k; sk.neck.rotation.x = 0.3; }
  }
  sk.root.position.set(o.x, 0, o.y); sk.root.rotation.set(0, o.face || 0, 0);
  if (o.lying) { // flat on the back (or the front, crawling), arms out
    sk.root.rotation.set(o.prone ? Math.PI / 2 : -Math.PI / 2, 0, 0); sk.root.rotation.order = 'YXZ'; sk.root.rotation.y = o.face || 0;
    sk.root.position.y = 0.06; sk.hips.position.y = 0.42;
    sk.shL.rotation.z = -0.5; sk.shR.rotation.z = 0.5;
    if (o.prone && o.crawl) { sk.shL.rotation.x = -2.4 + sw * 0.5; sk.shR.rotation.x = -2.4 + sw2 * 0.5; sk.root.position.y = 0.09; }
    if (o.sleep) { sk.shL.rotation.z = -0.15; sk.shR.rotation.z = 0.15; }
  } else sk.root.rotation.order = 'XYZ';
  sk.root.updateMatrixWorld(true);
  // fat ones are wider in the chest and hips
  const wide = o.fat ? 1.35 : 1, F = R3.people.fatM || (R3.people.fatM = new T.Matrix4().makeScale(1.35, 1.05, 1.4));
  const top = L.jacket || L.top || L.skin, arm1 = L.jacket || L.top || L.skin, arm2 = L.jacket || (L.topLong ? L.top : null) || L.skin;
  const legs = L.pants || L.skin, pelvis = L.pants || L.under || L.skin, feet = L.shoes || L.skin, hands = L.gloves || L.skin;
  r3Put('pelvis', sk.hips, pelvis, wide > 1 ? F : null); r3Put('chest', sk.spine, top, wide > 1 ? F : null);
  r3Put('head', sk.neck, L.skin); r3Put('nose', sk.neck, L.skin);
  const P2 = R3.people, eyeCol = L.eyes || '#1a1410';
  for (const sx of [-0.024, 0.024]) { r3Put('eye', sk.neck, eyeCol, P2.e1 = (P2.e1 || new T.Matrix4()).makeTranslation(sx, 0.012, 0.058)); r3Put('brow', sk.neck, L.hair || '#3a2a20', P2.e2 = (P2.e2 || new T.Matrix4()).makeTranslation(sx, 0.03, 0.06)); } if (L.hair) r3Put('hair', sk.neck, L.hair); if (L.hat) r3Put('hat', sk.neck, L.hat);
  r3Put('upperArm', sk.shL, arm1); r3Put('upperArm', sk.shR, arm1); r3Put('lowerArm', sk.elL, arm2); r3Put('lowerArm', sk.elR, arm2);
  r3Put('hand', sk.haL, hands); r3Put('hand', sk.haR, hands);
  r3Put('upperLeg', sk.hipL, legs); r3Put('upperLeg', sk.hipR, legs); r3Put('lowerLeg', sk.knL, legs); r3Put('lowerLeg', sk.knR, legs);
  r3Put('shoe', sk.anL, feet); r3Put('shoe', sk.anR, feet);
  if (L.bag) r3Put('bag', sk.back, '#4a4a32');
  if (o.weapon) r3Put('weapon', sk.haR, o.weaponCol || '#6a5038');
  if (pose === 'read') r3Put('book', sk.haL, '#8a3a2a');
}

// ---- animals: a few, each its own little group ------------------------------------------------------
function r3Animal(a) {
  const T = R3.T; let g = a._r3;
  if (!g) {
    const S = c => new T.MeshStandardMaterial({ color: c, roughness: 0.85 });
    g = new T.Group();
    if (a.kind === 'vaca') {
      const body = new T.Mesh(new T.CapsuleGeometry(0.17, 0.42, 4, 10).rotateX(Math.PI / 2), S('#ece6dc')); body.position.y = 0.42; g.add(body);
      for (const [x, z, r] of [[0.06, 0.05, 0.1], [-0.08, -0.12, 0.09], [0.1, -0.18, 0.07]]) { const sp = new T.Mesh(new T.SphereGeometry(r, 10, 8), S('#2a2624')); sp.scale.set(1, 0.6, 1); sp.position.set(x * 1.6, 0.52, z * 1.6); g.add(sp); }
      const head = new T.Mesh(new T.BoxGeometry(0.14, 0.15, 0.2), S('#ece6dc')); head.position.set(0, 0.52, 0.42); g.add(head);
      const snout = new T.Mesh(new T.BoxGeometry(0.12, 0.08, 0.06), S('#d8a8a0')); snout.position.set(0, 0.47, 0.53); g.add(snout);
      for (const s of [-1, 1]) { const h = new T.Mesh(new T.ConeGeometry(0.015, 0.06, 5), S('#e8e0c8')); h.position.set(s * 0.06, 0.62, 0.4); g.add(h); }
      g.userData.legs = [];
      for (const [x, z] of [[-0.1, 0.24], [0.1, 0.24], [-0.1, -0.24], [0.1, -0.24]]) { const l = new T.Group(); l.position.set(x, 0.32, z); const m = new T.Mesh(new T.CylinderGeometry(0.035, 0.03, 0.32, 6).translate(0, -0.16, 0), S('#ece6dc')); l.add(m); g.add(l); g.userData.legs.push(l); }
    } else {
      const body = new T.Mesh(new T.SphereGeometry(0.09, 10, 8), S('#f2efe6')); body.scale.set(0.9, 0.9, 1.2); body.position.y = 0.13; g.add(body);
      const head = new T.Mesh(new T.SphereGeometry(0.045, 8, 6), S('#f2efe6')); head.position.set(0, 0.23, 0.08); g.add(head);
      const comb = new T.Mesh(new T.BoxGeometry(0.015, 0.03, 0.04), S('#c02020')); comb.position.set(0, 0.275, 0.08); g.add(comb);
      const beak = new T.Mesh(new T.ConeGeometry(0.014, 0.035, 5).rotateX(Math.PI / 2), S('#e0a030')); beak.position.set(0, 0.22, 0.13); g.add(beak);
      const tail = new T.Mesh(new T.BoxGeometry(0.05, 0.08, 0.03), S('#f2efe6')); tail.position.set(0, 0.2, -0.12); tail.rotation.x = -0.5; g.add(tail);
      g.userData.legs = [];
      for (const x of [-0.03, 0.03]) { const l = new T.Group(); l.position.set(x, 0.07, 0); l.add(new T.Mesh(new T.CylinderGeometry(0.006, 0.006, 0.07, 4).translate(0, -0.035, 0), S('#e0a030'))); g.add(l); g.userData.legs.push(l); }
    }
    g.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    a._r3 = g; R3.root.add(g);
  }
  g.visible = true; g.position.set(a.x, 0, a.y);
  const dx = a.tx - a.x, dy = a.ty - a.y; if (Math.hypot(dx, dy) > 0.1) g.rotation.y = Math.atan2(dx, dy);
  const ph = (a.ft || 0) * Math.PI / 2;
  g.userData.legs.forEach((l, k) => { l.rotation.x = a.dead ? 0 : Math.sin(ph + (k % 2 ? Math.PI : 0) + (k > 1 ? Math.PI / 2 : 0)) * 0.4; });
  g.rotation.z = a.dead ? Math.PI / 2 : 0; g.position.y = a.dead ? (a.kind === 'vaca' ? 0.18 : 0.05) : 0;
}
