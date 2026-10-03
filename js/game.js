/* Fronts, 1914 — canvas staff map and panels. */
(function () {
  const HEX = 32;
  const art = {};
  let game = null;
  let mapId = "western";
  let hotseat = false;
  let pick1 = null;
  let pick2 = null;
  let cam = { x: 48, y: 48, scale: 1 };
  let selectedId = null;
  let focus = null;
  let busy = false;
  let endedBy = null;
  let drag = null;
  const canvas = document.getElementById("map");
  const ctx = canvas.getContext("2d");

  /* Khaki Plate paths. Loose root unit_*.png and terrain_*.png are not used.
     Flags stay art/flag_*.png. Hills, desert, and swamp reuse the closest plate. */
  const TERRAIN_PATH = {
    plains: "art/terrain/plains.png",
    forest: "art/terrain/forest.png",
    mountain: "art/terrain/mountain.png",
    water: "art/terrain/water.png",
    trench: "art/terrain/trench.png",
    hills: "art/terrain/mountain.png",
    desert: "art/terrain/plains.png",
    swamp: "art/terrain/forest.png"
  };
  const SETTLEMENT_PATH = {
    city: "art/settlements/city.png",
    capital: "art/settlements/capital.png"
  };
  const BADGE_PATH = {
    britain: "art/nations/britain.png",
    france: "art/nations/france.png",
    germany: "art/nations/germany.png",
    austria: "art/nations/austria-hungary.png",
    russia: "art/nations/russia.png",
    ottoman: "art/nations/ottoman.png",
    italy: "art/nations/italy.png",
    usa: "art/nations/united-states.png",
    serbia: "art/nations/serbia.png",
    belgium: "art/nations/belgium.png"
  };
  const NATION_CODE = {
    britain: "gb", france: "fr", germany: "de", austria: "ah", russia: "ru",
    ottoman: "ot", italy: "it", usa: "us", serbia: "rs", belgium: "be"
  };
  const HAS_BATTLESHIP = { gb: 1, ah: 1, ru: 1, ot: 1 };
  const HAS_PLANE = { fr: 1, de: 1, it: 1, us: 1, be: 1 };
  const HAS_BALLOON = { rs: 1 };
  const UNIT_CHAIN = {
    infantry: ["infantry"],
    cavalry: ["cavalry"],
    artillery: ["artillery"],
    ship: ["battleship", "unique", "infantry"],
    dreadnought: ["battleship", "unique", "infantry"],
    artillery75: ["unique", "artillery", "infantry"],
    stormtrooper: ["unique", "infantry"],
    mountain_inf: ["unique", "infantry"],
    mass_infantry: ["unique", "infantry"],
    fortified_inf: ["unique", "infantry"],
    alpini: ["unique", "infantry"],
    guerrilla: ["unique", "infantry"],
    fortress_gun: ["unique", "artillery", "infantry"],
    fighter: ["plane", "balloon", "unique", "infantry"]
  };
  const UNIT_FILES = [
    "art/units/gb-infantry.png", "art/units/gb-cavalry.png", "art/units/gb-artillery.png", "art/units/gb-unique.png", "art/units/gb-battleship.png",
    "art/units/fr-infantry.png", "art/units/fr-cavalry.png", "art/units/fr-artillery.png", "art/units/fr-unique.png", "art/units/fr-plane.png",
    "art/units/de-infantry.png", "art/units/de-cavalry.png", "art/units/de-artillery.png", "art/units/de-unique.png", "art/units/de-plane.png",
    "art/units/ah-infantry.png", "art/units/ah-cavalry.png", "art/units/ah-artillery.png", "art/units/ah-unique.png", "art/units/ah-battleship.png",
    "art/units/ru-infantry.png", "art/units/ru-cavalry.png", "art/units/ru-artillery.png", "art/units/ru-unique.png", "art/units/ru-battleship.png",
    "art/units/ot-infantry.png", "art/units/ot-cavalry.png", "art/units/ot-artillery.png", "art/units/ot-unique.png", "art/units/ot-battleship.png",
    "art/units/it-infantry.png", "art/units/it-cavalry.png", "art/units/it-artillery.png", "art/units/it-unique.png", "art/units/it-plane.png",
    "art/units/us-infantry.png", "art/units/us-cavalry.png", "art/units/us-artillery.png", "art/units/us-unique.png", "art/units/us-plane.png",
    "art/units/rs-infantry.png", "art/units/rs-cavalry.png", "art/units/rs-artillery.png", "art/units/rs-unique.png", "art/units/rs-balloon.png",
    "art/units/be-infantry.png", "art/units/be-cavalry.png", "art/units/be-artillery.png", "art/units/be-unique.png", "art/units/be-plane.png"
  ];

  function haveSuffix(code, suffix) {
    if (suffix === "battleship") return !!HAS_BATTLESHIP[code];
    if (suffix === "plane") return !!HAS_PLANE[code];
    if (suffix === "balloon") return !!HAS_BALLOON[code];
    return suffix === "infantry" || suffix === "cavalry" || suffix === "artillery" || suffix === "unique";
  }

  function unitPath(nationId, unitType) {
    const code = NATION_CODE[nationId];
    if (!code) return null;
    const chain = UNIT_CHAIN[unitType] || ["infantry"];
    for (let i = 0; i < chain.length; i++) {
      if (!haveSuffix(code, chain[i])) continue;
      return "art/units/" + code + "-" + chain[i] + ".png";
    }
    return "art/units/" + code + "-infantry.png";
  }

  function knockChalk(img) {
    const c = document.createElement("canvas");
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const g = c.getContext("2d");
    g.drawImage(img, 0, 0);
    let imageData;
    try { imageData = g.getImageData(0, 0, c.width, c.height); }
    catch (err) { return Promise.resolve(img); }
    const d = imageData.data;
    const w = c.width, h = c.height;
    function at(x, y) {
      const i = (y * w + x) * 4;
      return [d[i], d[i + 1], d[i + 2]];
    }
    const corners = [at(2, 2), at(w - 3, 2), at(2, h - 3), at(w - 3, h - 3)];
    const bg = [0, 0, 0];
    for (let k = 0; k < 4; k++) { bg[0] += corners[k][0]; bg[1] += corners[k][1]; bg[2] += corners[k][2]; }
    bg[0] /= 4; bg[1] /= 4; bg[2] /= 4;
    const thresh2 = 46 * 46;
    const seen = new Uint8Array(w * h);
    const qx = new Int32Array(w * h);
    const qy = new Int32Array(w * h);
    let qe = 0;
    function push(x, y) {
      if (x < 0 || y < 0 || x >= w || y >= h) return;
      const id = y * w + x;
      if (seen[id]) return;
      const i = id * 4;
      const dr = d[i] - bg[0], dg = d[i + 1] - bg[1], db = d[i + 2] - bg[2];
      if (dr * dr + dg * dg + db * db > thresh2) return;
      seen[id] = 1;
      qx[qe] = x; qy[qe] = y; qe++;
    }
    for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
    for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
    for (let qs = 0; qs < qe; qs++) {
      const x = qx[qs], y = qy[qs];
      push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
    }
    for (let id = 0; id < w * h; id++) if (seen[id]) d[id * 4 + 3] = 0;
    g.putImageData(imageData, 0, 0);
    return new Promise(function (resolve) {
      const out = new Image();
      out.onload = function () { resolve(out); };
      out.onerror = function () { resolve(img); };
      out.src = c.toDataURL("image/png");
    });
  }

  function loadOne(path, key, cut) {
    return new Promise(function (resolve) {
      const img = new Image();
      img.onload = function () {
        const store = function (finalImg) {
          art[key] = finalImg;
          if (key !== path) art[path] = finalImg;
          draw();
          resolve(finalImg);
        };
        if (cut) knockChalk(img).then(store);
        else store(img);
      };
      img.onerror = function () { art[key] = null; resolve(null); };
      img.src = path;
    });
  }

  function loadArt() {
    const jobs = [];
    Object.keys(TERRAIN_PATH).forEach(function (id) {
      const path = TERRAIN_PATH[id];
      if (jobs.indexOf(path) === -1) jobs.push(loadOne(path, path, false));
    });
    jobs.push(loadOne(SETTLEMENT_PATH.city, SETTLEMENT_PATH.city, false));
    jobs.push(loadOne(SETTLEMENT_PATH.capital, SETTLEMENT_PATH.capital, false));
    jobs.push(loadOne("art/ui/frame.png", "art/ui/frame.png", false));
    Object.keys(BADGE_PATH).forEach(function (id) {
      jobs.push(loadOne(BADGE_PATH[id], BADGE_PATH[id], true));
    });
    UNIT_FILES.forEach(function (path) { jobs.push(loadOne(path, path, true)); });
    ["britain", "france", "germany", "austria", "russia", "ottoman", "italy", "usa", "serbia", "belgium"].forEach(function (id) {
      const key = Rules.NATIONS[id].flag;
      jobs.push(loadOne("art/" + key + ".png", key, false));
    });
    ["icon_endturn", "icon_skull", "icon_star", "icon_tech", "overlay_attack", "overlay_move", "overlay_select"].forEach(function (name) {
      jobs.push(loadOne("art/" + name + ".png", name, false));
    });
    return Promise.all(jobs);
  }

  function spriteReady(name) {
    const img = art[name];
    return !!(img && img.complete && img.naturalWidth > 0);
  }

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function note(text) {
    const n = document.getElementById("note");
    if (n) n.textContent = text || "";
  }

  function current() { return game ? Rules.current(game) : null; }

  function hexCenter(q, r) {
    const p = Hex.toPixel(q, r, HEX);
    return { x: cam.x + p.x * cam.scale, y: cam.y + p.y * cam.scale };
  }

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth || 800;
    const h = canvas.clientHeight || 600;
    canvas.width = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  function fitCamera() {
    if (!game) return;
    const size = HEX;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const k in game.cells) {
      const c = game.cells[k];
      const p = Hex.toPixel(c.q, c.r, size);
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
    }
    const cw = canvas.clientWidth || 800;
    const ch = canvas.clientHeight || 600;
    const worldW = (maxX - minX) + size * 2.4;
    const worldH = (maxY - minY) + size * 2.8;
    cam.scale = Math.max(0.45, Math.min(1.35, cw / worldW, ch / worldH));
    cam.x = (cw - (maxX + minX) * cam.scale) / 2;
    cam.y = (ch - (maxY + minY) * cam.scale) / 2;
  }

  function pathHex(cx, cy, size) {
    const pts = Hex.corners(cx, cy, size);
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
  }

  const motionQ = [];
  let active = null;
  let rafOn = false;
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let hintStamp = "";
  let hintAt = 0;

  function ms(n) { return reduceMotion ? 1 : n; }
  function clamp01(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }
  function easeOut(t) { t = clamp01(t); return 1 - Math.pow(1 - t, 3); }

  function installMotionHooks() {
    const rawMove = Rules.moveUnit;
    const rawAttack = Rules.attack;
    const rawTrain = Rules.train;
    Rules.moveUnit = function (state, unitId, q, r) {
      const unit = state.units.find(function (u) { return u.id === unitId; });
      const path = unit ? Rules.route(state, unit, q, r) : null;
      const res = rawMove.apply(Rules, arguments);
      if (res && res.ok && res.moved && path && path.length > 1) {
        const steps = path.length - 1;
        const slide = ms(Math.max(220, Math.min(420, 180 + steps * 70)));
        motionQ.push({
          kind: "move", id: unitId, path: path, slide: slide,
          dur: res.captured ? slide + ms(80) : slide,
          captured: !!res.captured, cq: q, cr: r
        });
      }
      return res;
    };
    Rules.attack = function (state, unitId, targetId) {
      const unit = state.units.find(function (u) { return u.id === unitId; });
      const target = state.units.find(function (u) { return u.id === targetId; });
      const from = unit ? { q: unit.q, r: unit.r } : null;
      const snap = target ? {
        id: target.id, type: target.type, owner: target.owner,
        q: target.q, r: target.r, hp: target.hp, maxHp: target.maxHp
      } : null;
      const attackerSnap = unit ? {
        id: unit.id, type: unit.type, owner: unit.owner,
        q: unit.q, r: unit.r, hp: unit.hp, maxHp: unit.maxHp
      } : null;
      const res = rawAttack.apply(Rules, arguments);
      if (res && res.ok && from && snap) {
        const after = state.units.find(function (u) { return u.id === unitId; });
        const to = after ? { q: after.q, r: after.r } : { q: from.q, r: from.r };
        const advanced = to.q !== from.q || to.r !== from.r;
        motionQ.push({
          kind: "attack", id: unitId, from: from, to: to, target: snap,
          killed: !!res.killed, attackerDied: !!res.attackerDied,
          attackerSnap: attackerSnap,
          advanced: advanced, captured: !!res.captured,
          cq: snap.q, cr: snap.r,
          dur: ms(420)
        });
      }
      return res;
    };
    Rules.train = function (state, nationId, cq, cr, unitId) {
      const res = rawTrain.apply(Rules, arguments);
      if (res && res.ok && res.unit) {
        motionQ.push({
          kind: "spawn", id: res.unit.id, q: res.unit.q, r: res.unit.r,
          dur: ms(300)
        });
      }
      return res;
    };
  }

  function playHead() {
    if (active && active.wait) return active.wait;
    if (!motionQ.length) return Promise.resolve();
    const m = motionQ.shift();
    m.t0 = performance.now();
    active = m;
    kick();
    m.wait = new Promise(function (resolve) {
      let settled = false;
      function finish() {
        if (settled) return;
        settled = true;
        if (active === m) active = null;
        resolve();
      }
      m.done = finish;
      setTimeout(finish, m.dur + 60);
    });
    return m.wait;
  }

  async function drainMotions() {
    while (motionQ.length || active) await playHead();
  }

  function wantFrames() {
    if (!game) return false;
    const board = document.getElementById("game");
    if (!board || board.classList.contains("hidden")) return false;
    if (active) return true;
    if (selectedId != null) return true;
    if (hintAt && performance.now() - hintAt < 280) return true;
    return false;
  }

  function kick() {
    if (rafOn) return;
    if (!wantFrames() && !motionQ.length) return;
    rafOn = true;
    const frame = function () {
      const now = performance.now();
      if (active && now >= active.t0 + active.dur) {
        const done = active.done;
        active = null;
        if (done) done();
      }
      if (game) draw();
      if (wantFrames()) requestAnimationFrame(frame);
      else rafOn = false;
    };
    requestAnimationFrame(frame);
  }

  function hintAlpha(reach, attacks) {
    let sig = "";
    if (selectedId != null) {
      sig = String(selectedId);
      reach.forEach(function (cost, k) { if (cost) sig += "|" + k; });
      for (let i = 0; i < attacks.length; i++) sig += "|a" + attacks[i].q + "," + attacks[i].r;
    }
    if (sig !== hintStamp) {
      hintStamp = sig;
      hintAt = performance.now();
    }
    if (!sig) return 0;
    return easeOut((performance.now() - hintAt) / ms(240));
  }

  function samplePath(path, t) {
    const pts = [];
    for (let i = 0; i < path.length; i++) pts.push(hexCenter(path[i].q, path[i].r));
    if (pts.length === 1) return pts[0];
    const seg = [];
    let total = 0;
    for (let i = 1; i < pts.length; i++) {
      const len = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y) || 1;
      seg.push(len);
      total += len;
    }
    let dist = clamp01(t) * total;
    for (let i = 1; i < pts.length; i++) {
      if (dist <= seg[i - 1]) {
        const k = dist / seg[i - 1];
        return {
          x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * k,
          y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * k
        };
      }
      dist -= seg[i - 1];
    }
    return pts[pts.length - 1];
  }

  function spawnWaiting(id) {
    for (let i = 0; i < motionQ.length; i++) {
      if (motionQ[i].kind === "spawn" && motionQ[i].id === id) return true;
    }
    return false;
  }

  function poseOf(u, now) {
    const home = hexCenter(u.q, u.r);
    const pose = { x: home.x, y: home.y, alpha: 1, scale: 1 };
    if (!active) return pose;
    if (active.kind === "move" && active.id === u.id) {
      const t = easeOut((now - active.t0) / active.slide);
      const p = samplePath(active.path, t);
      pose.x = p.x; pose.y = p.y;
    } else if (active.kind === "spawn" && active.id === u.id) {
      const t = easeOut((now - active.t0) / active.dur);
      pose.scale = 0.15 + 0.85 * t;
      pose.alpha = Math.min(1, t * 1.4);
    } else if (active.kind === "attack" && active.id === u.id && !active.attackerDied) {
      const t = now - active.t0;
      const lunge = ms(170);
      const a = hexCenter(active.from.q, active.from.r);
      const b = hexCenter(active.target.q, active.target.r);
      if (t < lunge) {
        const k = Math.sin(clamp01(t / lunge) * Math.PI);
        pose.x = a.x + (b.x - a.x) * 0.32 * k;
        pose.y = a.y + (b.y - a.y) * 0.32 * k;
      } else if (active.advanced) {
        const e = easeOut((t - lunge) / ms(230));
        const dest = hexCenter(active.to.q, active.to.r);
        pose.x = a.x + (dest.x - a.x) * e;
        pose.y = a.y + (dest.y - a.y) * e;
      }
    }
    return pose;
  }

  function paintUnit(spec, nat, x, y, size, alpha, scale, hp, maxHp) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.globalAlpha = alpha;
    const plate = unitPath(nat.id, spec.id);
    if (plate && spriteReady(plate)) ctx.drawImage(art[plate], -size * 0.55, -size * 0.72, size * 1.1, size * 1.1);
    else {
      ctx.beginPath();
      ctx.fillStyle = nat.color;
      ctx.arc(0, -size * 0.05, size * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f4efe4";
      ctx.font = "bold " + Math.floor(12 * cam.scale) + "px Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillText(spec.name.slice(0, 1), 0, size * 0.02);
    }
    ctx.restore();
    if (alpha > 0.05 && maxHp) {
      const bw = size * 0.5;
      const ratio = Math.max(0, hp / maxHp);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#2c2a26";
      ctx.fillRect(x - bw / 2, y + size * 0.28, bw, 4);
      ctx.fillStyle = "#7a2e2e";
      ctx.fillRect(x - bw / 2, y + size * 0.28, bw * ratio, 4);
      ctx.restore();
    }
  }

  function drawGhost(snap, x, y, size, alpha) {
    if (!snap || alpha <= 0) return;
    const spec = Rules.UNITS[snap.type];
    const nat = Rules.NATIONS[snap.owner];
    if (!spec || !nat) return;
    paintUnit(spec, nat, x, y, size, alpha, 1, Math.max(0, snap.hp), snap.maxHp);
  }

  function drawAttackFx(now, size) {
    if (!active || active.kind !== "attack") return;
    const t = now - active.t0;
    const flash0 = ms(60);
    const flash1 = ms(250);
    if (t >= flash0 && t <= flash1) {
      const mid = (flash0 + flash1) / 2;
      const k = 1 - Math.abs(t - mid) / (mid - flash0);
      const p = hexCenter(active.target.q, active.target.r);
      ctx.save();
      ctx.globalAlpha = Math.max(0, k) * 0.9;
      ctx.fillStyle = "#f4efe4";
      ctx.beginPath();
      ctx.arc(p.x, p.y, size * (0.22 + 0.28 * k), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#7a2e2e";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size * (0.3 + 0.35 * (1 - k)), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    if (active.killed) {
      const fade = 1 - easeOut(clamp01((t - ms(180)) / ms(240)));
      const p = hexCenter(active.target.q, active.target.r);
      drawGhost(active.target, p.x, p.y, size, fade);
    }
    if (active.attackerDied && active.attackerSnap) {
      const lunge = ms(170);
      const a = hexCenter(active.from.q, active.from.r);
      const b = hexCenter(active.target.q, active.target.r);
      let x = a.x, y = a.y;
      if (t < lunge) {
        const k = Math.sin(clamp01(t / lunge) * Math.PI);
        x = a.x + (b.x - a.x) * 0.32 * k;
        y = a.y + (b.y - a.y) * 0.32 * k;
      }
      const fade = t < lunge ? 1 : 1 - easeOut(clamp01((t - lunge) / ms(220)));
      drawGhost(active.attackerSnap, x, y, size, fade);
    }
  }

  function drawCapturePulse(c, p, size, now) {
    if (!active || !active.captured) return;
    if (c.q !== active.cq || c.r !== active.cr) return;
    const t = clamp01((now - active.t0) / active.dur);
    const local = active.kind === "move" ? clamp01((t - 0.62) / 0.38) : clamp01((t - 0.35) / 0.65);
    if (local <= 0) return;
    ctx.save();
    ctx.globalAlpha = (1 - local) * 0.85;
    ctx.strokeStyle = "#c2b280";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p.x, p.y - size * 0.05, size * (0.28 + local * 0.62), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawFallbackTerrain(terrain, cx, cy, size) {
    const t = Rules.TERRAIN[terrain] || Rules.TERRAIN.plains;
    ctx.fillStyle = t.color;
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = "rgba(44,42,38,0.35)";
    ctx.lineWidth = 1;
    if (terrain === "forest") {
      ctx.fillStyle = "#244028";
      ctx.beginPath(); ctx.arc(cx, cy - size * 0.15, size * 0.28, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx - size * 0.28, cy + size * 0.1, size * 0.22, 0, Math.PI * 2); ctx.fill();
    } else if (terrain === "mountain") {
      ctx.fillStyle = "#d9d3c6";
      ctx.beginPath();
      ctx.moveTo(cx, cy - size * 0.55);
      ctx.lineTo(cx + size * 0.45, cy + size * 0.35);
      ctx.lineTo(cx - size * 0.45, cy + size * 0.35);
      ctx.fill();
    } else if (terrain === "hills") {
      ctx.strokeStyle = "#5c5344";
      ctx.beginPath();
      ctx.arc(cx, cy + size * 0.2, size * 0.35, Math.PI, 0);
      ctx.stroke();
    } else if (terrain === "water") {
      ctx.strokeStyle = "rgba(230,223,208,0.45)";
      ctx.beginPath();
      ctx.moveTo(cx - size * 0.4, cy);
      ctx.quadraticCurveTo(cx, cy - size * 0.2, cx + size * 0.4, cy);
      ctx.stroke();
    } else if (terrain === "trench") {
      ctx.strokeStyle = "#3a3428";
      ctx.strokeRect(cx - size * 0.35, cy - size * 0.08, size * 0.7, size * 0.16);
    } else if (terrain === "desert") {
      ctx.fillStyle = "rgba(90,70,40,0.25)";
      ctx.fillRect(cx - size * 0.3, cy, size * 0.6, size * 0.08);
    } else if (terrain === "swamp") {
      ctx.fillStyle = "#2c4034";
      ctx.fillRect(cx - size * 0.3, cy, size * 0.15, size * 0.28);
      ctx.fillRect(cx + size * 0.05, cy - size * 0.1, size * 0.15, size * 0.28);
    }
    ctx.restore();
  }

  function draw() {
    if (!game) return;
    const now = performance.now();
    const w = canvas.clientWidth || 800;
    const h = canvas.clientHeight || 600;
    ctx.clearRect(0, 0, w, h);
    const size = HEX * cam.scale;
    const reach = selectedReach();
    const attacks = selectedAttacks();
    const keys = Object.keys(game.cells);
    for (let i = 0; i < keys.length; i++) {
      const c = game.cells[keys[i]];
      const p = hexCenter(c.q, c.r);
      pathHex(p.x, p.y, size * 0.98);
      const tname = TERRAIN_PATH[c.terrain] || TERRAIN_PATH.plains;
      if (spriteReady(tname)) {
        ctx.save();
        ctx.clip();
        ctx.drawImage(art[tname], p.x - size, p.y - size, size * 2, size * 2);
        ctx.restore();
      } else {
        drawFallbackTerrain(c.terrain, p.x, p.y, size);
      }
      ctx.strokeStyle = "rgba(44,42,38,0.45)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    for (let i = 0; i < keys.length; i++) {
      const c = game.cells[keys[i]];
      if (!c.city) continue;
      const p = hexCenter(c.q, c.r);
      const mark = c.city.capital ? SETTLEMENT_PATH.capital : SETTLEMENT_PATH.city;
      if (spriteReady(mark)) ctx.drawImage(art[mark], p.x - size * 0.45, p.y - size * 0.7, size * 0.9, size * 0.9);
      else {
        ctx.fillStyle = c.city.capital ? "#c2b280" : "#efe8d8";
        ctx.strokeStyle = "#2c2a26";
        ctx.fillRect(p.x - size * 0.18, p.y - size * 0.42, size * 0.36, size * 0.36);
        ctx.strokeRect(p.x - size * 0.18, p.y - size * 0.42, size * 0.36, size * 0.36);
      }
      if (c.city.owner && Rules.NATIONS[c.city.owner]) {
        const fl = Rules.NATIONS[c.city.owner].flag;
        if (spriteReady(fl)) ctx.drawImage(art[fl], p.x - size * 0.16, p.y - size * 0.16, size * 0.32, size * 0.32);
        else {
          ctx.fillStyle = Rules.NATIONS[c.city.owner].color;
          ctx.fillRect(p.x - size * 0.14, p.y - size * 0.14, size * 0.28, size * 0.28);
        }
      }
      if (cam.scale >= 0.62) {
        ctx.fillStyle = "#1c1a16";
        ctx.font = Math.max(10, Math.floor(11 * cam.scale)) + "px Georgia, serif";
        ctx.textAlign = "center";
        ctx.fillText(c.city.name, p.x, p.y + size * 0.42);
      }
      drawCapturePulse(c, p, size, now);
    }
    for (let i = 0; i < game.units.length; i++) {
      const u = game.units[i];
      if (spawnWaiting(u.id)) continue;
      const spec = Rules.UNITS[u.type];
      const nat = Rules.NATIONS[u.owner];
      const pose = poseOf(u, now);
      paintUnit(spec, nat, pose.x, pose.y, size, pose.alpha, pose.scale, u.hp, u.maxHp);
    }
    drawAttackFx(now, size);
    const fade = hintAlpha(reach, attacks);
    const sel = selectedUnit();
    if (sel) {
      const pose = poseOf(sel, now);
      const pulse = 0.62 + 0.38 * Math.sin(now / 190);
      ctx.save();
      ctx.globalAlpha = pulse;
      drawOverlay("overlay_select", pose.x, pose.y, size, "rgba(194,178,128,0.45)");
      ctx.strokeStyle = "rgba(194,178,128," + (0.35 + 0.4 * pulse) + ")";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pose.x, pose.y, size * (0.42 + 0.08 * pulse), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    ctx.save();
    ctx.globalAlpha = fade;
    reach.forEach(function (cost, k) {
      if (cost === 0) return;
      const h = Hex.parse(k);
      const p = hexCenter(h.q, h.r);
      drawOverlay("overlay_move", p.x, p.y, size, "rgba(90,122,70,0.35)");
    });
    for (let i = 0; i < attacks.length; i++) {
      const p = hexCenter(attacks[i].q, attacks[i].r);
      drawOverlay("overlay_attack", p.x, p.y, size, "rgba(122,46,46,0.4)");
    }
    ctx.restore();
    if (wantFrames()) kick();
  }

  function drawOverlay(name, x, y, size, fallback) {
    if (spriteReady(name)) {
      ctx.drawImage(art[name], x - size * 0.7, y - size * 0.7, size * 1.4, size * 1.4);
    } else {
      ctx.beginPath();
      ctx.fillStyle = fallback;
      ctx.arc(x, y, size * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function selectedUnit() {
    if (!game || selectedId == null) return null;
    return game.units.find(function (u) { return u.id === selectedId; }) || null;
  }

  function myTurn() {
    const p = current();
    return !!(p && p.human && !busy && !game.winner);
  }

  function selectedReach() {
    const u = selectedUnit();
    if (!u || !myTurn() || u.owner !== current().id || u.hasAttacked) return new Map();
    return Rules.reachable(game, u);
  }

  function selectedAttacks() {
    const u = selectedUnit();
    if (!u || !myTurn() || u.owner !== current().id) return [];
    return Rules.legalAttacks(game, u);
  }

  function flagHTML(nationId) {
    if (!nationId || !Rules.NATIONS[nationId]) return "";
    const n = Rules.NATIONS[nationId];
    return '<img class="tinyflag" alt="" data-color="' + n.color + '" src="art/' + n.flag + '.png">';
  }

  function hookFlags(root) {
    const scope = root || document;
    const imgs = scope.querySelectorAll("img.tinyflag");
    for (let i = 0; i < imgs.length; i++) {
      imgs[i].addEventListener("error", function () {
        const span = document.createElement("span");
        span.className = "flagfb";
        span.style.background = imgs[i].getAttribute("data-color") || "#666";
        imgs[i].replaceWith(span);
      });
    }
  }

  function renderSide() {
    const p = current();
    const turn = document.getElementById("turnline");
    const supply = document.getElementById("supplyline");
    if (!p) return;
    const nat = Rules.NATIONS[p.id];
    turn.innerHTML = flagHTML(p.id) + " " + nat.name + (p.human ? "" : " (staff)") + " · round " + game.turnNumber;
    const pip = spriteReady("icon_star")
      ? '<img src="art/icon_star.png" alt="">'
      : '<span style="color:#8a7044">●</span>';
    supply.innerHTML = pip + " Supply " + p.supply;
    hookFlags(document.getElementById("side"));
    const box = document.getElementById("panels");
    let html = "";
    html += unitCard();
    html += cityCard();
    html += techCard();
    html += '<section class="card"><h2>Dispatch</h2><div id="log">' +
      game.log.slice(-12).map(function (l) { return "<div>" + escapeHtml(l) + "</div>"; }).join("") +
      "</div></section>";
    box.innerHTML = html;
    hookFlags(box);
    bindPanel();
    document.getElementById("endturn").disabled = busy || !p.human || !!game.winner;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>]/g, function (c) {
      return c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;";
    });
  }

  function unitCard() {
    const u = selectedUnit() || (focus && Rules.unitAt(game, focus.q, focus.r));
    if (!u) return '<section class="card"><h2>Unit</h2><p class="stats">Select a hex.</p></section>';
    const spec = Rules.UNITS[u.type];
    const nat = Rules.NATIONS[u.owner];
    const atk = Rules.attackOf(game, u);
    const def = Rules.defenseOf(game, u);
    const plate = unitPath(u.owner, u.type);
    const thumb = plate && spriteReady(plate) ? '<img class="unitplate" alt="" src="' + art[plate].src + '">' : "";
    return '<section class="card"><h2>Unit</h2>' + thumb +
      '<p class="stats"><strong>' + spec.name + '</strong> · ' + nat.name + '<br>' +
      'HP ' + u.hp + '/' + u.maxHp + ' · Move ' + u.move + '/' + u.maxMove + '<br>' +
      'Attack ' + atk + ' · Defense ' + def + ' · Range ' + spec.range + '</p>' +
      '<div class="hpbar"><span style="width:' + Math.max(0, (u.hp / u.maxHp) * 100) + '%"></span></div>' +
      '</section>';
  }

  function cityCard() {
    const cell = focus ? game.cells[Rules.key(focus.q, focus.r)] : null;
    if (!cell || !cell.city) return '<section class="card"><h2>City</h2><p class="stats">No city selected. Capitals yield 3 Supply, other cities 2.</p></section>';
    const city = cell.city;
    const owner = city.owner ? Rules.NATIONS[city.owner].name : "Neutral";
    let html = '<section class="card"><h2>City</h2><p class="stats">' + flagHTML(city.owner) +
      ' <strong>' + escapeHtml(city.name) + '</strong>' + (city.capital ? " · capital" : "") +
      '<br>' + owner + ' · yields ' + (city.capital ? "3" : "2") + ' Supply</p>';
    const me = current();
    if (me && city.owner === me.id && me.human) {
      html += '<div class="btns">';
      const list = Rules.catalog(me.id);
      for (let i = 0; i < list.length; i++) {
        const id = list[i];
        const spec = Rules.UNITS[id];
        const unlocked = Rules.unitUnlocked(me, id);
        const cost = Rules.unitCost(me, id);
        const check = Rules.canTrain(game, me.id, cell.q, cell.r, id);
        const why = !unlocked ? "locked" : (!check.ok ? check.reason : "");
        html += '<button type="button" data-train="' + id + '"' + (check.ok ? "" : " disabled") + '>' +
          spec.name + ' — ' + cost + ' Supply' + (why ? ' <small>(' + escapeHtml(why) + ')</small>' : '') +
          '</button>';
      }
      html += '</div>';
    }
    html += '</section>';
    return html;
  }

  function techCard() {
    const me = current();
    if (!me) return "";
    let html = '<section class="card"><h2>Research</h2><div class="btns">';
    const list = Rules.techChoices(me.id);
    for (let i = 0; i < list.length; i++) {
      const tech = list[i];
      const owned = Rules.hasTech(me, tech.id);
      const check = Rules.canResearch(game, me.id, tech.id);
      let extra = "";
      if (owned) extra = "owned";
      else if (!check.ok) extra = check.reason;
      html += '<button type="button" data-tech="' + tech.id + '"' + (check.ok && me.human ? "" : " disabled") +
        ' title="' + escapeHtml(tech.desc) + '">' +
        tech.name + ' — ' + tech.cost + ' Supply' + (extra ? ' <small>(' + escapeHtml(extra) + ')</small>' : '') +
        '</button>';
    }
    html += '</div></section>';
    return html;
  }

  function bindPanel() {
    const buttons = document.querySelectorAll("#panels button");
    for (let i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener("click", onPanelClick);
    }
  }

  function onPanelClick(ev) {
    const btn = ev.currentTarget;
    if (!myTurn()) return;
    const me = current();
    if (btn.dataset.train) {
      if (!focus) return;
      busy = true;
      const res = Rules.train(game, me.id, focus.q, focus.r, btn.dataset.train);
      if (!res.ok) { busy = false; note(res.reason); return; }
      const cell = game.cells[Rules.key(focus.q, focus.r)];
      Rules.pushLog(game, Rules.NATIONS[me.id].name + " trains " + Rules.UNITS[btn.dataset.train].name.toLowerCase() + " in " + cell.city.name);
      note("");
      renderSide();
      drainMotions().then(function () { busy = false; afterAction(); });
    } else if (btn.dataset.tech) {
      const res = Rules.research(game, me.id, btn.dataset.tech);
      if (!res.ok) { note(res.reason); return; }
      Rules.pushLog(game, Rules.NATIONS[me.id].name + " researches " + Rules.TECHS[btn.dataset.tech].name);
      note("");
      afterAction();
    }
  }

  function afterAction() {
    if (game.winner) { showVictory(); return; }
    const u = selectedUnit();
    if (u && u.owner !== current().id) selectedId = null;
    renderSide();
    draw();
  }

  function screenHex(ev) {
    const rect = canvas.getBoundingClientRect();
    const sx = ev.clientX - rect.left;
    const sy = ev.clientY - rect.top;
    const wx = (sx - cam.x) / cam.scale;
    const wy = (sy - cam.y) / cam.scale;
    return Hex.fromPixel(wx, wy, HEX);
  }

  function onMapClick(ev) {
    if (!game || busy) return;
    const h = screenHex(ev);
    const cell = game.cells[Rules.key(h.q, h.r)];
    if (!cell) { note("Off the map."); return; }
    focus = { q: h.q, r: h.r };
    const me = current();
    const reach = selectedReach();
    const attacks = selectedAttacks();
    const k = Rules.key(h.q, h.r);
    if (myTurn() && selectedUnit() && attacks.some(function (t) { return t.q === h.q && t.r === h.r; })) {
      const target = Rules.unitAt(game, h.q, h.r);
      busy = true;
      const res = Rules.attack(game, selectedUnit().id, target.id);
      if (!res.ok) { busy = false; note(res.reason); return; }
      note("");
      const who = Rules.NATIONS[me.id].name;
      Rules.pushLog(game, who + " attacks (" + res.dmg + " damage" + (res.killed ? ", destroyed" : "") + (res.attackerDied ? ", lost the unit" : "") + ")");
      if (res.captured) {
        const city = game.cells[k].city;
        if (city) Rules.pushLog(game, who + " captures " + city.name);
      }
      if (res.attackerDied) selectedId = null;
      renderSide();
      drainMotions().then(function () { busy = false; afterAction(); });
      return;
    }
    if (myTurn() && selectedUnit() && reach.has(k) && reach.get(k) > 0) {
      busy = true;
      const res = Rules.moveUnit(game, selectedUnit().id, h.q, h.r);
      if (!res.ok) { busy = false; note(res.reason); return; }
      note("");
      if (res.captured) {
        const city = cell.city;
        Rules.pushLog(game, Rules.NATIONS[me.id].name + " captures " + (city ? city.name : "the city"));
      }
      renderSide();
      drainMotions().then(function () { busy = false; afterAction(); });
      return;
    }
    const unit = Rules.unitAt(game, h.q, h.r);
    if (unit && me && unit.owner === me.id && myTurn()) selectedId = unit.id;
    else if (unit) selectedId = null;
    else selectedId = null;
    renderSide();
    draw();
    kick();
  }

  async function playUntilHuman() {
    while (game && !game.winner) {
      const p = Rules.current(game);
      if (!p) break;
      if (p.human) {
        if (hotseat && endedBy && p.id !== endedBy) {
          showPass(p);
          return;
        }
        renderSide();
        draw();
        return;
      }
      await runAi();
      if (game.winner) { showVictory(); return; }
      Rules.endTurn(game);
    }
    if (game && game.winner) showVictory();
    else { renderSide(); draw(); }
  }

  async function runAi() {
    busy = true;
    renderSide();
    try {
      for (const line of FrontAI.steps(game)) {
        if (motionQ.length) await playHead();
        Rules.pushLog(game, line);
        renderSide();
        draw();
        if (!motionQ.length && !active) await sleep(90);
        if (game.winner) break;
      }
      while (motionQ.length || active) await playHead();
    } catch (err) {
      console.error(err);
      Rules.pushLog(game, "The staff missed its orders. The turn ends.");
    }
    busy = false;
  }

  function showPass(p) {
    const nat = Rules.NATIONS[p.id];
    document.getElementById("passtext").innerHTML = "Next command: " + flagHTML(p.id) + " <strong>" + nat.name + "</strong>. Hand over the desk, then begin the turn.";
    document.getElementById("pass").classList.remove("hidden");
    renderSide();
    draw();
  }

  function showVictory() {
    const id = game.winner;
    const nat = id ? Rules.NATIONS[id] : null;
    const text = document.getElementById("victorytext");
    if (nat) text.innerHTML = flagHTML(id) + " <strong>" + nat.name + "</strong> holds the field.";
    else text.textContent = "The front falls quiet. No nation remains.";
    document.getElementById("victory").classList.remove("hidden");
    document.getElementById("pass").classList.add("hidden");
    renderSide();
    draw();
  }

  function startGame() {
    const map = Maps.get(mapId);
    const humans = hotseat ? [pick1, pick2] : [pick1];
    if (!pick1 || humans.indexOf(null) !== -1) { document.getElementById("setupnote").textContent = "Choose a nation."; return; }
    if (hotseat && pick1 === pick2) { document.getElementById("setupnote").textContent = "The two commanders must differ."; return; }
    try {
      game = Rules.createGame(map, humans);
    } catch (err) {
      console.error(err);
      document.getElementById("setupnote").textContent = "This map could not be opened.";
      return;
    }
    selectedId = null;
    focus = null;
    endedBy = null;
    busy = false;
    document.getElementById("setup").classList.add("hidden");
    document.getElementById("game").classList.remove("hidden");
    document.getElementById("victory").classList.add("hidden");
    document.getElementById("pass").classList.add("hidden");
    const p = current();
    Rules.pushLog(game, Rules.NATIONS[p.id].name + " opens the campaign.");
    requestAnimationFrame(function () {
      resize();
      fitCamera();
      draw();
      if (p.human) renderSide();
      else playUntilHuman();
    });
  }

  function toSetup() {
    busy = false;
    game = null;
    document.getElementById("game").classList.add("hidden");
    document.getElementById("victory").classList.add("hidden");
    document.getElementById("pass").classList.add("hidden");
    document.getElementById("help").classList.add("hidden");
    document.getElementById("setup").classList.remove("hidden");
  }

  function renderSetup() {
    const maps = Maps.list();
    const box = document.getElementById("maplist");
    box.innerHTML = maps.map(function (m) {
      return '<button type="button" class="mapbtn' + (m.id === mapId ? " on" : "") + '" data-map="' + m.id + '"><strong>' +
        m.name + '</strong><span>' + m.nations.length + ' nations</span></button>';
    }).join("");
    const map = Maps.get(mapId);
    if (!pick1 || map.nations.indexOf(pick1) === -1) pick1 = map.nations[0];
    if (!pick2 || map.nations.indexOf(pick2) === -1 || pick2 === pick1) {
      pick2 = map.nations.find(function (id) { return id !== pick1; }) || map.nations[0];
    }
    document.getElementById("nats").innerHTML = nationButtons(map.nations, pick1, "1");
    document.getElementById("nats2").innerHTML = nationButtons(map.nations, pick2, "2");
    document.getElementById("p2label").classList.toggle("hidden", !hotseat);
    document.getElementById("nats2").classList.toggle("hidden", !hotseat);
    document.getElementById("mode-solo").classList.toggle("on", !hotseat);
    document.getElementById("mode-hot").classList.toggle("on", hotseat);
    const desc = maps.find(function (m) { return m.id === mapId; });
    document.getElementById("setupnote").textContent = desc ? desc.desc : "";
    bindSetup();
  }

  function nationButtons(ids, selected, slot) {
    return ids.map(function (id) {
      const n = Rules.NATIONS[id];
      const badge = BADGE_PATH[id];
      return '<button type="button" class="natbtn' + (id === selected ? " on" : "") + '" data-slot="' + slot + '" data-nat="' + id + '">' +
        '<img class="natbadge" alt="" src="' + badge + '"><strong>' + n.name + '</strong></button>';
    }).join("");
  }

  function bindSetup() {
    document.querySelectorAll("[data-map]").forEach(function (b) {
      b.onclick = function () { mapId = b.dataset.map; renderSetup(); };
    });
    document.querySelectorAll("[data-nat]").forEach(function (b) {
      b.onclick = function () {
        if (b.dataset.slot === "1") pick1 = b.dataset.nat;
        else pick2 = b.dataset.nat;
        renderSetup();
      };
    });
  }

  function bindSplash() {
    const splash = document.getElementById("splash");
    if (!splash) return;
    let settled = false;
    function settle() {
      if (settled) return;
      settled = true;
      splash.classList.add("is-settled");
      const hint = document.getElementById("splashSkip");
      if (hint) hint.textContent = "";
    }
    const badges = document.getElementById("splashBadges");
    const minis = document.getElementById("splashMinis");
    ["britain", "france", "belgium", "germany", "austria", "russia", "serbia", "ottoman", "italy", "usa"].forEach(function (id, i) {
      const img = document.createElement("img");
      img.alt = "";
      img.dataset.path = BADGE_PATH[id];
      img.src = BADGE_PATH[id];
      img.style.animationDelay = (i * 0.04) + "s";
      badges.appendChild(img);
    });
    ["art/units/gb-infantry.png", "art/units/fr-cavalry.png", "art/units/de-artillery.png", "art/units/gb-unique.png", "art/units/rs-balloon.png", "art/units/ot-battleship.png"].forEach(function (path, i) {
      const img = document.createElement("img");
      img.alt = "";
      img.dataset.path = path;
      img.src = path;
      img.style.animationDelay = (0.08 + i * 0.06) + "s";
      minis.appendChild(img);
    });
    loadArt().then(function () {
      if (!badges || !minis) return;
      const bimgs = badges.querySelectorAll("img");
      for (let i = 0; i < bimgs.length; i++) {
        const src = art[bimgs[i].dataset.path];
        if (src && src.src) bimgs[i].src = src.src;
      }
      const mimgs = minis.querySelectorAll("img");
      for (let i = 0; i < mimgs.length; i++) {
        const src = art[mimgs[i].dataset.path];
        if (src && src.src) mimgs[i].src = src.src;
      }
    });
    splash.addEventListener("click", function (e) {
      if (e.target.closest("#btnBegin")) return;
      if (!settled) settle();
    });
    document.getElementById("btnBegin").onclick = function (e) {
      e.stopPropagation();
      settle();
      splash.classList.add("is-leaving");
      const setup = document.getElementById("setup");
      setup.classList.remove("hidden");
      setup.classList.add("is-entering");
      setTimeout(function () { splash.classList.add("hidden"); }, 650);
    };
    setTimeout(settle, 1100);
  }

  function wire() {
    installMotionHooks();
    bindSplash();
    document.getElementById("mode-solo").onclick = function () { hotseat = false; renderSetup(); };
    document.getElementById("mode-hot").onclick = function () { hotseat = true; renderSetup(); };
    document.getElementById("startbtn").onclick = startGame;
    document.getElementById("endturn").onclick = function () {
      if (!game || busy || game.winner) return;
      const p = current();
      if (!p || !p.human) return;
      endedBy = p.id;
      Rules.pushLog(game, Rules.NATIONS[p.id].name + " ends the turn.");
      Rules.endTurn(game);
      if (game.winner) { showVictory(); return; }
      playUntilHuman();
    };
    document.getElementById("helpbtn").onclick = function () { document.getElementById("help").classList.remove("hidden"); };
    document.getElementById("helpclose").onclick = function () { document.getElementById("help").classList.add("hidden"); };
    document.getElementById("resign").onclick = toSetup;
    document.getElementById("againbtn").onclick = toSetup;
    document.getElementById("passbtn").onclick = function () {
      document.getElementById("pass").classList.add("hidden");
      endedBy = current() ? current().id : endedBy;
      renderSide();
      draw();
    };
    window.addEventListener("resize", function () { if (game) resize(); });
    canvas.addEventListener("pointerdown", function (ev) {
      drag = { x: ev.clientX, y: ev.clientY, camx: cam.x, camy: cam.y, moved: false };
    });
    canvas.addEventListener("pointermove", function (ev) {
      if (!drag) return;
      const dx = ev.clientX - drag.x;
      const dy = ev.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 5) drag.moved = true;
      if (drag.moved) {
        cam.x = drag.camx + dx;
        cam.y = drag.camy + dy;
        draw();
      }
    });
    canvas.addEventListener("pointerup", function (ev) {
      if (drag && !drag.moved) onMapClick(ev);
      drag = null;
    });
    canvas.addEventListener("wheel", function (ev) {
      if (!game) return;
      ev.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const sx = ev.clientX - rect.left;
      const sy = ev.clientY - rect.top;
      const wx = (sx - cam.x) / cam.scale;
      const wy = (sy - cam.y) / cam.scale;
      const factor = ev.deltaY > 0 ? 0.9 : 1.1;
      cam.scale = Math.max(0.35, Math.min(2.1, cam.scale * factor));
      cam.x = sx - wx * cam.scale;
      cam.y = sy - wy * cam.scale;
      draw();
    }, { passive: false });
    window.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape") {
        document.getElementById("help").classList.add("hidden");
      }
    });
    const endIcon = document.getElementById("endicon");
    endIcon.onerror = function () { endIcon.remove(); };
  }

  wire();
  renderSetup();
})();
