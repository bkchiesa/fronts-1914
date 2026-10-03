/* Asset loader: prefers /art/*.png, falls back to procedural canvas */
window.Art = (function () {
  const cache = {};
  const base = "art/";
  let ready = false;
  let waiters = [];

  const NEEDED = [
    "terrain_plains","terrain_forest","terrain_mountain","terrain_hills",
    "terrain_water","terrain_trench","terrain_desert","terrain_swamp",
    "city","capital",
    "unit_infantry","unit_cavalry","unit_artillery","unit_ship","unit_dreadnought",
    "unit_artillery75","unit_stormtrooper","unit_mountain_inf","unit_mass_infantry",
    "unit_fortified_inf","unit_alpini","unit_guerrilla","unit_fortress_gun","unit_fighter",
    "flag_britain","flag_france","flag_germany","flag_austria","flag_russia",
    "flag_ottoman","flag_italy","flag_usa","flag_serbia","flag_belgium",
    "icon_star","icon_tech","icon_endturn","icon_skull",
    "overlay_select","overlay_move","overlay_attack"
  ];

  function loadImage(name) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { cache[name] = img; resolve(img); };
      img.onerror = () => {
        cache[name] = procedural(name);
        resolve(cache[name]);
      };
      img.src = base + name + ".png";
    });
  }

  function procedural(name) {
    const c = document.createElement("canvas");
    c.width = 64; c.height = 64;
    const g = c.getContext("2d");
    g.fillStyle = "#888";
    g.fillRect(8, 8, 48, 48);
    g.fillStyle = "#fff";
    g.font = "10px sans-serif";
    g.fillText(name.slice(0, 8), 10, 32);
    return c;
  }

  function loadAll() {
    return Promise.all(NEEDED.map(loadImage)).then(() => {
      ready = true;
      waiters.forEach(fn => fn());
      waiters = [];
    });
  }

  function get(name) {
    return cache[name] || null;
  }

  function whenReady(fn) {
    if (ready) fn();
    else waiters.push(fn);
  }

  return { loadAll, get, whenReady, cache };
})();
