/* Hand-authored hex maps for Fronts, 1914. No DOM. */
(function (factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.Maps = api;
})(function () {
  function fromRows(rows) {
    const h = rows.length;
    const w = rows[0].length;
    const cells = [];
    const code = {
      ".": "plains",
      "F": "forest",
      "M": "mountain",
      "H": "hills",
      "W": "water",
      "T": "trench",
      "D": "desert",
      "S": "swamp"
    };
    for (let r = 0; r < h; r++) {
      if (rows[r].length !== w) throw new Error("Row " + r + " width " + rows[r].length + " != " + w);
      for (let q = 0; q < w; q++) {
        const ch = rows[r].charAt(q);
        const terrain = code[ch];
        if (!terrain) throw new Error("Bad terrain '" + ch + "' at " + q + "," + r);
        cells.push({ q: q, r: r, terrain: terrain, city: null });
      }
    }
    return { w: w, h: h, cells: cells };
  }

  function at(map, q, r) {
    return map.cells[r * map.w + q];
  }

  function put(map, q, r, terrain) {
    const c = at(map, q, r);
    if (!c) throw new Error("off map " + q + "," + r);
    c.terrain = terrain;
  }

  function city(map, q, r, owner, name, capital) {
    const c = at(map, q, r);
    if (!c) throw new Error("city off map " + name);
    if (c.terrain === "water") c.terrain = "plains";
    c.city = { owner: owner, name: name, capital: !!capital };
  }

  function disk(map, cq, cr, rad, terrain) {
    for (let r = cr - rad; r <= cr + rad; r++) {
      for (let q = cq - rad; q <= cq + rad; q++) {
        if (r < 0 || q < 0 || r >= map.h || q >= map.w) continue;
        const dq = q - cq, dr = r - cr, ds = -dq - dr;
        const dist = (Math.abs(dq) + Math.abs(dr) + Math.abs(ds)) / 2;
        if (dist <= rad) put(map, q, r, terrain);
      }
    }
  }

  function western() {
    const rows = [
      "WWWWWW..........",
      "WWWW............",
      "WW..............",
      "WW.....TTT......",
      "W......TTT......",
      ".......TTT......",
      "...FFF..HH..SS..",
      "....F...HH..SS..",
      "........HH......",
      ".......HHH......",
      "......MMMM......",
      ".....MMMM......."
    ];
    const m = fromRows(rows);
    city(m, 3, 2, "britain", "BEF Base", true);
    city(m, 6, 2, "belgium", "Brussels", true);
    city(m, 6, 3, "france", "Lille", false);
    city(m, 4, 4, "france", "Amiens", false);
    city(m, 3, 8, "france", "Paris", true);
    city(m, 6, 5, "france", "Reims", false);
    city(m, 8, 5, "france", "Verdun", false);
    city(m, 10, 4, "germany", "Metz", false);
    city(m, 11, 6, "germany", "Strasbourg", false);
    city(m, 12, 3, "germany", "Cologne", true);
    m.id = "western";
    m.name = "Western Front";
    m.desc = "From the Channel coast to the Rhine. Trenches, the Ardennes, and a short front.";
    m.nations = ["britain", "france", "belgium", "germany"];
    return m;
  }

  function eastern() {
    const rows = [
      "WWWWWWWWWWWWWWWW",
      "WWW..SSSS..WWW..",
      "..FF..SSSS......",
      "..FFF..SS.......",
      "..FFF...........",
      "...FF...........",
      "......HH........",
      ".....HHMMM......",
      "....HHMMMM......",
      ".....HMMM.......",
      "......MM........",
      "..HH............",
      "..H.............",
      "................"
    ];
    const m = fromRows(rows);
    city(m, 4, 1, "germany", "Königsberg", true);
    city(m, 1, 4, "germany", "Posen", false);
    city(m, 8, 4, "russia", "Warsaw", true);
    city(m, 11, 3, "russia", "Brest", false);
    city(m, 14, 6, "russia", "Kiev", false);
    city(m, 6, 6, "austria", "Kraków", true);
    city(m, 4, 6, "austria", "Przemyśl", false);
    city(m, 10, 8, "austria", "Lvov", false);
    m.id = "eastern";
    m.name = "Eastern Front";
    m.desc = "Baltic coast, Masurian lakes, and the Carpathians.";
    m.nations = ["germany", "austria", "russia"];
    return m;
  }

  function gallipoli() {
    const rows = [
      "WWWW..HHHH.DDD",
      "WWW.HHHHHH.DDD",
      "WWWHHWHHHH.HDD",
      "WW.HHWHHHH.HHH",
      "WW.HHWH.HH.HHD",
      "WWWHHWHHHH.HDD",
      "WWW.HWHHHH.DDD",
      "WWWWHWHH..DDDD",
      "WWWWWWHH..DDDD",
      "WWWWWW...DDDDD",
      "WWWWWWW.DDDDDD",
      "WWWWWWWWDDDDDD"
    ];
    const m = fromRows(rows);
    put(m, 3, 7, "hills");
    put(m, 4, 8, "hills");
    city(m, 3, 4, "britain", "Anzac", true);
    city(m, 4, 7, "france", "Cape Helles", true);
    city(m, 4, 6, "france", "Sedd el Bahr", false);
    city(m, 8, 1, "ottoman", "Constantinople", true);
    city(m, 7, 4, "ottoman", "Kilid Bahr", false);
    m.id = "gallipoli";
    m.name = "Gallipoli";
    m.desc = "A narrow strait, a hilly peninsula, and beachheads within gunshot of the forts.";
    m.nations = ["britain", "france", "ottoman"];
    m.startingTechs = { britain: ["sea_power"], france: ["sea_power"], ottoman: ["sea_power"] };
    return m;
  }

  function europe() {
    const W = 24, H = 18;
    const rows = [];
    for (let r = 0; r < H; r++) rows.push(new Array(W).fill("W").join(""));
    const m = fromRows(rows);

    function rect(q0, r0, q1, r1, t) {
      for (let r = r0; r <= r1; r++) {
        for (let q = q0; q <= q1; q++) {
          if (q >= 0 && r >= 0 && q < W && r < H) put(m, q, r, t);
        }
      }
    }

    /* Scandinavia stub in the north sea */
    rect(13, 1, 16, 2, "forest");
    /* Britain */
    rect(3, 1, 4, 3, "plains");
    put(m, 5, 1, "plains");
    put(m, 5, 2, "hills");
    put(m, 4, 1, "hills");
    /* Ireland */
    put(m, 1, 2, "plains");
    put(m, 1, 3, "hills");
    put(m, 2, 2, "plains");
    /* Continent: Low Countries through Russia, q=6 so the Channel at q=5 stays water */
    rect(6, 3, 20, 12, "plains");
    /* French Atlantic bulge, still one hex off Britain */
    rect(5, 7, 5, 12, "plains");
    /* Italian peninsula */
    put(m, 10, 12, "hills");
    put(m, 11, 12, "hills");
    put(m, 12, 12, "hills");
    put(m, 11, 13, "plains");
    put(m, 12, 13, "plains");
    put(m, 13, 13, "hills");
    put(m, 12, 14, "plains");
    put(m, 13, 14, "plains");
    put(m, 12, 15, "hills");
    /* Anatolia */
    rect(21, 11, 23, 13, "hills");
    put(m, 22, 12, "desert");
    put(m, 23, 12, "desert");
    put(m, 22, 13, "desert");
    put(m, 23, 13, "desert");
    put(m, 21, 13, "desert");
    /* AEF salient on the Atlantic edge */
    put(m, 4, 9, "plains");

    /* Alps */
    disk(m, 11, 10, 1, "mountain");
    put(m, 12, 9, "mountain");
    put(m, 10, 10, "mountain");
    put(m, 13, 10, "hills");
    put(m, 12, 11, "mountain");
    put(m, 11, 11, "mountain");
    /* Carpathians */
    put(m, 16, 7, "mountain");
    put(m, 17, 7, "mountain");
    put(m, 17, 8, "mountain");
    put(m, 18, 8, "mountain");
    put(m, 18, 9, "hills");
    put(m, 16, 8, "hills");
    /* Balkans */
    put(m, 16, 12, "mountain");
    put(m, 17, 12, "hills");
    put(m, 17, 13, "mountain");
    put(m, 18, 12, "hills");
    put(m, 18, 13, "hills");
    /* Adriatic — three hexes of water so armies cannot walk Italy to the Balkans */
    rect(14, 12, 16, 15, "water");
    rect(13, 13, 13, 15, "water");
    /* Black Sea */
    rect(21, 7, 23, 10, "water");
    rect(20, 8, 20, 9, "water");
    /* Sea of Marmara / strait, one hex, with a land bridge to the north */
    put(m, 20, 12, "water");
    put(m, 20, 11, "water");
    put(m, 19, 12, "plains");
    /* Mediterranean basin */
    rect(0, 16, 23, 17, "water");
    rect(0, 15, 11, 15, "water");
    rect(14, 15, 23, 15, "water");
    rect(0, 14, 10, 14, "water");
    rect(15, 14, 23, 14, "water");
    /* keep Italian toe */
    put(m, 12, 14, "plains");
    put(m, 13, 14, "plains");
    put(m, 12, 15, "hills");
    /* Southern shore around the straits so an army can reach Constantinople */
    put(m, 19, 13, "hills");
    put(m, 20, 13, "desert");

    /* Forests: Germany / Poland / Russia */
    rect(14, 4, 17, 5, "forest");
    rect(18, 4, 20, 6, "forest");
    put(m, 15, 6, "forest");
    put(m, 19, 3, "forest");
    put(m, 18, 3, "forest");
    /* Ardennes-ish wood on the French frontier */
    put(m, 8, 7, "forest");
    put(m, 9, 7, "forest");
    put(m, 9, 8, "forest");
    /* Swamp, Pripet */
    put(m, 18, 6, "swamp");
    put(m, 19, 6, "swamp");
    put(m, 19, 7, "swamp");
    /* A few trenches on the Franco-German frontier */
    put(m, 9, 6, "trench");
    put(m, 11, 7, "trench");
    /* Hills, Scottish and Balkan approaches already partly set */
    put(m, 7, 11, "hills");
    put(m, 8, 12, "hills");

    city(m, 4, 2, "britain", "London", true);
    city(m, 4, 1, "britain", "Edinburgh", false);
    city(m, 8, 8, "france", "Paris", true);
    city(m, 6, 11, "france", "Bordeaux", false);
    city(m, 9, 10, "france", "Lyon", false);
    city(m, 8, 5, "belgium", "Brussels", true);
    city(m, 13, 5, "germany", "Berlin", true);
    city(m, 10, 6, "germany", "Cologne", false);
    city(m, 12, 8, "germany", "Munich", false);
    city(m, 15, 8, "austria", "Vienna", true);
    city(m, 17, 9, "austria", "Budapest", false);
    city(m, 12, 14, "italy", "Rome", true);
    city(m, 9, 12, "italy", "Milan", false);
    city(m, 17, 11, "serbia", "Belgrade", true);
    city(m, 21, 12, "ottoman", "Constantinople", true);
    city(m, 18, 11, "ottoman", "Adrianople", false);
    city(m, 18, 4, "russia", "Petrograd", true);
    city(m, 20, 6, "russia", "Moscow", false);
    city(m, 16, 6, "russia", "Warsaw", false);
    city(m, 4, 9, "usa", "AEF Base", true);
    city(m, 10, 4, null, "Amsterdam", false);

    m.id = "europe";
    m.name = "Europe 1914";
    m.desc = "Channel to the Black Sea. Ten nations, and an American staging city on the Atlantic edge.";
    m.nations = ["britain", "france", "belgium", "germany", "italy", "austria", "serbia", "ottoman", "russia", "usa"];
    return m;
  }

  const ALL = {
    europe: europe,
    western: western,
    eastern: eastern,
    gallipoli: gallipoli
  };

  function get(id) { return ALL[id](); }

  function list() {
    return ["western", "eastern", "gallipoli", "europe"].map(function (id) {
      const m = ALL[id]();
      return { id: m.id, name: m.name, desc: m.desc, nations: m.nations.slice() };
    });
  }

  return { get: get, list: list, ALL: ALL };
});
