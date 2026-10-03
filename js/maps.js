/* Hex maps for Fronts, 1914 - simplified but recognizable geography */
window.Maps = (function () {
  const { key } = Hex;

  function blank(w, h, fill) {
    const cells = {};
    for (let r = 0; r < h; r++) {
      for (let q = 0; q < w; q++) {
        cells[key(q, r)] = { q, r, terrain: fill || "plains", city: null };
      }
    }
    return { w, h, cells };
  }

  function setT(m, q, r, t) {
    const c = m.cells[key(q, r)];
    if (c) c.terrain = t;
  }
  function setCity(m, q, r, nation, name, isCapital) {
    const c = m.cells[key(q, r)];
    if (!c) return;
    c.city = { nation, name, capital: !!isCapital, level: isCapital ? 2 : 1 };
    if (c.terrain === "water") c.terrain = "plains";
  }
  function paintRect(m, q0, r0, q1, r1, t) {
    for (let r = r0; r <= r1; r++)
      for (let q = q0; q <= q1; q++) setT(m, q, r, t);
  }
  function paintDisk(m, cq, cr, rad, t) {
    for (let r = cr - rad; r <= cr + rad; r++)
      for (let q = cq - rad; q <= cq + rad; q++) {
        if (Hex.dist({ q, r }, { q: cq, r: cr }) <= rad) setT(m, q, r, t);
      }
  }

  /* ---------- EUROPE 1914 ---------- */
  function europe1914() {
    const W = 28, H = 18;
    const m = blank(W, H, "plains");
    // Atlantic / North Sea / Med / Black Sea water regions
    paintRect(m, 0, 0, 4, 7, "water");   // Atlantic west Britain
    paintRect(m, 0, 0, 10, 2, "water");   // North Sea north
    paintRect(m, 5, 0, 12, 3, "water");
    paintRect(m, 0, 10, 6, 17, "water");  // Bay of Biscay / Atlantic SW
    paintRect(m, 7, 14, 20, 17, "water"); // Mediterranean
    paintRect(m, 21, 12, 27, 17, "water"); // Aegean / East Med
    paintRect(m, 24, 6, 27, 10, "water"); // Black Sea
    // Irish Sea / Channel
    for (let q = 3; q <= 8; q++) setT(m, q, 5, "water");
    for (let q = 4; q <= 9; q++) setT(m, q, 6, "water");
    // Baltic
    paintRect(m, 14, 0, 20, 2, "water");
    paintRect(m, 16, 2, 19, 3, "water");
    // Britain island (land on water backdrop)
    paintDisk(m, 4, 3, 2, "plains");
    paintDisk(m, 5, 4, 1, "hills");
    setT(m, 3, 2, "plains"); setT(m, 4, 2, "plains"); setT(m, 5, 2, "plains");
    setT(m, 3, 3, "plains"); setT(m, 4, 3, "plains"); setT(m, 5, 3, "hills");
    setT(m, 3, 4, "plains"); setT(m, 4, 4, "plains");
    // Ireland
    setT(m, 1, 3, "plains"); setT(m, 1, 4, "plains"); setT(m, 2, 3, "hills");
    // Scandinavia edge
    paintRect(m, 12, 0, 15, 1, "forest");
    // Low countries / France / Germany plains
    paintRect(m, 7, 5, 14, 9, "plains");
    // Alps
    paintDisk(m, 11, 10, 2, "mountain");
    paintDisk(m, 12, 11, 2, "mountain");
    setT(m, 10, 10, "mountain"); setT(m, 13, 10, "mountain");
    // Carpathians
    paintDisk(m, 17, 8, 2, "mountain");
    setT(m, 16, 9, "mountain"); setT(m, 18, 9, "hills");
    // Forests east
    paintRect(m, 18, 3, 22, 6, "forest");
    paintRect(m, 20, 4, 24, 7, "forest");
    // Balkans hills
    paintRect(m, 15, 11, 19, 13, "hills");
    // Anatolia
    paintRect(m, 22, 11, 26, 13, "hills");
    paintRect(m, 23, 13, 26, 14, "desert");
    // Spain edge
    paintRect(m, 3, 12, 6, 13, "hills");
    // Restore some land that was over-watered
    paintRect(m, 7, 7, 11, 11, "plains");
    setT(m, 10, 10, "mountain"); setT(m, 11, 10, "mountain"); setT(m, 12, 10, "mountain");
    setT(m, 11, 11, "mountain"); setT(m, 12, 11, "hills");
    // France west coast land
    paintRect(m, 5, 7, 8, 11, "plains");
    setT(m, 5, 8, "plains"); setT(m, 6, 8, "plains");
    // Italy peninsula
    setT(m, 12, 12, "hills"); setT(m, 12, 13, "hills"); setT(m, 13, 13, "plains");
    setT(m, 13, 14, "plains"); setT(m, 12, 14, "water"); // keep Med
    // Ensure Channel water between Britain and France
    setT(m, 5, 5, "water"); setT(m, 6, 5, "water"); setT(m, 7, 5, "water");
    setT(m, 6, 6, "water"); setT(m, 7, 6, "plains"); // Calais area

    // Capitals & cities (approx geography)
    // Britain
    setCity(m, 4, 3, "britain", "London", true);
    setCity(m, 3, 2, "britain", "Edinburgh", false);
    // France
    setCity(m, 8, 8, "france", "Paris", true);
    setCity(m, 6, 10, "france", "Bordeaux", false);
    setCity(m, 9, 9, "france", "Reims", false);
    // Belgium
    setCity(m, 8, 6, "belgium", "Brussels", true);
    setCity(m, 7, 6, "belgium", "Liege", false);
    // Germany
    setCity(m, 12, 6, "germany", "Berlin", true);
    setCity(m, 10, 7, "germany", "Cologne", false);
    setCity(m, 13, 7, "germany", "Breslau", false);
    setCity(m, 11, 5, "germany", "Hamburg", false);
    // Austria-Hungary
    setCity(m, 14, 9, "austria", "Vienna", true);
    setCity(m, 15, 10, "austria", "Budapest", false);
    setCity(m, 13, 11, "austria", "Trieste", false);
    // Italy
    setCity(m, 12, 12, "italy", "Rome", true);
    setCity(m, 11, 11, "italy", "Milan", false);
    // Serbia
    setCity(m, 16, 12, "serbia", "Belgrade", true);
    // Russia
    setCity(m, 22, 5, "russia", "Petrograd", true);
    setCity(m, 21, 7, "russia", "Moscow", false);
    setCity(m, 19, 6, "russia", "Warsaw", false);
    setCity(m, 23, 8, "russia", "Kiev", false);
    // Ottoman
    setCity(m, 22, 12, "ottoman", "Constantinople", true);
    setCity(m, 24, 13, "ottoman", "Ankara", false);
    // USA not on Europe map as playable start - optional expedition city off-map skipped
    // Extra neutral-ish cities become contested
    setCity(m, 17, 11, "serbia", "Nis", false);

    return {
      id: "europe",
      name: "Europe 1914",
      desc: "The great powers collide from the Channel to the Black Sea.",
      w: W, h: H, cells: m.cells,
      nations: ["britain", "france", "germany", "austria", "russia", "ottoman", "italy", "serbia", "belgium"],
      startUnits: defaultStarts
    };
  }

  function defaultStarts(map, nationId) {
    const units = [];
    let capital = null;
    for (const c of Object.values(map.cells)) {
      if (c.city && c.city.nation === nationId && c.city.capital) capital = c;
    }
    if (!capital) return units;
    const nat = GameData.NATIONS[nationId];
    const basic = nat.uniqueUnit === "mass_infantry" ? "mass_infantry" : "infantry";
    const used = new Set([key(capital.q, capital.r)]);
    units.push({ type: basic, q: capital.q, r: capital.r });
    const nbs = Hex.neighbors(capital.q, capital.r);

    function placeNear(type, allowWater) {
      const ring = nbs.concat([]);
      for (const n of nbs) {
        for (const n2 of Hex.neighbors(n.q, n.r)) ring.push(n2);
      }
      for (const n of ring) {
        const k = key(n.q, n.r);
        if (used.has(k)) continue;
        const cell = map.cells[k];
        if (!cell) continue;
        if (allowWater) {
          if (cell.terrain !== "water") continue;
        } else {
          if (cell.terrain === "water") continue;
        }
        units.push({ type, q: n.q, r: n.r });
        used.add(k);
        return true;
      }
      return false;
    }

    placeNear(basic, false);
    if (nationId === "britain") placeNear("ship", true);
    if (nationId === "france") placeNear("artillery", false);
    return units;
  }

  /* ---------- WESTERN FRONT ---------- */
  function westernFront() {
    const W = 16, H = 14;
    const m = blank(W, H, "plains");
    // Channel / North Sea
    paintRect(m, 0, 0, 15, 1, "water");
    paintRect(m, 0, 0, 2, 5, "water");
    // Switzerland mountains SE
    paintRect(m, 12, 11, 15, 13, "mountain");
    paintDisk(m, 13, 12, 2, "mountain");
    // Ardennes / Vosges
    paintRect(m, 8, 5, 11, 8, "forest");
    paintRect(m, 10, 8, 13, 10, "hills");
    // Trench line roughly N-S through center
    for (let r = 2; r <= 11; r++) {
      setT(m, 6, r, "trench");
      setT(m, 7, r, "trench");
    }
    // Flanders mud
    paintRect(m, 3, 2, 5, 4, "swamp");

    setCity(m, 3, 6, "france", "Paris", true);
    setCity(m, 4, 3, "france", "Amiens", false);
    setCity(m, 4, 9, "france", "Nancy", false);
    setCity(m, 5, 2, "belgium", "Brussels", true);
    setCity(m, 5, 4, "belgium", "Ypres", false);
    setCity(m, 11, 4, "germany", "Cologne", false);
    setCity(m, 12, 6, "germany", "Berlin", true);
    setCity(m, 10, 9, "germany", "Metz", false);
    setCity(m, 2, 3, "britain", "Calais Base", false);
    // Britain expedition capital proxy
    setCity(m, 1, 4, "britain", "London HQ", true);
    // AEF sector (late-war stylized)
    setCity(m, 2, 8, "usa", "Saint-Nazaire", true);
    setCity(m, 3, 9, "usa", "American Sector", false);

    return {
      id: "western",
      name: "Western Front",
      desc: "Channel to Switzerland. Trenches divide France and Belgium from Germany.",
      w: W, h: H, cells: m.cells,
      nations: ["britain", "france", "germany", "belgium", "usa"],
      startUnits: defaultStarts
    };
  }

  /* ---------- EASTERN FRONT ---------- */
  function easternFront() {
    const W = 20, H = 14;
    const m = blank(W, H, "plains");
    paintRect(m, 0, 0, 19, 1, "water"); // Baltic
    paintRect(m, 16, 10, 19, 13, "water"); // Black Sea edge
    paintRect(m, 4, 3, 10, 8, "forest"); // Poland / Pripet
    paintDisk(m, 6, 9, 2, "swamp");
    paintRect(m, 8, 10, 12, 12, "hills"); // Carpathians
    paintDisk(m, 10, 11, 2, "mountain");

    setCity(m, 3, 4, "germany", "Berlin", true);
    setCity(m, 5, 3, "germany", "Konigsberg", false);
    setCity(m, 4, 7, "germany", "Breslau", false);
    setCity(m, 7, 10, "austria", "Vienna", true);
    setCity(m, 9, 11, "austria", "Budapest", false);
    setCity(m, 8, 9, "austria", "Krakow", false);
    setCity(m, 15, 3, "russia", "Petrograd", true);
    setCity(m, 14, 6, "russia", "Moscow", false);
    setCity(m, 11, 5, "russia", "Warsaw", false);
    setCity(m, 13, 9, "russia", "Kiev", false);
    setCity(m, 10, 12, "serbia", "Belgrade", true);

    return {
      id: "eastern",
      name: "Eastern Front",
      desc: "From the Baltic forests to the Carpathians.",
      w: W, h: H, cells: m.cells,
      nations: ["germany", "austria", "russia", "serbia"],
      startUnits: defaultStarts
    };
  }

  /* ---------- GALLIPOLI / DARDANELLES ---------- */
  function gallipoli() {
    const W = 14, H = 12;
    const m = blank(W, H, "water");
    // Anatolian side (east)
    paintRect(m, 8, 1, 13, 10, "hills");
    paintRect(m, 9, 3, 12, 8, "plains");
    // Gallipoli peninsula (west of strait)
    paintRect(m, 3, 2, 5, 8, "hills");
    setT(m, 4, 1, "hills"); setT(m, 5, 1, "hills");
    setT(m, 3, 9, "plains"); setT(m, 4, 9, "plains");
    // European Turkey
    paintRect(m, 5, 0, 8, 2, "plains");
    // Dardanelles water corridor
    for (let r = 2; r <= 8; r++) {
      setT(m, 6, r, "water");
      setT(m, 7, r, "water");
    }
    // Aegean
    paintRect(m, 0, 0, 2, 11, "water");
    paintRect(m, 0, 9, 5, 11, "water");
    // Beaches
    setT(m, 3, 5, "plains"); setT(m, 3, 6, "plains");
    setT(m, 5, 4, "plains");

    setCity(m, 10, 5, "ottoman", "Constantinople", true);
    setCity(m, 9, 3, "ottoman", "Gallipoli", false);
    setCity(m, 11, 7, "ottoman", "Bursa", false);
    setCity(m, 4, 4, "britain", "Anzac Cove", true);
    setCity(m, 4, 7, "france", "Cape Helles", true);
    setCity(m, 3, 3, "britain", "Suvla", false);

    return {
      id: "gallipoli",
      name: "Gallipoli / Dardanelles",
      desc: "Narrow seas, steep hills, and a costly landing.",
      w: W, h: H, cells: m.cells,
      nations: ["britain", "france", "ottoman"],
      startUnits: function (map, nationId) {
        const u = defaultStarts(map, nationId);
        if (nationId === "britain" || nationId === "france") {
          // Extra landing infantry
          for (const c of Object.values(map.cells)) {
            if (c.city && c.city.nation === nationId && !c.city.capital) {
              u.push({ type: "infantry", q: c.q, r: c.r });
              break;
            }
          }
        }
        if (nationId === "ottoman") {
          for (const c of Object.values(map.cells)) {
            if (c.city && c.city.nation === "ottoman" && c.city.name === "Gallipoli") {
              u.push({ type: "fortified_inf", q: c.q, r: c.r });
              break;
            }
          }
        }
        return u;
      }
    };
  }

  const ALL = {
    europe: europe1914,
    western: westernFront,
    eastern: easternFront,
    gallipoli: gallipoli
  };

  function get(id) {
    return ALL[id]();
  }

  function list() {
    return Object.keys(ALL).map(id => {
      const m = ALL[id]();
      return { id: m.id, name: m.name, desc: m.desc, nations: m.nations };
    });
  }

  return { get, list, ALL };
})();
