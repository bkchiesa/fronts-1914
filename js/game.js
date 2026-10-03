/* Core game state and rules for Fronts, 1914 */
window.Game = (function () {
  const { key } = Hex;
  let state = null;
  let uid = 1;

  function create(mapId, nationIds, mode) {
    const map = Maps.get(mapId);
    const players = nationIds.map((id, i) => {
      const nat = GameData.NATIONS[id];
      const techs = new Set(nat.startTechs || ["org1"]);
      return {
        id, name: nat.name, color: nat.color,
        stars: 5,
        techs,
        isAI: mode === "ai" && i > 0,
        alive: true
      };
    });

    const units = [];
    for (const p of players) {
      const starters = map.startUnits(map, p.id);
      for (const s of starters) {
        units.push(makeUnit(s.type, p.id, s.q, s.r));
      }
    }

    // Assign city ownership already on map; clear cities of non-playing nations
    const cells = {};
    for (const [k, c] of Object.entries(map.cells)) {
      const cell = { q: c.q, r: c.r, terrain: c.terrain, city: null };
      if (c.city && nationIds.includes(c.city.nation)) {
        cell.city = {
          nation: c.city.nation,
          name: c.city.name,
          capital: c.city.capital,
          level: c.city.level || 1,
          producing: null
        };
      } else if (c.city) {
        // Neutral city capturable
        cell.city = {
          nation: null,
          name: c.city.name,
          capital: false,
          level: 1,
          producing: null,
          neutral: true
        };
      }
      cells[k] = cell;
    }

    state = {
      mapId,
      w: map.w,
      h: map.h,
      cells,
      players,
      units,
      turn: 0,
      active: 0,
      phase: "play", // play | won | lost
      winner: null,
      selected: null,
      moveHints: [],
      attackHints: [],
      log: [],
      mode
    };
    incomeFor(players[0]);
    refreshHints();
    log(players[0].name + " begins the campaign.");
    return state;
  }

  function makeUnit(type, owner, q, r) {
    const def = GameData.UNITS[type];
    return {
      id: uid++,
      type,
      owner,
      q, r,
      hp: def.hp,
      maxHp: def.hp,
      moved: false,
      attacked: false,
      veteran: false
    };
  }

  function get() { return state; }

  function activePlayer() { return state.players[state.active]; }

  function log(msg) {
    state.log.unshift(msg);
    if (state.log.length > 40) state.log.pop();
  }

  function unitAt(q, r) {
    return state.units.find(u => u.q === q && u.r === r && u.hp > 0);
  }

  function enemyAt(q, r, owner) {
    return state.units.find(u => u.q === q && u.r === r && u.hp > 0 && u.owner !== owner);
  }

  function cell(q, r) {
    return state.cells[key(q, r)] || null;
  }

  function incomeFor(player) {
    let stars = 0;
    let cityCount = 0;
    for (const c of Object.values(state.cells)) {
      if (c.city && c.city.nation === player.id) {
        cityCount++;
        let gain = c.city.capital ? 2 : 1;
        gain += (c.city.level - 1);
        if (player.techs.has("ind1")) gain += 1;
        if (player.techs.has("ind2")) gain += 1;
        const nat = GameData.NATIONS[player.id];
        if (nat.lateIndustry && player.techs.has("ind2")) gain += 1;
        stars += gain;
      }
    }
    // USA growth: bump city level slowly
    if (GameData.NATIONS[player.id].lateIndustry && player.techs.has("ind2")) {
      for (const c of Object.values(state.cells)) {
        if (c.city && c.city.nation === player.id && c.city.level < 3 && Math.random() < 0.35) {
          c.city.level++;
          log(c.city.name + " expands (US industry).");
        }
      }
    }
    player.stars += Math.max(1, stars);
    if (cityCount === 0) player.stars += 0;
  }

  function selectHex(q, r) {
    if (state.phase !== "play") return;
    const p = activePlayer();
    if (p.isAI) return;

    const u = unitAt(q, r);
    if (u && u.owner === p.id) {
      state.selected = u.id;
      refreshHints();
      return;
    }
    if (state.selected) {
      const sel = state.units.find(x => x.id === state.selected);
      if (!sel) { state.selected = null; return; }
      // Attack?
      if (state.attackHints.some(h => h.q === q && h.r === r)) {
        doAttack(sel, q, r);
        return;
      }
      // Move?
      if (state.moveHints.some(h => h.q === q && h.r === r)) {
        doMove(sel, q, r);
        return;
      }
    }
    // City production select
    const c = cell(q, r);
    if (c && c.city && c.city.nation === p.id) {
      state.selected = null;
      state.cityFocus = { q, r };
      refreshHints();
      return;
    }
    state.selected = null;
    state.cityFocus = null;
    refreshHints();
  }

  function refreshHints() {
    state.moveHints = [];
    state.attackHints = [];
    if (!state.selected) return;
    const u = state.units.find(x => x.id === state.selected);
    if (!u || u.moved && u.attacked) return;
    const def = GameData.UNITS[u.type];
    if (!u.moved) {
      state.moveHints = reachable(u);
    }
    if (!u.attacked) {
      state.attackHints = attackTargets(u);
    }
  }

  function moveCost(u, terrain, nationId) {
    const t = GameData.TERRAIN[terrain];
    if (!t) return 99;
    const def = GameData.UNITS[u.type];
    if (t.sea) {
      if (def.domain === "sea" || def.domain === "air") return 1;
      return 99;
    }
    if (def.domain === "sea") return 99; // ships stay at sea
    if (terrain === "mountain") {
      const nat = GameData.NATIONS[nationId];
      if (nat.mountainCost) return nat.mountainCost;
      if (u.type === "alpini" || u.type === "mountain_inf") return 1;
      return t.move;
    }
    return t.move;
  }

  function reachable(u) {
    const def = GameData.UNITS[u.type];
    const max = def.move;
    const start = key(u.q, u.r);
    const best = { [start]: 0 };
    const out = [];
    const queue = [{ q: u.q, r: u.r, left: max }];
    while (queue.length) {
      const cur = queue.shift();
      for (const n of Hex.neighbors(cur.q, cur.r)) {
        const c = cell(n.q, n.r);
        if (!c) continue;
        const cost = moveCost(u, c.terrain, u.owner);
        if (cost > cur.left) continue;
        const other = unitAt(n.q, n.r);
        if (other && other.owner !== u.owner) continue; // cannot enter enemy
        if (other && other.owner === u.owner && !(n.q === u.q && n.r === u.r)) continue;
        const nk = key(n.q, n.r);
        const used = max - (cur.left - cost);
        if (best[nk] != null && best[nk] <= used) continue;
        best[nk] = used;
        const left = cur.left - cost;
        if (!(n.q === u.q && n.r === u.r)) out.push({ q: n.q, r: n.r });
        if (left > 0 && !other) queue.push({ q: n.q, r: n.r, left });
      }
    }
    // unique
    const seen = new Set();
    return out.filter(h => {
      const k = key(h.q, h.r);
      if (seen.has(k)) return false;
      seen.add(k);
      // must be empty
      return !unitAt(h.q, h.r);
    });
  }

  function effectiveRange(u) {
    let r = GameData.UNITS[u.type].range;
    const p = state.players.find(x => x.id === u.owner);
    if (p && p.techs.has("arty2") && (u.type === "artillery" || u.type === "artillery75" || u.type === "fortress_gun"))
      r += 1;
    if (p && p.techs.has("navy3") && GameData.UNITS[u.type].domain === "sea")
      r = Math.max(r, 2);
    return r;
  }

  function attackTargets(u) {
    const range = effectiveRange(u);
    const targets = [];
    for (const enemy of state.units) {
      if (enemy.owner === u.owner || enemy.hp <= 0) continue;
      const d = Hex.dist(u, enemy);
      if (d <= range && d >= 1) targets.push({ q: enemy.q, r: enemy.r });
    }
    return targets;
  }

  function doMove(u, q, r) {
    if (u.moved) return;
    const c = cell(q, r);
    if (!c || unitAt(q, r)) return;
    u.q = q; u.r = r;
    u.moved = true;
    // Capture city
    if (c.city && c.city.nation !== u.owner) {
      const prev = c.city.nation;
      c.city.nation = u.owner;
      c.city.neutral = false;
      c.city.producing = null;
      log(activePlayer().name + " captures " + c.city.name + "!");
      if (c.city.capital && prev) {
        log("Capital " + c.city.name + " has fallen!");
      }
      checkVictory();
    }
    // Serbia guerrilla heal in forest
    if (u.type === "guerrilla" && c.terrain === "forest") {
      u.hp = Math.min(u.maxHp, u.hp + 1);
    }
    refreshHints();
    // After move, still can attack if not attacked
    if (!u.attacked) {
      state.attackHints = attackTargets(u);
      state.moveHints = [];
    } else {
      state.selected = null;
      refreshHints();
    }
  }

  function defenseBonus(u, c) {
    let d = GameData.TERRAIN[c.terrain].def || 0;
    const nat = GameData.NATIONS[u.owner];
    const udef = GameData.UNITS[u.type];
    let defStat = udef.defense;
    if (nat.unitMods[u.type] && nat.unitMods[u.type].defense)
      defStat += nat.unitMods[u.type].defense;
    if (c.city) {
      d += 1;
      if (GameData.NATIONS[c.city.nation] && GameData.NATIONS[c.city.nation].cityDefense)
        d += GameData.NATIONS[c.city.nation].cityDefense;
    }
    if (u.type === "fortified_inf" && (c.city || c.terrain === "trench")) d += 2;
    if (u.type === "alpini" && c.terrain === "mountain") { /* attack handled elsewhere */ }
    return defStat + d;
  }

  function attackStat(u, c) {
    const udef = GameData.UNITS[u.type];
    const nat = GameData.NATIONS[u.owner];
    let a = udef.attack;
    if (nat.unitMods[u.type] && nat.unitMods[u.type].attack) a += nat.unitMods[u.type].attack;
    // France artillery bonus already in unitMods; also generic
    if ((u.type === "artillery" || u.type === "artillery75") && nat.id === "france") a += 0; // already in mods
    if (u.type === "alpini" && c && c.terrain === "mountain") a += 1;
    if (u.type === "guerrilla" && c && c.terrain === "forest") a += 1;
    if (u.veteran) a += 1;
    const p = state.players.find(x => x.id === u.owner);
    if (p && p.techs.has("org3")) a += 1;
    if (p && p.techs.has("navy3") && GameData.UNITS[u.type].domain === "sea") a += 1;
    if (p && p.techs.has("air2") && u.type === "fighter") a += 1;
    if (p && p.techs.has("arty2") && (u.type === "artillery" || u.type === "artillery75" || u.type === "fortress_gun")) {
      // range already handled at target finding via modified check - attack +0 here
    }
    return a;
  }

  function doAttack(attacker, tq, tr) {
    if (attacker.attacked) return;
    const defender = enemyAt(tq, tr, attacker.owner) || unitAt(tq, tr);
    if (!defender || defender.owner === attacker.owner) return;
    const ac = cell(attacker.q, attacker.r);
    const dc = cell(defender.q, defender.r);
    const atk = attackStat(attacker, ac);
    const def = defenseBonus(defender, dc);
    // Damage formula inspired by simple TBS
    let dmg = Math.max(1, Math.round((atk * (0.6 + 0.4 * attacker.hp / attacker.maxHp)) * (6 / Math.max(1.5, def)) + Math.random() * 2));
    let retal = 0;
    const adef = GameData.UNITS[attacker.type];
    if (adef.range <= 1) {
      const datk = GameData.UNITS[defender.type].attack;
      retal = Math.max(0, Math.round((datk * (0.5 + 0.5 * defender.hp / defender.maxHp)) * (3.5 / Math.max(1.5, defenseBonus(attacker, ac))) + Math.random()));
    }
    defender.hp -= dmg;
    log(GameData.UNITS[attacker.type].name + " hits " + GameData.UNITS[defender.type].name + " for " + dmg + ".");
    if (defender.hp <= 0) {
      log(GameData.UNITS[defender.type].name + " destroyed.");
      state.units = state.units.filter(x => x.id !== defender.id);
      attacker.veteran = true;
      // Germany stormtrooper breakthrough
      if (attacker.type === "stormtrooper") {
        attacker.moved = false; // one extra move
        log("Stormtroopers breakthrough!");
      }
      // Capture if move onto tile? melee can advance
      if (adef.range === 1 && !unitAt(tq, tr)) {
        const oc = cell(tq, tr);
        attacker.q = tq; attacker.r = tr;
        if (oc.city && oc.city.nation !== attacker.owner) {
          oc.city.nation = attacker.owner;
          oc.city.neutral = false;
          log("Seized " + oc.city.name + " in the assault!");
        }
      }
    } else if (retal > 0) {
      attacker.hp -= retal;
      log("Counterattack deals " + retal + ".");
      if (attacker.hp <= 0) {
        log(GameData.UNITS[attacker.type].name + " destroyed in the clash.");
        state.units = state.units.filter(x => x.id !== attacker.id);
        state.selected = null;
      }
    }
    if (attacker.hp > 0) {
      attacker.attacked = true;
      attacker.moved = true;
    }
    checkVictory();
    refreshHints();
    if (attacker.hp > 0 && attacker.type === "stormtrooper" && !attacker.moved) {
      state.moveHints = reachable(attacker);
      state.attackHints = [];
    } else {
      state.selected = null;
      state.moveHints = [];
      state.attackHints = [];
    }
  }

  function produce(q, r, unitType) {
    const p = activePlayer();
    if (p.isAI) return false;
    const c = cell(q, r);
    if (!c || !c.city || c.city.nation !== p.id) return false;
    if (unitAt(q, r)) { log("City occupied; cannot recruit."); return false; }
    const techs = p.techs;
    const avail = GameData.availableUnits(p.id, techs);
    if (!avail.includes(unitType)) return false;
    const cost = GameData.unitCost(p.id, unitType, techs);
    if (p.stars < cost) { log("Not enough stars."); return false; }
    const udef = GameData.UNITS[unitType];
    if (udef.domain === "sea") {
      // must be adjacent to water or on coastal - spawn on adjacent water
      const waterNb = Hex.neighbors(q, r).find(n => {
        const cc = cell(n.q, n.r);
        return cc && cc.terrain === "water" && !unitAt(n.q, n.r);
      });
      if (!waterNb) { log("Need adjacent sea to launch ships."); return false; }
      p.stars -= cost;
      state.units.push(makeUnit(unitType, p.id, waterNb.q, waterNb.r));
      log("Launched " + udef.name + " (−" + cost + "★)");
      return true;
    }
    p.stars -= cost;
    const nu = makeUnit(unitType, p.id, q, r);
    nu.moved = true; nu.attacked = true; // newly built can't act
    state.units.push(nu);
    log("Recruited " + udef.name + " in " + c.city.name + " (−" + cost + "★)");
    return true;
  }

  function research(techId) {
    const p = activePlayer();
    if (p.isAI) return false;
    const tech = GameData.TECHS[techId];
    if (!tech || p.techs.has(techId)) return false;
    if (tech.req && !p.techs.has(tech.req)) return false;
    const cost = GameData.techCost(p.id, techId);
    if (p.stars < cost) { log("Not enough stars for research."); return false; }
    p.stars -= cost;
    p.techs.add(techId);
    log("Researched " + tech.name + " (−" + cost + "★)");
    return true;
  }

  function endTurn() {
    if (state.phase !== "play") return;
    const cur = activePlayer();
    // Heal units in cities slightly
    for (const u of state.units) {
      if (u.owner !== cur.id) continue;
      const c = cell(u.q, u.r);
      if (c && c.city && c.city.nation === u.owner) {
        u.hp = Math.min(u.maxHp, u.hp + 2);
      }
      u.moved = false;
      u.attacked = false;
    }
    // Next player
    let next = (state.active + 1) % state.players.length;
    let guard = 0;
    while (!state.players[next].alive && guard < 20) {
      next = (next + 1) % state.players.length;
      guard++;
    }
    if (next <= state.active) state.turn++;
    state.active = next;
    state.selected = null;
    state.cityFocus = null;
    state.moveHints = [];
    state.attackHints = [];
    const np = activePlayer();
    incomeFor(np);
    log("--- " + np.name + " turn " + (state.turn + 1) + " ---");
    checkVictory();
    return np;
  }

  function checkVictory() {
    // A player is eliminated if no cities and no units
    for (const p of state.players) {
      const cities = Object.values(state.cells).filter(c => c.city && c.city.nation === p.id);
      const units = state.units.filter(u => u.owner === p.id && u.hp > 0);
      if (cities.length === 0 && units.length === 0) p.alive = false;
    }
    const alive = state.players.filter(p => p.alive);
    // Capitals: if human lost all capitals
    const human = state.players[0];
    const humanCaps = Object.values(state.cells).filter(c => c.city && c.city.capital && c.city.nation === human.id);
    if (!human.alive || humanCaps.length === 0 && !Object.values(state.cells).some(c => c.city && c.city.nation === human.id)) {
      // only lose if no cities at all
      if (!Object.values(state.cells).some(c => c.city && c.city.nation === human.id)) {
        state.phase = "lost";
        state.winner = null;
        log("Defeat. Your nation has collapsed.");
        return;
      }
    }
    // Win: only human alive among players, OR human holds all original enemy capitals
    if (alive.length === 1 && alive[0].id === human.id) {
      state.phase = "won";
      state.winner = human.id;
      log("Victory! The front is yours.");
      return;
    }
    // Alternate: control every capital on the map
    const capitals = Object.values(state.cells).filter(c => c.city && c.city.capital);
    if (capitals.length && capitals.every(c => c.city.nation === human.id)) {
      state.phase = "won";
      state.winner = human.id;
      log("Victory! All capitals seized.");
    }
  }

  return {
    create, get, selectHex, produce, research, endTurn,
    activePlayer, unitAt, enemyAt, cell, refreshHints, makeUnit, log,
    reachable, attackTargets, doMove, doAttack, incomeFor, checkVictory
  };
})();
