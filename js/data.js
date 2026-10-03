/* Nations, units, tech for Fronts, 1914 */
window.GameData = (function () {
  const NATIONS = {
    britain: {
      id: "britain", name: "Britain", color: "#1a3a6e", accent: "#c41e3a",
      ability: "Naval Tradition: ships cost 1 less; start with Coastal Patrol researched.",
      uniqueUnit: "dreadnought",
      startTechs: ["org1", "navy1"],
      techMods: { navy2: -1, navy3: -1 },
      unitMods: {}
    },
    france: {
      id: "france", name: "France", color: "#0055a4", accent: "#ef4135",
      ability: "Quick-Firing Guns: artillery deals +1 damage; unique Canon de 75.",
      uniqueUnit: "artillery75",
      startTechs: ["org1", "arty1"],
      techMods: { arty2: -1 },
      unitMods: { artillery: { attack: 1 }, artillery75: { attack: 1 } }
    },
    germany: {
      id: "germany", name: "Germany", color: "#4a4a4a", accent: "#dd0000",
      ability: "Infiltration: Stormtroopers ignore zone of control for one extra move after attack kill.",
      uniqueUnit: "stormtrooper",
      startTechs: ["org1", "ind1"],
      techMods: { org2: -1, org3: -1 },
      unitMods: {}
    },
    austria: {
      id: "austria", name: "Austria-Hungary", color: "#8b6914", accent: "#c41e3a",
      ability: "Alpine Warriors: mountain move cost 1; unique Mountain Infantry.",
      uniqueUnit: "mountain_inf",
      startTechs: ["org1"],
      techMods: { org2: 0 },
      unitMods: {},
      mountainCost: 1
    },
    russia: {
      id: "russia", name: "Russia", color: "#1a5c2e", accent: "#d52b1e",
      ability: "Human Wave: infantry costs 1 less; all tech costs +1.",
      uniqueUnit: "mass_infantry",
      startTechs: ["org1"],
      techMods: { _all: 1 },
      unitMods: { infantry: { cost: -1 }, mass_infantry: { cost: -1 } }
    },
    ottoman: {
      id: "ottoman", name: "Ottoman Empire", color: "#a51c2a", accent: "#e8e0c8",
      ability: "Entrenched: Fortified Infantry +2 defense in cities and trenches.",
      uniqueUnit: "fortified_inf",
      startTechs: ["org1", "ind1"],
      techMods: { ind2: -1 },
      unitMods: {}
    },
    italy: {
      id: "italy", name: "Italy", color: "#008c45", accent: "#cd212a",
      ability: "Alpini Corps: Alpini move freely in mountains and gain +1 attack there.",
      uniqueUnit: "alpini",
      startTechs: ["org1"],
      techMods: { org2: -1 },
      unitMods: {}
    },
    usa: {
      id: "usa", name: "United States", color: "#3c3b6e", accent: "#b22234",
      ability: "Arsenal of Democracy: after Industry II, cities produce +1 star and grow faster.",
      uniqueUnit: "infantry",
      startTechs: ["org1", "ind1"],
      techMods: { ind2: -1, ind3: -1 },
      unitMods: {},
      lateIndustry: true
    },
    serbia: {
      id: "serbia", name: "Serbia", color: "#0c4076", accent: "#c6363c",
      ability: "Partisan War: Guerrillas heal 1 in forest and deal +1 from forest.",
      uniqueUnit: "guerrilla",
      startTechs: ["org1"],
      techMods: { org2: -1 },
      unitMods: {}
    },
    belgium: {
      id: "belgium", name: "Belgium", color: "#2d2d2d", accent: "#fdda24",
      ability: "National Redoubt: cities +2 defense; unique Fortress Gun.",
      uniqueUnit: "fortress_gun",
      startTechs: ["org1", "arty1"],
      techMods: { arty1: -1 },
      unitMods: {},
      cityDefense: 2
    }
  };

  const UNITS = {
    infantry: {
      id: "infantry", name: "Infantry", cost: 3, hp: 10, move: 2, attack: 2, defense: 2,
      range: 1, sprite: "unit_infantry", req: null, domain: "land"
    },
    cavalry: {
      id: "cavalry", name: "Cavalry", cost: 5, hp: 10, move: 3, attack: 3, defense: 1,
      range: 1, sprite: "unit_cavalry", req: "org2", domain: "land"
    },
    artillery: {
      id: "artillery", name: "Artillery", cost: 6, hp: 8, move: 1, attack: 4, defense: 1,
      range: 2, sprite: "unit_artillery", req: "arty1", domain: "land"
    },
    ship: {
      id: "ship", name: "Destroyer", cost: 6, hp: 10, move: 3, attack: 3, defense: 2,
      range: 1, sprite: "unit_ship", req: "navy1", domain: "sea"
    },
    dreadnought: {
      id: "dreadnought", name: "Dreadnought", cost: 10, hp: 16, move: 3, attack: 5, defense: 4,
      range: 2, sprite: "unit_dreadnought", req: "navy2", domain: "sea", unique: "britain"
    },
    artillery75: {
      id: "artillery75", name: "Canon de 75", cost: 7, hp: 8, move: 2, attack: 5, defense: 1,
      range: 2, sprite: "unit_artillery75", req: "arty2", domain: "land", unique: "france"
    },
    stormtrooper: {
      id: "stormtrooper", name: "Stormtrooper", cost: 6, hp: 10, move: 2, attack: 4, defense: 2,
      range: 1, sprite: "unit_stormtrooper", req: "org3", domain: "land", unique: "germany"
    },
    mountain_inf: {
      id: "mountain_inf", name: "Mountain Infantry", cost: 4, hp: 10, move: 2, attack: 3, defense: 3,
      range: 1, sprite: "unit_mountain_inf", req: "org2", domain: "land", unique: "austria"
    },
    mass_infantry: {
      id: "mass_infantry", name: "Rifle Mass", cost: 2, hp: 10, move: 2, attack: 2, defense: 1,
      range: 1, sprite: "unit_mass_infantry", req: null, domain: "land", unique: "russia"
    },
    fortified_inf: {
      id: "fortified_inf", name: "Fortified Infantry", cost: 4, hp: 12, move: 1, attack: 2, defense: 4,
      range: 1, sprite: "unit_fortified_inf", req: "org2", domain: "land", unique: "ottoman"
    },
    alpini: {
      id: "alpini", name: "Alpini", cost: 5, hp: 10, move: 2, attack: 3, defense: 3,
      range: 1, sprite: "unit_alpini", req: "org2", domain: "land", unique: "italy"
    },
    guerrilla: {
      id: "guerrilla", name: "Guerrilla", cost: 3, hp: 8, move: 3, attack: 3, defense: 1,
      range: 1, sprite: "unit_guerrilla", req: "org2", domain: "land", unique: "serbia"
    },
    fortress_gun: {
      id: "fortress_gun", name: "Fortress Gun", cost: 7, hp: 10, move: 1, attack: 5, defense: 3,
      range: 2, sprite: "unit_fortress_gun", req: "arty2", domain: "land", unique: "belgium"
    },
    fighter: {
      id: "fighter", name: "Fighter", cost: 8, hp: 6, move: 4, attack: 3, defense: 1,
      range: 1, sprite: "unit_fighter", req: "air1", domain: "air"
    }
  };

  /* Tech tree skeleton: org, industry, artillery, navy, air */
  const TECHS = {
    org1: { id: "org1", name: "Drill", branch: "organization", cost: 3, req: null, desc: "Unlocks basic command. Required for advanced infantry." },
    org2: { id: "org2", name: "Field Manuals", branch: "organization", cost: 5, req: "org1", desc: "Unlocks Cavalry and unique infantry variants." },
    org3: { id: "org3", name: "Shock Tactics", branch: "organization", cost: 8, req: "org2", desc: "Unlocks Stormtroopers (Germany) and veteran bonuses (+1 attack all land)." },
    ind1: { id: "ind1", name: "Workshops", branch: "industry", cost: 4, req: null, desc: "+1 star from each city." },
    ind2: { id: "ind2", name: "Factories", branch: "industry", cost: 7, req: "ind1", desc: "+1 more star from cities. USA city growth." },
    ind3: { id: "ind3", name: "War Economy", branch: "industry", cost: 10, req: "ind2", desc: "Units cost 1 less (min 1)." },
    arty1: { id: "arty1", name: "Field Guns", branch: "artillery", cost: 5, req: null, desc: "Unlocks Artillery." },
    arty2: { id: "arty2", name: "Heavy Batteries", branch: "artillery", cost: 8, req: "arty1", desc: "Unlocks unique artillery; +1 artillery range." },
    navy1: { id: "navy1", name: "Coastal Patrol", branch: "navy", cost: 4, req: null, desc: "Unlocks Destroyers; land units may embark on owned coastal cities later." },
    navy2: { id: "navy2", name: "Battle Fleet", branch: "navy", cost: 8, req: "navy1", desc: "Unlocks Dreadnought (Britain)." },
    navy3: { id: "navy3", name: "Grand Fleet", branch: "navy", cost: 12, req: "navy2", desc: "Ships +1 attack and +1 move." },
    air1: { id: "air1", name: "Reconnaissance", branch: "air", cost: 6, req: "org1", desc: "Unlocks Fighters." },
    air2: { id: "air2", name: "Air Superiority", branch: "air", cost: 10, req: "air1", desc: "Fighters +1 attack; reveal adjacent fog if enabled." }
  };

  const BRANCHES = ["organization", "industry", "artillery", "navy", "air"];

  const TERRAIN = {
    plains: { name: "Plains", move: 1, def: 0, color: "#78a05a" },
    forest: { name: "Forest", move: 1, def: 1, color: "#3a6e37" },
    hills: { name: "Hills", move: 1, def: 1, color: "#96a05a" },
    mountain: { name: "Mountain", move: 2, def: 2, color: "#8a8278" },
    water: { name: "Water", move: 99, def: 0, color: "#3264aa", sea: true },
    trench: { name: "Trench", move: 1, def: 2, color: "#6e6850" },
    desert: { name: "Desert", move: 1, def: 0, color: "#d2be8c" },
    swamp: { name: "Swamp", move: 2, def: 0, color: "#507050" }
  };

  function techCost(nationId, techId) {
    const tech = TECHS[techId];
    const nat = NATIONS[nationId];
    let c = tech.cost;
    if (nat.techMods._all) c += nat.techMods._all;
    if (nat.techMods[techId] != null) c += nat.techMods[techId];
    return Math.max(1, c);
  }

  function unitCost(nationId, unitId, techs) {
    const u = UNITS[unitId];
    const nat = NATIONS[nationId];
    let c = u.cost;
    if (nat.unitMods[unitId] && nat.unitMods[unitId].cost) c += nat.unitMods[unitId].cost;
    if (techs && techs.has("ind3")) c -= 1;
    if (nationId === "britain" && (unitId === "ship" || unitId === "dreadnought")) c -= 1;
    return Math.max(1, c);
  }

  function availableUnits(nationId, techs) {
    const list = [];
    for (const id of Object.keys(UNITS)) {
      const u = UNITS[id];
      if (u.unique && u.unique !== nationId) continue;
      if (u.req && !techs.has(u.req)) continue;
      // Russia prefers mass_infantry over basic for free build, but both available if unlocked
      if (id === "infantry" && nationId === "russia") continue; // use mass instead at same tier
      if (id === "mass_infantry" && nationId !== "russia") continue;
      list.push(id);
    }
    return list;
  }

  return { NATIONS, UNITS, TECHS, BRANCHES, TERRAIN, techCost, unitCost, availableUnits };
})();
