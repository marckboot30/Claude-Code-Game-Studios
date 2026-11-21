// PROTOTYPE - NOT FOR PRODUCTION
// Question: Andar em primeira pessoa por uma cidadezinha vasculhando casas atrás de comida e água, com fome e sede caindo, já é tenso e divertido?
// Date: 2026-11-21
//
// Sobrevivência: the online room. PlayDrop hosts it (Colyseus 0.17) and signs each player in
// before onJoin. The room keeps what everyone must agree on: the time of day, where each player
// is, which furniture was already searched and what is left in it, fires, felled trees, parked
// and driven cars, the backpacks dead players leave behind, and who runs the animals (the host,
// one of the players). Everything else is simulated by each player's game.
import { Room, defineRoom } from "colyseus";

let playdrop = null; // the platform SDK exists only on PlayDrop; local tests run without it
try { ({ playdrop } = await import("@playdrop/server")); } catch (e) { playdrop = null; }

const TICK_MS = 100;            // snapshots to everyone, 10 a second
const DAY_SECONDS = 600;        // one game day in real seconds (same as the game's day_length)
const VOICE_RANGE = 45;         // metres you can hear someone at
const MAX_HIT = 400;            // the most damage one hit message may claim

class GameRoom extends Room {
  maxClients = 8;

  onCreate() {
    this.hour = 8;              // game hours since the room opened, starting at 08:00
    this.players = new Map();   // sessionId -> { id, name, userId, auth, st }
    this.conts = {};            // container id -> { items, searched }
    this.fires = [];            // { x, z, outAt }
    this.felled = [];           // tree keys
    this.cars = {};             // car id -> { p, q, v, f, drv }
    this.bags = [];             // backpacks of the dead: { id, x, z, name }
    this.host = null;           // sessionId of the player who runs the animals
    this.animals = [];
    this.seq = 0;
    this.voice = null;
    if (playdrop) try {
      this.voice = playdrop.multiplayer.forRoom(this).voice;
      this.voice.setPolicy("proximity", { range: VOICE_RANGE });
    } catch (e) { this.voice = null; }

    const on = (type, fn) => this.onMessage(type, (client, msg) => { try { fn(client, msg || {}); } catch (e) { /* a bad message never stops the room */ } });

    // the game asks for the world once its handlers are ready
    on("hello", (client) => client.send("welcome", {
      you: client.sessionId, host: this.host, hour: this.hour, conts: this.conts, fires: this.fires, felled: this.felled,
      cars: this.cars, bags: this.bags, animals: this.animals, count: this.players.size,
    }));
    on("p", (client, m) => { const p = this.players.get(client.sessionId); if (p) p.st = clean(m); });
    on("shot", (client, m) => this.broadcast("shot", { id: client.sessionId, g: str(m.g), o: vec(m.o), d: vec(m.d) }, { except: client }));
    on("hit", (client, m) => {
      const target = this.players.get(str(m.t)), from = this.players.get(client.sessionId);
      if (!target || !from || target === from) return;
      const dmg = Math.max(0, Math.min(MAX_HIT, num(m.dmg)));
      const tc = this.clients.find(c => c.sessionId === target.id);
      if (tc) tc.send("hurt", { dmg, by: m.src ? str(m.src) : from.name, byId: from.id, head: !!m.head });
    });
    on("died", (client, m) => {
      const p = this.players.get(client.sessionId); if (!p) return;
      const id = "bag" + (++this.seq), items = Array.isArray(m.items) ? m.items.slice(0, 400).map(str) : [];
      const bag = { id, x: num(m.x), z: num(m.z), name: p.name };
      this.bags.push(bag); if (this.bags.length > 40) this.bags.shift();
      this.conts[id] = { items, searched: false };
      this.broadcast("bag", bag);
      const killer = m.by ? str(m.by) : null;
      this.broadcast("kill", { victim: p.name, killer });
    });
    // furniture: the first to finish searching decides what was inside; everyone then shares it
    on("claim", (client, m) => {
      const cid = str(m.cid); if (!cid) return;
      const known = this.conts[cid];
      if (known && known.searched) { client.send("cont", { cid, items: known.items, searched: true, yours: true }); return; }
      const items = known ? known.items : (Array.isArray(m.items) ? m.items.slice(0, 200).map(str) : []);
      this.conts[cid] = { items, searched: true };
      client.send("cont", { cid, items, searched: true, yours: true });
      this.broadcast("cont", { cid, items, searched: true }, { except: client });
    });
    on("contItems", (client, m) => {
      const cid = str(m.cid); if (!cid) return;
      const items = Array.isArray(m.items) ? m.items.slice(0, 400).map(str) : [];
      this.conts[cid] = { items, searched: true };
      this.broadcast("cont", { cid, items, searched: true }, { except: client });
    });
    on("fire", (client, m) => { const f = { x: num(m.x), z: num(m.z), outAt: num(m.outAt) }; this.fires.push(f); if (this.fires.length > 60) this.fires.shift(); this.broadcast("fire", f, { except: client }); });
    on("fell", (client, m) => { const key = str(m.key); if (!key || this.felled.includes(key)) return; this.felled.push(key); this.broadcast("fell", { key, fx: num(m.fx), fz: num(m.fz) }, { except: client }); });
    // cars: whoever drives sends the car's motion; one driver at a time
    on("carClaim", (client, m) => {
      const cid = str(m.cid), c = this.cars[cid] || (this.cars[cid] = {});
      const ok = !c.drv || c.drv === client.sessionId || !this.players.has(c.drv);
      if (ok) c.drv = client.sessionId;
      client.send("carOk", { cid, ok });
    });
    on("car", (client, m) => {
      const cid = str(m.cid), c = this.cars[cid] || (this.cars[cid] = {});
      if (c.drv && c.drv !== client.sessionId) return;
      Object.assign(c, { p: vec(m.p), q: arr(m.q, 4), v: vec(m.v), f: num(m.f), drv: m.leave ? null : client.sessionId });
      this.broadcast("car", { cid, ...c, leave: !!m.leave }, { except: client });
    });
    // animals: the host's game runs them; others send it their hits
    on("animals", (client, m) => { if (client.sessionId !== this.host) return; this.animals = Array.isArray(m.a) ? m.a.slice(0, 60) : []; this.broadcast("animals", { a: this.animals }, { except: client }); });
    on("ahit", (client, m) => this.toHost("ahit", { i: num(m.i), dmg: Math.min(MAX_HIT, num(m.dmg)), x: num(m.x), z: num(m.z) }));
    on("askin", (client, m) => this.toHost("askin", { i: num(m.i) }));

    this.clock.setInterval(() => this.tick(), TICK_MS);
  }

  toHost(type, msg) { const hc = this.clients.find(c => c.sessionId === this.host); if (hc) hc.send(type, msg); }

  onJoin(client) {
    const a = client.auth || {};
    const p = { id: client.sessionId, name: a.username || ("Jogador " + (this.players.size + 1)), userId: a.userId || null, auth: client.auth || null, st: null };
    this.players.set(client.sessionId, p);
    if (!this.host) this.host = client.sessionId;
    this.broadcast("joined", { id: p.id, name: p.name }, { except: client });
  }

  onLeave(client) {
    const p = this.players.get(client.sessionId);
    this.players.delete(client.sessionId);
    for (const cid in this.cars) if (this.cars[cid].drv === client.sessionId) this.cars[cid].drv = null;
    if (this.host === client.sessionId) { this.host = this.players.size ? this.players.keys().next().value : null; this.broadcast("host", { id: this.host }); }
    if (p) this.broadcast("left", { id: p.id, name: p.name });
  }

  tick() {
    this.hour += 24 / DAY_SECONDS * (TICK_MS / 1000);
    const ps = [];
    for (const p of this.players.values()) if (p.st) ps.push({ id: p.id, n: p.name, u: p.userId, ...p.st });
    this.broadcast("snap", { h: this.hour, host: this.host, p: ps });
    if (this.voice && (this.seq2 = (this.seq2 || 0) + 1) % 5 === 0) {
      const pos = [];
      for (const p of this.players.values()) if (p.st && p.auth) pos.push({ player: p.auth, position: { x: p.st.x || 0, y: (p.st.y || 0) + 1.6, z: p.st.z || 0 } });
      try { this.voice.updatePositions(pos); } catch (e) { /* voice is optional */ }
    }
  }
}

// message hygiene: numbers stay numbers, strings stay short
function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function str(v) { return typeof v === "string" ? v.slice(0, 64) : v == null ? "" : String(v).slice(0, 64); }
function vec(v) { return arr(v, 3); }
function arr(v, n) { const out = []; for (let i = 0; i < n; i++) out.push(num(Array.isArray(v) ? v[i] : 0)); return out; }
const KEEP = ["x", "y", "z", "f", "yw", "pt", "sp", "sw", "cr", "g", "a", "ch", "hd", "dr", "hp", "dead", "k"];
function clean(m) {
  const o = {};
  for (const k of KEEP) if (m[k] !== undefined) o[k] = typeof m[k] === "string" ? m[k].slice(0, 32) : typeof m[k] === "boolean" ? m[k] : num(m[k]);
  return o;
}

export const rooms = { game: defineRoom(GameRoom) };
