/* Rendering and menus for Fronts, 1914 */
window.UI = (function () {
  let canvas, ctx;
  let hexSize = 36;
  let camX = 0, camY = 0;
  let hover = null;
  let showTech = false;
  let animId = null;

  function $(id) { return document.getElementById(id); }

  function init() {
    canvas = $("gameCanvas");
    ctx = canvas.getContext("2d");
    resize();
    window.addEventListener("resize", resize);
    canvas.addEventListener("click", onClick);
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("contextmenu", e => e.preventDefault());
    window.addEventListener("keydown", onKey);

    $("btnEndTurn").onclick = () => {
      const p = Game.activePlayer();
      if (p && p.isAI) return;
      Game.endTurn();
      afterTurn();
    };
    $("btnTech").onclick = () => { showTech = !showTech; renderTechPanel(); };
    $("btnMenu").onclick = () => showMenu();
    $("techClose").onclick = () => { showTech = false; $("techPanel").classList.add("hidden"); };

    bindMenu();
    showMenu();
    loop();
  }

  function resize() {
    const wrap = $("canvasWrap");
    canvas.width = wrap.clientWidth;
    canvas.height = wrap.clientHeight;
  }

  function bindMenu() {
    const maps = Maps.list();
    const mapSel = $("mapSelect");
    mapSel.innerHTML = "";
    maps.forEach(m => {
      const o = document.createElement("option");
      o.value = m.id; o.textContent = m.name;
      mapSel.appendChild(o);
    });
    mapSel.onchange = fillNations;
    $("modeSelect").onchange = fillNations;
    fillNations();
    $("btnStart").onclick = startGame;
  }

  function fillNations() {
    const mapId = $("mapSelect").value;
    const info = Maps.list().find(m => m.id === mapId);
    $("mapDesc").textContent = info ? info.desc : "";
    const natSel = $("nationSelect");
    const nat2 = $("nationSelect2");
    natSel.innerHTML = "";
    if (nat2) nat2.innerHTML = "";
    (info ? info.nations : []).forEach(id => {
      const n = GameData.NATIONS[id];
      const o = document.createElement("option");
      o.value = id;
      o.textContent = n.name;
      natSel.appendChild(o);
      if (nat2) {
        const o2 = document.createElement("option");
        o2.value = id;
        o2.textContent = n.name;
        nat2.appendChild(o2);
      }
    });
    if (nat2 && nat2.options.length > 1) nat2.selectedIndex = 1;
    const hot = $("modeSelect").value === "hotseat";
    const p2 = $("p2Field");
    if (p2) p2.classList.toggle("hidden", !hot);
    updateNationPreview();
    natSel.onchange = updateNationPreview;
  }

  function updateNationPreview() {
    const id = $("nationSelect").value;
    const n = GameData.NATIONS[id];
    if (!n) { $("nationPreview").innerHTML = ""; return; }
    const flag = Art.get("flag_" + id);
    let html = '<div class="nat-prev">';
    if (flag) html += '<img src="' + flag.src + '" width="48" height="48"/>';
    html += "<div><strong>" + n.name + "</strong><br/>" + n.ability;
    html += "<br/><em>Unique: " + GameData.UNITS[n.uniqueUnit].name + "</em></div></div>";
    $("nationPreview").innerHTML = html;
  }

  function startGame() {
    const mapId = $("mapSelect").value;
    const human = $("nationSelect").value;
    const mode = $("modeSelect").value;
    const info = Maps.list().find(m => m.id === mapId);
    let nationIds;
    if (mode === "hotseat") {
      const p2 = $("nationSelect2").value;
      if (!p2 || p2 === human) { alert("Pick two different nations for hotseat."); return; }
      nationIds = [human, p2];
    } else {
      // AI: human + all others on map (cap at 4 opponents for pace)
      const others = info.nations.filter(n => n !== human).slice(0, 4);
      nationIds = [human].concat(others);
    }
    Game.create(mapId, nationIds, mode === "hotseat" ? "hotseat" : "ai");
    centerCamera();
    $("menu").classList.add("hidden");
    $("hud").classList.remove("hidden");
    $("endScreen").classList.add("hidden");
    showTech = false;
    $("techPanel").classList.add("hidden");
    updateHud();
  }

  function showMenu() {
    $("menu").classList.remove("hidden");
    $("hud").classList.add("hidden");
    $("endScreen").classList.add("hidden");
  }

  function centerCamera() {
    const st = Game.get();
    if (!st) return;
    const p = st.players[0];
    let cq = st.w / 2, cr = st.h / 2;
    for (const c of Object.values(st.cells)) {
      if (c.city && c.city.capital && c.city.nation === p.id) {
        cq = c.q; cr = c.r; break;
      }
    }
    const pt = Hex.toPixel(cq, cr, hexSize);
    camX = canvas.width / 2 - pt.x;
    camY = canvas.height / 2 - pt.y;
  }

  function onClick(e) {
    const st = Game.get();
    if (!st || st.phase !== "play") return;
    if (st.players[st.active].isAI) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - camX;
    const y = e.clientY - rect.top - camY;
    const h = Hex.fromPixel(x, y, hexSize);
    Game.selectHex(h.q, h.r);
    updateHud();
    // If clicked own city, show build panel
    const c = Game.cell(h.q, h.r);
    const p = Game.activePlayer();
    if (c && c.city && c.city.nation === p.id && !Game.unitAt(h.q, h.r)) {
      showBuildPanel(h.q, h.r);
    } else {
      $("buildPanel").classList.add("hidden");
    }
  }

  function onMove(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - camX;
    const y = e.clientY - rect.top - camY;
    hover = Hex.fromPixel(x, y, hexSize);
  }

  function onKey(e) {
    const st = Game.get();
    if (!st || $("menu").classList.contains("hidden") === false) return;
    const step = hexSize * 1.5;
    if (e.key === "ArrowLeft" || e.key === "a") camX += step;
    if (e.key === "ArrowRight" || e.key === "d") camX -= step;
    if (e.key === "ArrowUp" || e.key === "w") camY += step;
    if (e.key === "ArrowDown" || e.key === "s") camY -= step;
    if (e.key === "Enter" || e.key === "e") {
      const p = Game.activePlayer();
      if (p && !p.isAI) { Game.endTurn(); afterTurn(); }
    }
    if (e.key === "t") { showTech = !showTech; renderTechPanel(); }
    if (e.key === "Escape") { showTech = false; $("techPanel").classList.add("hidden"); $("buildPanel").classList.add("hidden"); }
  }

  function showBuildPanel(q, r) {
    const p = Game.activePlayer();
    const box = $("buildPanel");
    const avail = GameData.availableUnits(p.id, p.techs);
    let html = "<h3>Recruit</h3>";
    avail.forEach(id => {
      const u = GameData.UNITS[id];
      const cost = GameData.unitCost(p.id, id, p.techs);
      const dis = p.stars < cost ? "disabled" : "";
      html += '<button class="build-btn" data-u="' + id + '" ' + dis + ">" + u.name + " (" + cost + "★) MVP" + u.attack + "/" + u.defense + " Mov" + u.move + "</button>";
    });
    // Fix label - I accidentally wrote MVP - change to Atk
    html = html.replace(/MVP/g, " Atk");
    box.innerHTML = html;
    box.classList.remove("hidden");
    box.querySelectorAll(".build-btn").forEach(btn => {
      btn.onclick = () => {
        Game.produce(q, r, btn.getAttribute("data-u"));
        box.classList.add("hidden");
        updateHud();
      };
    });
  }

  function renderTechPanel() {
    const panel = $("techPanel");
    if (!showTech) { panel.classList.add("hidden"); return; }
    const p = Game.activePlayer();
    if (!p) return;
    let html = "<h2>Research <button id='techClose2'>×</button></h2>";
    html += "<p class='muted'>Stars: " + p.stars + " ★</p>";
    GameData.BRANCHES.forEach(br => {
      html += "<div class='tech-branch'><h3>" + br + "</h3><div class='tech-row'>";
      Object.values(GameData.TECHS).filter(t => t.branch === br).forEach(t => {
        const have = p.techs.has(t.id);
        const locked = t.req && !p.techs.has(t.req);
        const cost = GameData.techCost(p.id, t.id);
        let cls = "tech-node";
        if (have) cls += " have";
        else if (locked) cls += " locked";
        html += '<div class="' + cls + '" data-tech="' + t.id + '"><strong>' + t.name + "</strong>";
        html += "<br/>" + (have ? "Researched" : cost + "★");
        html += "<br/><span class='tdesc'>" + t.desc + "</span></div>";
      });
      html += "</div></div>";
    });
    panel.innerHTML = html;
    panel.classList.remove("hidden");
    const close = $("techClose2");
    if (close) close.onclick = () => { showTech = false; panel.classList.add("hidden"); };
    panel.querySelectorAll(".tech-node:not(.have):not(.locked)").forEach(node => {
      node.onclick = () => {
        if (p.isAI) return;
        Game.research(node.getAttribute("data-tech"));
        renderTechPanel();
        updateHud();
      };
    });
  }

  function afterTurn() {
    updateHud();
    const st = Game.get();
    if (st.phase === "won" || st.phase === "lost") {
      showEnd(st.phase === "won");
      return;
    }
    const p = Game.activePlayer();
    if (p.isAI) {
      $("aiBanner").classList.remove("hidden");
      $("aiBanner").textContent = p.name + " is planning…";
      AI.takeTurn(() => {
        $("aiBanner").classList.add("hidden");
        updateHud();
        const st2 = Game.get();
        if (st2.phase === "won" || st2.phase === "lost") showEnd(st2.phase === "won");
        else if (Game.activePlayer().isAI) afterTurn(); // chain AI
      });
    }
  }

  function showEnd(won) {
    const es = $("endScreen");
    es.classList.remove("hidden");
    $("endTitle").textContent = won ? "Victory" : "Defeat";
    $("endMsg").textContent = won
      ? "You control the decisive capitals. The war, for now, is won."
      : "Your last cities have fallen. The front collapses.";
    $("btnAgain").onclick = showMenu;
  }

  function updateHud() {
    const st = Game.get();
    if (!st) return;
    const p = Game.activePlayer();
    $("hudNation").textContent = p.name;
    $("hudNation").style.color = p.color;
    $("hudStars").textContent = p.stars + " ★";
    $("hudTurn").textContent = "Turn " + (st.turn + 1);
    $("hudMode").textContent = p.isAI ? "(AI)" : (st.mode === "hotseat" ? "(Hotseat)" : "(You)");

    // Unit card
    const card = $("unitCard");
    if (st.selected) {
      const u = st.units.find(x => x.id === st.selected);
      if (u) {
        const def = GameData.UNITS[u.type];
        const img = Art.get(def.sprite);
        card.classList.remove("hidden");
        card.innerHTML = (img ? '<img src="' + img.src + '" width="64" height="64"/>' : "")
          + "<div><strong>" + def.name + "</strong><br/>"
          + "HP " + u.hp + "/" + u.maxHp
          + " · Atk " + def.attack + " · Def " + def.defense + " · Mov " + def.move
          + "<br/>" + (u.moved ? "Moved" : "Can move") + " · " + (u.attacked ? "Attacked" : "Can attack")
          + (u.veteran ? " · Veteran" : "")
          + "</div>";
      }
    } else {
      card.classList.add("hidden");
    }

    // Log
    $("logBox").innerHTML = st.log.slice(0, 8).map(l => "<div>" + l + "</div>").join("");

    if (st.phase === "won" || st.phase === "lost") showEnd(st.phase === "won");
  }

  function loop() {
    draw();
    animId = requestAnimationFrame(loop);
  }

  function draw() {
    const st = Game.get();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // parchment background
    ctx.fillStyle = "#1a1e16";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!st || !$("menu").classList.contains("hidden")) {
      // idle pattern
      return;
    }

    ctx.save();
    ctx.translate(camX, camY);

    // Terrain
    for (const c of Object.values(st.cells)) {
      drawHex(c);
    }
    // Hints
    for (const h of st.moveHints) drawOverlay(h.q, h.r, "overlay_move");
    for (const h of st.attackHints) drawOverlay(h.q, h.r, "overlay_attack");
    if (st.selected) {
      const u = st.units.find(x => x.id === st.selected);
      if (u) drawOverlay(u.q, u.r, "overlay_select");
    }
    if (hover && st.cells[Hex.key(hover.q, hover.r)]) {
      const pt = Hex.toPixel(hover.q, hover.r, hexSize);
      ctx.beginPath();
      Hex.corners(pt.x, pt.y, hexSize - 1).forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
      ctx.closePath();
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    // Cities
    for (const c of Object.values(st.cells)) {
      if (c.city) drawCity(c);
    }
    // Units
    for (const u of st.units) {
      if (u.hp > 0) drawUnit(u);
    }

    ctx.restore();
  }

  function drawHex(c) {
    const pt = Hex.toPixel(c.q, c.r, hexSize);
    const img = Art.get("terrain_" + c.terrain);
    if (img) {
      ctx.drawImage(img, pt.x - hexSize, pt.y - hexSize, hexSize * 2, hexSize * 2);
    } else {
      const col = GameData.TERRAIN[c.terrain].color;
      ctx.beginPath();
      Hex.corners(pt.x, pt.y, hexSize - 1).forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
      ctx.closePath();
      ctx.fillStyle = col;
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.25)";
      ctx.stroke();
    }
  }

  function drawOverlay(q, r, name) {
    const pt = Hex.toPixel(q, r, hexSize);
    const img = Art.get(name);
    if (img) ctx.drawImage(img, pt.x - hexSize, pt.y - hexSize, hexSize * 2, hexSize * 2);
  }

  function drawCity(c) {
    const pt = Hex.toPixel(c.q, c.r, hexSize);
    const img = Art.get(c.city.capital ? "capital" : "city");
    if (img) ctx.drawImage(img, pt.x - 22, pt.y - 28, 44, 44);
    // Flag / owner color
    if (c.city.nation) {
      const flag = Art.get("flag_" + c.city.nation);
      if (flag) ctx.drawImage(flag, pt.x + 8, pt.y - 30, 20, 20);
      else {
        ctx.fillStyle = GameData.NATIONS[c.city.nation].color;
        ctx.fillRect(pt.x + 10, pt.y - 28, 12, 12);
      }
    } else {
      ctx.fillStyle = "#999";
      ctx.fillRect(pt.x + 10, pt.y - 28, 12, 12);
    }
    ctx.fillStyle = "#f5f0e0";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 3;
    ctx.font = "bold 11px Georgia, serif";
    ctx.textAlign = "center";
    ctx.strokeText(c.city.name, pt.x, pt.y + 26);
    ctx.fillText(c.city.name, pt.x, pt.y + 26);
  }

  function drawUnit(u) {
    const pt = Hex.toPixel(u.q, u.r, hexSize);
    const def = GameData.UNITS[u.type];
    const img = Art.get(def.sprite);
    const owner = GameData.NATIONS[u.owner];
    // ring
    ctx.beginPath();
    ctx.arc(pt.x, pt.y + 6, 16, 0, Math.PI * 2);
    ctx.fillStyle = owner.color;
    ctx.globalAlpha = 0.85;
    ctx.fill();
    ctx.globalAlpha = 1;
    if (img) ctx.drawImage(img, pt.x - 24, pt.y - 28, 48, 48);
    // HP bar
    const bw = 28, ratio = u.hp / u.maxHp;
    ctx.fillStyle = "#222";
    ctx.fillRect(pt.x - bw / 2, pt.y + 18, bw, 5);
    ctx.fillStyle = ratio > 0.5 ? "#5d5" : ratio > 0.25 ? "#dd5" : "#d55";
    ctx.fillRect(pt.x - bw / 2, pt.y + 18, bw * ratio, 5);
    // spent indicator
    if (u.moved && u.attacked) {
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(pt.x - 20, pt.y - 20, 40, 40);
    }
  }

  return { init, updateHud, afterTurn, showMenu };
})();
