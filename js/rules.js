/* Fronts, 1914 — pure rules. No DOM. Safe to import from Node. */
(function (factory) {
  const Hex = (typeof module !== "undefined" && module.exports && typeof require === "function")
    ? require("./hex.js")
    : window.Hex;
  const api = factory(Hex);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.Rules = api;
})(function (Hex) {
  const NATIONS = {
    britain: { id: "britain", name: "Britain", color: "#1d3557", accent: "#c4a35a", flag: "flag_britain", unique: "dreadnought", uniqueTech: "grand_fleet" },
    france: { id: "france", name: "France", color: "#1e4b8a", accent: "#c0392b", flag: "flag_france", unique: "artillery75", uniqueTech: "soixante" },
    germany: { id: "germany", name: "Germany", color: "#3d3a36", accent: "#8c1c13", flag: "flag_germany", unique: "stormtrooper", uniqueTech: "storm_tactics" },
    austria: { id: "austria", name: "Austria-Hungary", color: "#8a7044", accent: "#6b1d2a", flag: "flag_austria", unique: "mountain_inf", uniqueTech: "alpine_corps" },
    russia: { id: "russia", name: "Russia", color: "#2f4a34", accent: "#d4c4a8", flag: "flag_russia", unique: "mass_infantry", uniqueTech: "levy" },
    ottoman: { id: "ottoman", name: "Ottoman Empire", color: "#6e2b2b", accent: "#c2b280", flag: "flag_ottoman", unique: "fortified_inf", uniqueTech: "redoubt" },
    italy: { id: "italy", name: "Italy", color: "#2e5a3c", accent: "#8c2f39", flag: "flag_italy", unique: "alpini", uniqueTech: "alpini_corps" },
    usa: { id: "usa", name: "United States", color: "#2c3e6b", accent: "#8c3a3a", flag: "flag_usa", unique: "fighter", uniqueTech: "air_service" },
    serbia: { id: "serbia", name: "Serbia", color: "#243e5a", accent: "#a33b3b", flag: "flag_serbia", unique: "guerrilla", uniqueTech: "irregulars" },
    belgium: { id: "belgium", name: "Belgium", color: "#2a2a28", accent: "#c4a035", flag: "flag_belgium", unique: "fortress_gun", uniqueTech: "forts" }
  };

  const UNITS = {
    infantry: { id: "infantry", name: "Infantry", cost: 3, hp: 10, move: 2, attack: 3, defense: 2, range: 1, domain: "land", foot: true, cls: "inf", sprite: "unit_infantry", req: null },
    cavalry: { id: "cavalry", name: "Cavalry", cost: 5, hp: 10, move: 3, attack: 3, defense: 1, range: 1, domain: "land", foot: false, cls: "cav", sprite: "unit_cavalry", req: "cavalry_doctrine" },
    artillery: { id: "artillery", name: "Field Artillery", cost: 6, hp: 8, move: 1, attack: 4, defense: 1, range: 2, domain: "land", foot: false, cls: "arty", sprite: "unit_artillery", req: "field_guns" },
    ship: { id: "ship", name: "Ship", cost: 6, hp: 12, move: 3, attack: 3, defense: 2, range: 1, domain: "sea", foot: false, cls: "sea", sprite: "unit_ship", req: "sea_power" },
    dreadnought: { id: "dreadnought", name: "Dreadnought", cost: 10, hp: 18, move: 3, attack: 5, defense: 4, range: 2, domain: "sea", foot: false, cls: "sea", sprite: "unit_dreadnought", req: "grand_fleet", unique: "britain" },
    artillery75: { id: "artillery75", name: "75mm Gun", cost: 7, hp: 8, move: 1, attack: 5, defense: 1, range: 2, domain: "land", foot: false, cls: "arty", sprite: "unit_artillery75", req: "soixante", unique: "france" },
    stormtrooper: { id: "stormtrooper", name: "Stormtrooper", cost: 5, hp: 10, move: 2, attack: 5, defense: 2, range: 1, domain: "land", foot: true, cls: "inf", sprite: "unit_stormtrooper", req: "storm_tactics", unique: "germany" },
    mountain_inf: { id: "mountain_inf", name: "Mountain Infantry", cost: 4, hp: 10, move: 2, attack: 3, defense: 3, range: 1, domain: "land", foot: true, cls: "inf", mountain: true, sprite: "unit_mountain_inf", req: "alpine_corps", unique: "austria" },
    mass_infantry: { id: "mass_infantry", name: "Mass Infantry", cost: 2, hp: 8, move: 2, attack: 2, defense: 1, range: 1, domain: "land", foot: true, cls: "inf", sprite: "unit_mass_infantry", req: "levy", unique: "russia" },
    fortified_inf: { id: "fortified_inf", name: "Fortified Infantry", cost: 4, hp: 12, move: 1, attack: 2, defense: 4, range: 1, domain: "land", foot: true, cls: "inf", sprite: "unit_fortified_inf", req: "redoubt", unique: "ottoman" },
    alpini: { id: "alpini", name: "Alpini", cost: 5, hp: 10, move: 2, attack: 3, defense: 3, range: 1, domain: "land", foot: true, cls: "inf", mountain: true, sprite: "unit_alpini", req: "alpini_corps", unique: "italy" },
    guerrilla: { id: "guerrilla", name: "Guerrilla", cost: 4, hp: 8, move: 3, attack: 3, defense: 2, range: 1, domain: "land", foot: true, cls: "inf", sprite: "unit_guerrilla", req: "irregulars", unique: "serbia" },
    fortress_gun: { id: "fortress_gun", name: "Fortress Gun", cost: 7, hp: 10, move: 1, attack: 6, defense: 2, range: 2, domain: "land", foot: false, cls: "arty", sprite: "unit_fortress_gun", req: "forts", unique: "belgium" },
    fighter: { id: "fighter", name: "Fighter", cost: 8, hp: 6, move: 4, attack: 3, defense: 1, range: 1, domain: "air", foot: false, cls: "air", sprite: "unit_fighter", req: "aviation" }
  };

  const TECHS = {
    cavalry_doctrine: { id: "cavalry_doctrine", name: "Cavalry Doctrine", cost: 4, req: null, nation: null, desc: "Unlocks cavalry." },
    field_guns: { id: "field_guns", name: "Field Guns", cost: 5, req: null, nation: null, desc: "Unlocks field artillery." },
    sea_power: { id: "sea_power", name: "Sea Power", cost: 5, req: null, nation: null, desc: "Unlocks ships. They are launched onto adjacent water." },
    aviation: { id: "aviation", name: "Aviation", cost: 8, req: null, nation: null, desc: "Unlocks fighters." },
    trenchworks: { id: "trenchworks", name: "Trenchworks", cost: 4, req: null, nation: null, desc: "Your infantry gain +1 defense." },
    grand_fleet: { id: "grand_fleet", name: "Grand Fleet", cost: 6, req: "sea_power", nation: "britain", desc: "Unlocks the dreadnought, a heavier ship." },
    soixante: { id: "soixante", name: "Soixante-Quinze", cost: 5, req: "field_guns", nation: "france", desc: "Unlocks the 75mm gun, a quicker field piece." },
    storm_tactics: { id: "storm_tactics", name: "Storm Tactics", cost: 5, req: null, nation: "germany", desc: "Unlocks stormtroopers." },
    alpine_corps: { id: "alpine_corps", name: "Alpine Corps", cost: 4, req: null, nation: "austria", desc: "Unlocks mountain infantry." },
    levy: { id: "levy", name: "Levy", cost: 3, req: null, nation: "russia", desc: "Unlocks mass infantry: cheaper and lighter." },
    redoubt: { id: "redoubt", name: "Redoubt", cost: 4, req: null, nation: "ottoman", desc: "Unlocks fortified infantry." },
    alpini_corps: { id: "alpini_corps", name: "Alpini Corps", cost: 4, req: null, nation: "italy", desc: "Unlocks the Alpini, at home in hills and mountains." },
    air_service: { id: "air_service", name: "Air Service", cost: 4, req: null, nation: "usa", desc: "Unlocks fighters early, and at a lower Supply cost." },
    irregulars: { id: "irregulars", name: "Irregulars", cost: 3, req: null, nation: "serbia", desc: "Unlocks guerrillas." },
    forts: { id: "forts", name: "Forts", cost: 5, req: "field_guns", nation: "belgium", desc: "Unlocks the fortress gun." }
  };

  const SHARED_TECHS = ["cavalry_doctrine", "field_guns", "sea_power", "aviation", "trenchworks"];

  const TERRAIN = {
    plains: { id: "plains", name: "Plains", move: 1, def: 0, color: "#8a9a62" },
    forest: { id: "forest", name: "Forest", move: 2, def: 1, color: "#3e5c38" },
    hills: { id: "hills", name: "Hills", move: 2, def: 1, color: "#8d8458" },
    mountain: { id: "mountain", name: "Mountain", move: 2, def: 2, color: "#7a736c" },
    water: { id: "water", name: "Water", move: 1, def: 0, color: "#3d5c72" },
    trench: { id: "trench", name: "Trench", move: 2, def: 2, color: "#6a6248" },
    desert: { id: "desert", name: "Desert", move: 1, def: 0, color: "#c2ae78" },
    swamp: { id: "swamp", name: "Swamp", move: 2, def: 0, color: "#4e6150" }
  };

  const ART = {
    terrain: ["terrain_plains", "terrain_forest", "terrain_mountain", "terrain_hills", "terrain_water", "terrain_trench", "terrain_desert", "terrain_swamp"],
    sprites: ["city", "capital", "icon_endturn", "icon_skull", "icon_star", "icon_tech", "overlay_attack", "overlay_move", "overlay_select"]
  };

  function key(q, r) { return Hex.key(q, r); }
  function player(state, id) { return state.players.find(function (p) { return p.id === id; }); }
  function current(state) { return state.players[state.turn]; }
  function specOf(unit) { return UNITS[unit.type]; }

  function unitAt(state, q, r) {
    for (let i = 0; i < state.units.length; i++) {
      const u = state.units[i];
      if (u.q === q && u.r === r) return u;
    }
    return null;
  }

  function cellAt(state, q, r) { return state.cells[key(q, r)] || null; }

  function hasTech(p, id) { return p.techs.indexOf(id) !== -1; }

  function unitUnlocked(playerObj, unitId) {
    const spec = UNITS[unitId];
    if (!spec) return false;
    if (spec.unique && spec.unique !== playerObj.id) return false;
    if (unitId === "fighter" && playerObj.id === "usa" && hasTech(playerObj, "air_service")) return true;
    if (!spec.req) return true;
    return hasTech(playerObj, spec.req);
  }

  function unitCost(playerObj, unitId) {
    const spec = UNITS[unitId];
    if (unitId === "fighter" && playerObj.id === "usa" && hasTech(playerObj, "air_service")) return 5;
    return spec.cost;
  }

  function catalog(nationId) {
    const ids = Object.keys(UNITS);
    return ids.filter(function (id) {
      const s = UNITS[id];
      return !s.unique || s.unique === nationId;
    });
  }

  function moveCost(unit, cell) {
    const spec = specOf(unit);
    const t = cell.terrain;
    if (spec.domain === "air") return 1;
    if (spec.domain === "sea") return t === "water" ? 1 : Infinity;
    if (t === "mountain" && !spec.mountain) return Infinity;
    if (t === "water") return 1;
    let c = TERRAIN[t].move;
    if (spec.id === "guerrilla" && c > 1) c = 1;
    return c;
  }

  function canStay(unit, cell) {
    const spec = specOf(unit);
    if (!cell) return false;
    if (spec.domain === "air") return true;
    if (spec.domain === "sea") return cell.terrain === "water";
    if (cell.terrain === "water") return false;
    if (cell.terrain === "mountain" && !spec.mountain) return false;
    return true;
  }

  function occupied(state, q, r, ignoreId) {
    const u = unitAt(state, q, r);
    return !!(u && u.id !== ignoreId);
  }

  /* Reachable stay-hexes. Land units may pass one or more water hexes but cannot stop there,
     so a single-hex channel can be crossed and a wider sea cannot. */
  function reachable(state, unit) {
    const start = key(unit.q, unit.r);
    const best = new Map();
    best.set(start, 0);
    const pq = [{ k: start, c: 0 }];
    while (pq.length) {
      pq.sort(function (a, b) { return a.c - b.c; });
      const cur = pq.shift();
      if (cur.c !== best.get(cur.k)) continue;
      const here = Hex.parse(cur.k);
      const neigh = Hex.neighbors(here.q, here.r);
      for (let i = 0; i < neigh.length; i++) {
        const n = neigh[i];
        const nk = key(n.q, n.r);
        const cell = state.cells[nk];
        if (!cell) continue;
        if (occupied(state, n.q, n.r, unit.id)) continue;
        const step = moveCost(unit, cell);
        if (!isFinite(step)) continue;
        const nc = cur.c + step;
        if (nc > unit.move) continue;
        if (!best.has(nk) || nc < best.get(nk)) {
          best.set(nk, nc);
          pq.push({ k: nk, c: nc });
        }
      }
    }
    const stay = new Map();
    best.forEach(function (c, k) {
      const cell = state.cells[k];
      if (canStay(unit, cell)) stay.set(k, c);
    });
    return stay;
  }

  /* Hexes from the unit's current hex to (q, r), including water it may only cross.
     Call before moveUnit. Falls back to a straight pair if the goal is unreachable. */
  function route(state, unit, q, r) {
    const start = key(unit.q, unit.r);
    const goal = key(q, r);
    if (start === goal) return [{ q: unit.q, r: unit.r }];
    const best = new Map();
    const prev = new Map();
    best.set(start, 0);
    const pq = [{ k: start, c: 0 }];
    while (pq.length) {
      pq.sort(function (a, b) { return a.c - b.c; });
      const cur = pq.shift();
      if (cur.c !== best.get(cur.k)) continue;
      if (cur.k === goal) break;
      const here = Hex.parse(cur.k);
      const neigh = Hex.neighbors(here.q, here.r);
      for (let i = 0; i < neigh.length; i++) {
        const n = neigh[i];
        const nk = key(n.q, n.r);
        const cell = state.cells[nk];
        if (!cell) continue;
        if (occupied(state, n.q, n.r, unit.id)) continue;
        const step = moveCost(unit, cell);
        if (!isFinite(step)) continue;
        const nc = cur.c + step;
        if (nc > unit.move) continue;
        if (!best.has(nk) || nc < best.get(nk)) {
          best.set(nk, nc);
          prev.set(nk, cur.k);
          pq.push({ k: nk, c: nc });
        }
      }
    }
    if (!prev.has(goal) && start !== goal) return [{ q: unit.q, r: unit.r }, { q: q, r: r }];
    const path = [];
    let k = goal;
    const guard = {};
    while (k && !guard[k]) {
      guard[k] = true;
      const h = Hex.parse(k);
      path.push({ q: h.q, r: h.r });
      if (k === start) break;
      k = prev.get(k);
    }
    path.reverse();
    return path;
  }

  function attackOf(state, unit) {
    const spec = specOf(unit);
    const cell = cellAt(state, unit.q, unit.r);
    let a = spec.attack;
    if (!cell) return a;
    if (spec.id === "guerrilla" && (cell.terrain === "forest" || cell.terrain === "hills")) a += 1;
    if (spec.id === "alpini" && (cell.terrain === "hills" || cell.terrain === "mountain")) a += 1;
    return a;
  }

  function defenseOf(state, unit) {
    const spec = specOf(unit);
    const cell = cellAt(state, unit.q, unit.r);
    let d = spec.defense;
    if (!cell) return d;
    d += TERRAIN[cell.terrain].def || 0;
    if (cell.city) d += 1;
    const owner = player(state, unit.owner);
    if (owner && hasTech(owner, "trenchworks") && spec.cls === "inf") d += 1;
    if (spec.id === "guerrilla" && (cell.terrain === "forest" || cell.terrain === "hills")) d += 1;
    if (spec.id === "alpini" && (cell.terrain === "hills" || cell.terrain === "mountain")) d += 1;
    if (spec.id === "mountain_inf" && cell.terrain === "mountain") d += 1;
    return d;
  }

  function strikeDamage(atk, def) {
    return Math.max(1, atk * 2 - def);
  }

  function incomeOf(state, nationId) {
    let n = 0;
    const cells = state.cells;
    for (const k in cells) {
      const c = cells[k];
      if (!c.city || c.city.owner !== nationId) continue;
      n += c.city.capital ? 3 : 2;
    }
    return n;
  }

  function isAlive(state, nationId) {
    for (const k in state.cells) {
      const c = state.cells[k];
      if (c.city && c.city.owner === nationId) return true;
    }
    for (let i = 0; i < state.units.length; i++) {
      if (state.units[i].owner === nationId) return true;
    }
    return false;
  }

  function checkWinner(state) {
    const caps = [];
    for (const k in state.cells) {
      const c = state.cells[k];
      if (c.city && c.city.capital) caps.push(c);
    }
    if (caps.length) {
      const owner = caps[0].city.owner;
      if (owner && caps.every(function (c) { return c.city.owner === owner; })) return owner;
    }
    const living = state.players.filter(function (p) { return isAlive(state, p.id); });
    if (living.length === 1) return living[0].id;
    return null;
  }

  function captureIf(state, unit) {
    const spec = specOf(unit);
    if (!spec.foot) return false;
    const cell = cellAt(state, unit.q, unit.r);
    if (!cell || !cell.city) return false;
    if (cell.city.owner === unit.owner) return false;
    cell.city.owner = unit.owner;
    return true;
  }

  function makeUnit(state, type, owner, q, r, opts) {
    const spec = UNITS[type];
    const fresh = opts && opts.fresh;
    const u = {
      id: state.uid++,
      type: type,
      owner: owner,
      q: q,
      r: r,
      hp: spec.hp,
      maxHp: spec.hp,
      move: fresh ? 0 : spec.move,
      maxMove: spec.move,
      hasAttacked: fresh ? true : false
    };
    return u;
  }

  function refreshMoves(state, nationId) {
    for (let i = 0; i < state.units.length; i++) {
      const u = state.units[i];
      if (u.owner !== nationId) continue;
      u.move = u.maxMove;
      u.hasAttacked = false;
    }
  }

  function spawnSpot(state, nationId, cap) {
    const neigh = Hex.neighbors(cap.q, cap.r);
    const candidates = [];
    for (let i = 0; i < neigh.length; i++) {
      const c = cellAt(state, neigh[i].q, neigh[i].r);
      if (c) candidates.push(c);
    }
    candidates.sort(function (a, b) {
      const ac = a.city ? 1 : 0;
      const bc = b.city ? 1 : 0;
      return ac - bc;
    });
    candidates.push(cap);
    const dummy = { type: "infantry" };
    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];
      if (c.city && c.city.owner !== nationId) continue;
      if (!canStay(dummy, c)) continue;
      if (unitAt(state, c.q, c.r)) continue;
      return c;
    }
    return cap;
  }

  function createGame(map, humanIds) {
    const humans = {};
    (humanIds || []).forEach(function (id) { humans[id] = true; });
    const cells = {};
    const src = map.cells;
    for (let i = 0; i < src.length; i++) {
      const c = src[i];
      cells[key(c.q, c.r)] = {
        q: c.q,
        r: c.r,
        terrain: c.terrain,
        city: c.city ? { name: c.city.name, owner: c.city.owner, capital: !!c.city.capital } : null
      };
    }
    let players = map.nations.map(function (id) {
      const start = (map.startingTechs && map.startingTechs[id]) ? map.startingTechs[id].slice() : [];
      return { id: id, human: !!humans[id], supply: 0, techs: start };
    });
    const hi = players.findIndex(function (p) { return p.human; });
    if (hi > 0) players = players.slice(hi).concat(players.slice(0, hi));
    const state = {
      mapId: map.id,
      mapName: map.name,
      w: map.w,
      h: map.h,
      cells: cells,
      units: [],
      players: players,
      turn: 0,
      turnNumber: 1,
      winner: null,
      log: [],
      uid: 1
    };
    for (let i = 0; i < map.nations.length; i++) {
      const nid = map.nations[i];
      let cap = null;
      for (const k in cells) {
        const c = cells[k];
        if (c.city && c.city.capital && c.city.owner === nid) cap = c;
      }
      if (!cap) throw new Error("No capital for " + nid + " on " + map.id);
      const spot = spawnSpot(state, nid, cap);
      state.units.push(makeUnit(state, "infantry", nid, spot.q, spot.r, { fresh: false }));
    }
    const first = current(state);
    first.supply += incomeOf(state, first.id);
    refreshMoves(state, first.id);
    state.winner = checkWinner(state);
    return state;
  }

  function pushLog(state, line) {
    state.log.push(line);
    if (state.log.length > 60) state.log.shift();
  }

  function endTurn(state) {
    if (state.winner) return current(state);
    const n = state.players.length;
    for (let i = 0; i < n; i++) {
      state.turn = (state.turn + 1) % n;
      if (state.turn === 0) state.turnNumber += 1;
      const p = current(state);
      if (!isAlive(state, p.id)) continue;
      refreshMoves(state, p.id);
      p.supply += incomeOf(state, p.id);
      state.winner = checkWinner(state);
      return p;
    }
    state.winner = checkWinner(state);
    return null;
  }

  function moveUnit(state, unitId, q, r) {
    if (state.winner) return { ok: false, reason: "The war is over." };
    const unit = state.units.find(function (u) { return u.id === unitId; });
    if (!unit) return { ok: false, reason: "No such unit." };
    const me = current(state);
    if (!me || unit.owner !== me.id) return { ok: false, reason: "Not your turn." };
    if (unit.hasAttacked) return { ok: false, reason: "This unit already fought." };
    if (unit.move <= 0 && (q !== unit.q || r !== unit.r)) return { ok: false, reason: "No movement left." };
    const reach = reachable(state, unit);
    const k = key(q, r);
    if (!reach.has(k)) return { ok: false, reason: "Cannot enter that hex." };
    const cost = reach.get(k);
    if (cost === 0) return { ok: true, moved: false };
    unit.move -= cost;
    unit.q = q;
    unit.r = r;
    const flipped = captureIf(state, unit);
    state.winner = checkWinner(state);
    return { ok: true, moved: true, captured: flipped };
  }

  function removeUnit(state, id) {
    state.units = state.units.filter(function (u) { return u.id !== id; });
  }

  function attack(state, unitId, targetId) {
    if (state.winner) return { ok: false, reason: "The war is over." };
    const unit = state.units.find(function (u) { return u.id === unitId; });
    const target = state.units.find(function (u) { return u.id === targetId; });
    if (!unit || !target) return { ok: false, reason: "Missing unit." };
    const me = current(state);
    if (!me || unit.owner !== me.id) return { ok: false, reason: "Not your turn." };
    if (unit.hasAttacked) return { ok: false, reason: "Already fought." };
    if (target.owner === unit.owner) return { ok: false, reason: "Friendly unit." };
    const d = Hex.dist(unit, target);
    const range = specOf(unit).range;
    if (d < 1 || d > range) return { ok: false, reason: "Out of range." };
    const dmg = strikeDamage(attackOf(state, unit), defenseOf(state, target));
    target.hp -= dmg;
    let killed = false;
    let counter = 0;
    let attackerDied = false;
    let captured = false;
    if (target.hp <= 0) {
      killed = true;
      const tq = target.q, tr = target.r;
      removeUnit(state, target.id);
      const dest = cellAt(state, tq, tr);
      if (d === 1 && dest && canStay(unit, dest) && !unitAt(state, tq, tr)) {
        unit.q = tq;
        unit.r = tr;
        captured = captureIf(state, unit);
      }
    } else {
      const trange = specOf(target).range;
      if (d <= trange) {
        counter = strikeDamage(attackOf(state, target), defenseOf(state, unit));
        unit.hp -= counter;
        if (unit.hp <= 0) {
          attackerDied = true;
          removeUnit(state, unit.id);
        }
      }
    }
    if (!attackerDied) {
      const still = state.units.find(function (u) { return u.id === unitId; });
      if (still) {
        still.hasAttacked = true;
        still.move = 0;
      }
    }
    state.winner = checkWinner(state);
    return { ok: true, dmg: dmg, counter: counter, killed: killed, attackerDied: attackerDied, captured: captured };
  }

  function seaLaunch(state, cq, cr) {
    const neigh = Hex.neighbors(cq, cr);
    for (let i = 0; i < neigh.length; i++) {
      const n = neigh[i];
      const cell = cellAt(state, n.q, n.r);
      if (!cell || cell.terrain !== "water") continue;
      if (unitAt(state, n.q, n.r)) continue;
      return n;
    }
    return null;
  }

  function canTrain(state, nationId, cq, cr, unitId) {
    const p = player(state, nationId);
    const cell = cellAt(state, cq, cr);
    const spec = UNITS[unitId];
    if (!p || !cell || !cell.city || !spec) return { ok: false, reason: "Nothing to train." };
    if (cell.city.owner !== nationId) return { ok: false, reason: "Not your city." };
    if (current(state).id !== nationId) return { ok: false, reason: "Not your turn." };
    if (!unitUnlocked(p, unitId)) return { ok: false, reason: "Locked." };
    const cost = unitCost(p, unitId);
    if (p.supply < cost) return { ok: false, reason: "Not enough Supply." };
    if (spec.domain === "sea") {
      if (!seaLaunch(state, cq, cr)) return { ok: false, reason: "No open water beside this city." };
    } else {
      if (unitAt(state, cq, cr)) return { ok: false, reason: "City hex is occupied." };
      const dummy = { type: unitId };
      if (!canStay(dummy, cell)) return { ok: false, reason: "That unit cannot stand here." };
    }
    return { ok: true, cost: cost };
  }

  function train(state, nationId, cq, cr, unitId) {
    const check = canTrain(state, nationId, cq, cr, unitId);
    if (!check.ok) return check;
    const p = player(state, nationId);
    const spec = UNITS[unitId];
    let sq = cq, sr = cr;
    if (spec.domain === "sea") {
      const spot = seaLaunch(state, cq, cr);
      sq = spot.q;
      sr = spot.r;
    }
    p.supply -= check.cost;
    const u = makeUnit(state, unitId, nationId, sq, sr, { fresh: true });
    state.units.push(u);
    return { ok: true, unit: u, cost: check.cost };
  }

  function canResearch(state, nationId, techId) {
    const p = player(state, nationId);
    const tech = TECHS[techId];
    if (!p || !tech) return { ok: false, reason: "Unknown subject." };
    if (current(state).id !== nationId) return { ok: false, reason: "Not your turn." };
    if (tech.nation && tech.nation !== nationId) return { ok: false, reason: "Not your nation's method." };
    if (hasTech(p, techId)) return { ok: false, reason: "Already researched." };
    if (tech.req && !hasTech(p, tech.req)) return { ok: false, reason: "Requires " + TECHS[tech.req].name + "." };
    if (p.supply < tech.cost) return { ok: false, reason: "Not enough Supply." };
    return { ok: true, cost: tech.cost };
  }

  function research(state, nationId, techId) {
    const check = canResearch(state, nationId, techId);
    if (!check.ok) return check;
    const p = player(state, nationId);
    p.supply -= check.cost;
    p.techs.push(techId);
    return { ok: true, cost: check.cost };
  }

  function legalAttacks(state, unit) {
    const out = [];
    if (!unit || unit.hasAttacked) return out;
    const range = specOf(unit).range;
    for (let i = 0; i < state.units.length; i++) {
      const t = state.units[i];
      if (t.owner === unit.owner) continue;
      const d = Hex.dist(unit, t);
      if (d >= 1 && d <= range) out.push(t);
    }
    return out;
  }

  function techChoices(nationId) {
    const list = SHARED_TECHS.slice();
    const uniq = NATIONS[nationId].uniqueTech;
    if (list.indexOf(uniq) === -1) list.push(uniq);
    return list.map(function (id) { return TECHS[id]; });
  }

  return {
    NATIONS: NATIONS,
    UNITS: UNITS,
    TECHS: TECHS,
    SHARED_TECHS: SHARED_TECHS,
    TERRAIN: TERRAIN,
    ART: ART,
    Hex: Hex,
    key: key,
    player: player,
    current: current,
    unitAt: unitAt,
    cellAt: cellAt,
    unitUnlocked: unitUnlocked,
    unitCost: unitCost,
    catalog: catalog,
    moveCost: moveCost,
    canStay: canStay,
    reachable: reachable,
    route: route,
    attackOf: attackOf,
    defenseOf: defenseOf,
    strikeDamage: strikeDamage,
    incomeOf: incomeOf,
    isAlive: isAlive,
    checkWinner: checkWinner,
    createGame: createGame,
    endTurn: endTurn,
    moveUnit: moveUnit,
    attack: attack,
    canTrain: canTrain,
    train: train,
    canResearch: canResearch,
    research: research,
    legalAttacks: legalAttacks,
    techChoices: techChoices,
    pushLog: pushLog,
    captureIf: captureIf,
    hasTech: hasTech
  };
});
