/* Fronts, 1914. Original score and effects. Web Audio only, no samples.
   Title piece "Staff Map" and the quieter match reduction "Quiet Front"
   are written for this game: D minor, slow pulse, no march or anthem quote.
   Muted state is stored in sessionStorage for this tab session. */
(function () {
  const STORE = "fronts1914-sound";
  let ctx = null;
  let master = null;
  let musicGain = null;
  let sfxGain = null;
  let noiseBuf = null;
  let muted = false;
  let unlocked = false;
  let hold = false;
  let desired = "title";
  let mode = "off";
  let epoch = 0;
  let timer = null;
  let step = 0;
  let nextTime = 0;
  let sfxCursor = 0;
  let stingLock = 0;
  const musicLive = [];

  try { muted = sessionStorage.getItem(STORE) === "off"; } catch (err) { muted = false; }

  /* 32 quarter-notes. Bass is MIDI. Melody is title only. */
  const BASS = [
    38, 38, 38, 38,
    34, 34, 34, 34,
    41, 41, 41, 41,
    45, 45, 45, 45,
    36, 36, 36, 36,
    43, 43, 43, 43,
    34, 34, 34, 34,
    38, 38, 38, 38
  ];
  const MELODY = [
    62, 65, 69, 67, 65, 64, 62, 57,
    58, 62, 60, 58, 57, 60, 62, 65,
    64, 62, 60, 57, 58, 57, 55, 57,
    62, 64, 65, 69, 67, 65, 64, 62
  ];

  function midi(n) { return 440 * Math.pow(2, (n - 69) / 12); }

  function paint() {
    const btn = document.getElementById("mutebtn");
    if (!btn) return;
    btn.textContent = muted ? "Sound off" : "Sound on";
    btn.setAttribute("aria-pressed", muted ? "true" : "false");
    btn.setAttribute("aria-label", muted ? "Unmute sound" : "Mute sound");
  }

  function saveMute() {
    try { sessionStorage.setItem(STORE, muted ? "off" : "on"); } catch (err) { /* session only */ }
  }

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 8;
    comp.ratio.value = 4;
    comp.attack.value = 0.004;
    comp.release.value = 0.18;
    master.connect(comp);
    comp.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.0001;
    musicGain.connect(master);
    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.8;
    sfxGain.connect(master);
    const n = ctx.sampleRate * 2;
    noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
    return ctx;
  }

  function applyMaster() {
    if (!master || !ctx) return;
    master.gain.setValueAtTime(muted ? 0 : 0.9, ctx.currentTime);
  }

  function trackMusic(osc, gainNode) {
    musicLive.push({ osc: osc, gain: gainNode });
    osc.onended = function () {
      for (let i = musicLive.length - 1; i >= 0; i--) {
        if (musicLive[i].osc === osc) musicLive.splice(i, 1);
      }
    };
  }

  function stopMusic() {
    if (!ctx) { musicLive.length = 0; return; }
    const now = ctx.currentTime;
    for (let i = 0; i < musicLive.length; i++) {
      const node = musicLive[i];
      try {
        node.gain.gain.cancelScheduledValues(now);
        const v = Math.max(0.0001, node.gain.gain.value || 0.0001);
        node.gain.gain.setValueAtTime(v, now);
        node.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
        node.osc.stop(now + 0.06);
      } catch (err) { /* already stopped */ }
    }
    musicLive.length = 0;
  }

  function env(gainNode, t, peak, attack, dur) {
    const a = Math.max(0.004, Math.min(attack, dur * 0.4));
    const end = Math.max(dur, a + 0.02);
    gainNode.gain.setValueAtTime(0.0001, t);
    gainNode.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, t + end);
    return end;
  }

  function tone(dest, t, freq, dur, peak, attack, type, list) {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freq), t);
    const end = env(gainNode, t, peak, attack, dur);
    osc.connect(gainNode);
    gainNode.connect(dest);
    osc.start(t);
    osc.stop(t + end + 0.04);
    if (list) trackMusic(osc, gainNode);
    return osc;
  }

  function brass(dest, t, freq, dur, peak) {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gainNode = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(Math.max(30, freq), t);
    filter.type = "lowpass";
    filter.Q.value = 0.6;
    filter.frequency.setValueAtTime(380, t);
    filter.frequency.exponentialRampToValueAtTime(1200, t + Math.min(0.08, dur * 0.4));
    filter.frequency.exponentialRampToValueAtTime(480, t + dur);
    env(gainNode, t, peak, 0.02, dur);
    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(dest);
    osc.start(t);
    osc.stop(t + dur + 0.05);
    if (dest === musicGain) trackMusic(osc, gainNode);
  }

  function noise(t, dur, peak, kind, freq, q) {
    const src = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gainNode = ctx.createGain();
    src.buffer = noiseBuf;
    filter.type = kind;
    filter.frequency.setValueAtTime(Math.max(40, freq), t);
    filter.Q.value = q || 0.7;
    env(gainNode, t, peak, 0.006, dur);
    src.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(sfxGain);
    src.start(t);
    src.stop(t + dur + 0.03);
    return filter;
  }

  function canHear() { return !!(ctx && unlocked && !muted && noiseBuf); }

  function slot(span) {
    const now = ctx.currentTime;
    if (sfxCursor < now) sfxCursor = now;
    const t = sfxCursor > now + 0.85 ? now : sfxCursor;
    sfxCursor = t + span;
    return t;
  }

  function specOf(type) {
    if (!window.Rules || !Rules.UNITS) return null;
    return Rules.UNITS[type] || null;
  }

  function family(type) {
    const spec = specOf(type);
    if (!spec) return "rifle";
    if (spec.cls === "arty") return "artillery";
    if (spec.cls === "cav") return "cavalry";
    if (spec.cls === "sea") return "ship";
    if (spec.cls === "air") return "aircraft";
    if (spec.cls === "inf") return "rifle";
    return "rifle";
  }

  function voice(t, index, which) {
    const i = index % 32;
    const bass = midi(BASS[i]);
    const fifth = midi(BASS[i] + 7);
    const beat = which === "match" ? 60 / 56 : 60 / 64;
    const dur = beat * 0.94;
    const quiet = which === "match" ? 0.55 : 1;
    tone(musicGain, t, bass, dur, 0.16 * quiet, 0.07, "triangle", true);
    tone(musicGain, t, bass * 1.007, dur, 0.1 * quiet, 0.09, "sine", true);
    if (which !== "match" || i % 2 === 0) {
      tone(musicGain, t, fifth, dur * 0.9, which === "match" ? 0.035 : 0.06, 0.08, "sine", true);
    }
    if (which === "title") {
      const mel = midi(MELODY[i]);
      tone(musicGain, t, mel, beat * 0.82, 0.07, 0.03, "triangle", true);
      tone(musicGain, t, mel * 0.5, beat * 0.7, 0.03, 0.04, "sine", true);
      if (i % 4 === 0) {
        brass(musicGain, t, bass * 2, 0.42, 0.045);
        brass(musicGain, t, fifth, 0.42, 0.03);
        tone(musicGain, t, bass * 0.5, beat * 1.3, 0.08, 0.1, "sine", true);
      }
    }
  }

  function setMode(next) {
    epoch += 1;
    const token = epoch;
    if (timer) { clearTimeout(timer); timer = null; }
    stopMusic();
    mode = next === "off" ? "off" : next;
    if (!ctx || !unlocked || muted || next === "off") {
      mode = "off";
      return;
    }
    step = 0;
    const beatLen = 60 / (next === "match" ? 56 : 64);
    nextTime = ctx.currentTime + 0.06;
    const level = next === "match" ? 0.2 : 0.46;
    const now = ctx.currentTime;
    musicGain.gain.cancelScheduledValues(now);
    musicGain.gain.setValueAtTime(0.0001, now);
    musicGain.gain.linearRampToValueAtTime(level, now + 0.4);
    (function loop() {
      if (token !== epoch || !ctx || muted || mode === "off") return;
      if (nextTime < ctx.currentTime - 0.02) nextTime = ctx.currentTime + 0.05;
      while (nextTime < ctx.currentTime + 0.32) {
        try { voice(nextTime, step, mode); } catch (err) { console.error(err); }
        step += 1;
        nextTime += beatLen;
      }
      timer = setTimeout(loop, 80);
    })();
  }

  function startTitle() {
    desired = "title";
    hold = false;
    if (!unlocked || muted) {
      if (mode !== "off") setMode("off");
      return;
    }
    if (mode === "title") return;
    setMode("title");
  }

  function startMatch() {
    desired = "match";
    hold = false;
    if (!unlocked || muted) {
      if (mode !== "off") setMode("off");
      return;
    }
    if (mode === "match") return;
    setMode("match");
  }

  function arm(fromMute, deferStart) {
    const c = ensure();
    if (!c) return;
    if (c.state === "suspended") c.resume();
    unlocked = true;
    applyMaster();
    if (fromMute || muted || hold || deferStart) return;
    if (mode !== "off") return;
    if (desired === "match") startMatch();
    else startTitle();
  }

  function toggleMute() {
    muted = !muted;
    saveMute();
    paint();
    const c = ensure();
    if (!c) return;
    unlocked = true;
    if (c.state === "suspended") c.resume();
    applyMaster();
    if (muted) setMode("off");
    else if (!hold) setMode(desired);
  }

  function playUi(kind) {
    if (!canHear()) return;
    const t = slot(kind === "confirm" ? 0.2 : 0.07);
    if (kind === "confirm") {
      tone(sfxGain, t, 523, 0.09, 0.09, 0.005, "sine", false);
      tone(sfxGain, t + 0.09, 784, 0.11, 0.08, 0.005, "sine", false);
      return;
    }
    tone(sfxGain, t, 720, 0.045, 0.08, 0.004, "sine", false);
  }

  function playSelect() {
    if (!canHear()) return;
    const t = slot(0.09);
    tone(sfxGain, t, 590, 0.04, 0.07, 0.004, "sine", false);
    tone(sfxGain, t + 0.035, 880, 0.05, 0.05, 0.004, "sine", false);
  }

  function playMove(type) {
    if (!canHear()) return;
    const spec = specOf(type);
    const domain = spec && spec.domain ? spec.domain : "land";
    const t = slot(domain === "air" ? 0.22 : 0.18);
    if (domain === "air") {
      const filter = noise(t, 0.2, 0.16, "bandpass", 700, 0.8);
      filter.frequency.exponentialRampToValueAtTime(1600, t + 0.18);
      return;
    }
    if (domain === "sea") {
      noise(t, 0.22, 0.18, "lowpass", 420, 0.6);
      tone(sfxGain, t, 90, 0.18, 0.08, 0.01, "sine", false);
      return;
    }
    tone(sfxGain, t, 128, 0.07, 0.12, 0.004, "sine", false);
    tone(sfxGain, t + 0.09, 96, 0.08, 0.1, 0.004, "sine", false);
  }

  function playAttack(type) {
    if (!canHear()) return;
    const kind = family(type);
    const t = slot(kind === "artillery" || kind === "ship" ? 0.5 : 0.28);
    const wobble = 0.97 + Math.random() * 0.06;
    if (kind === "artillery") {
      const body = ctx.createOscillator();
      const gainNode = ctx.createGain();
      body.type = "sine";
      body.frequency.setValueAtTime(78 * wobble, t);
      body.frequency.exponentialRampToValueAtTime(32, t + 0.42);
      env(gainNode, t, 0.55, 0.008, 0.5);
      body.connect(gainNode);
      gainNode.connect(sfxGain);
      body.start(t);
      body.stop(t + 0.55);
      noise(t, 0.48, 0.4, "lowpass", 260, 0.5);
      return;
    }
    if (kind === "cavalry") {
      for (let i = 0; i < 3; i++) noise(t + i * 0.06, 0.05, 0.22, "bandpass", 980, 1.1);
      brass(sfxGain, t + 0.05, 640 * wobble, 0.09, 0.06);
      return;
    }
    if (kind === "ship") {
      brass(sfxGain, t, 103 * wobble, 0.36, 0.1);
      brass(sfxGain, t, 154 * wobble, 0.3, 0.06);
      noise(t + 0.02, 0.28, 0.22, "lowpass", 480, 0.5);
      return;
    }
    if (kind === "aircraft") {
      const filter = noise(t, 0.26, 0.2, "bandpass", 640, 0.9);
      filter.frequency.exponentialRampToValueAtTime(1900, t + 0.22);
      tone(sfxGain, t, 1400, 0.04, 0.05, 0.003, "square", false);
      tone(sfxGain, t + 0.08, 1680, 0.04, 0.04, 0.003, "square", false);
      return;
    }
    /* Rifle, and the fallback for a class with no special case. */
    noise(t, 0.07, 0.42, "bandpass", 1900 * wobble, 1.3);
    noise(t, 0.04, 0.2, "highpass", 3200, 0.6);
    tone(sfxGain, t, 160, 0.05, 0.08, 0.003, "sine", false);
  }

  function playRecruit() {
    if (!canHear()) return;
    const t = slot(0.26);
    noise(t, 0.06, 0.18, "highpass", 1800, 0.7);
    brass(sfxGain, t + 0.04, midi(62), 0.12, 0.07);
    brass(sfxGain, t + 0.14, midi(69), 0.14, 0.07);
  }

  function playCapture() {
    if (!canHear()) return;
    const t = slot(0.48);
    brass(sfxGain, t, midi(62), 0.18, 0.09);
    brass(sfxGain, t + 0.14, midi(65), 0.18, 0.08);
    brass(sfxGain, t + 0.28, midi(69), 0.24, 0.09);
  }

  function playVictory() {
    const nowMs = (window.performance && performance.now) ? performance.now() : Date.now();
    if (nowMs - stingLock < 500) return;
    stingLock = nowMs;
    hold = true;
    if (mode !== "off") setMode("off");
    if (!canHear()) return;
    const t = ctx.currentTime + 0.05;
    tone(sfxGain, t, midi(38), 1.15, 0.1, 0.05, "sine", false);
    brass(sfxGain, t, midi(62), 0.22, 0.08);
    brass(sfxGain, t + 0.18, midi(65), 0.22, 0.08);
    brass(sfxGain, t + 0.36, midi(69), 0.24, 0.09);
    brass(sfxGain, t + 0.56, midi(74), 0.4, 0.1);
  }

  function playDefeat() {
    const nowMs = (window.performance && performance.now) ? performance.now() : Date.now();
    if (nowMs - stingLock < 500) return;
    stingLock = nowMs;
    hold = true;
    if (mode !== "off") setMode("off");
    if (!canHear()) return;
    const t = ctx.currentTime + 0.05;
    tone(sfxGain, t, midi(38), 1.2, 0.08, 0.08, "sine", false);
    tone(sfxGain, t, midi(69), 0.28, 0.07, 0.02, "triangle", false);
    tone(sfxGain, t + 0.24, midi(65), 0.28, 0.06, 0.02, "triangle", false);
    tone(sfxGain, t + 0.48, midi(62), 0.3, 0.06, 0.02, "triangle", false);
    tone(sfxGain, t + 0.74, midi(58), 0.42, 0.07, 0.03, "triangle", false);
  }

  function fromMuteTarget(ev) {
    const el = ev.target;
    if (!el || !el.closest) return false;
    return !!el.closest("#mutebtn");
  }

  function shouldDefer(ev) {
    const el = ev.target;
    if (!el || !el.closest) return false;
    return !!el.closest("#startbtn, #againbtn, #resign");
  }

  paint();
  const muteBtn = document.getElementById("mutebtn");
  if (muteBtn) muteBtn.addEventListener("click", function () { toggleMute(); });
  function onGesture(ev) {
    try { arm(fromMuteTarget(ev), shouldDefer(ev)); }
    catch (err) { console.error(err); }
  }
  document.addEventListener("pointerdown", onGesture, true);
  document.addEventListener("click", onGesture, true);

  function guard(fn) {
    return function () {
      try { return fn.apply(null, arguments); }
      catch (err) { console.error(err); }
    };
  }

  window.FrontAudio = {
    arm: guard(arm),
    startTitle: guard(startTitle),
    startMatch: guard(startMatch),
    toggleMute: guard(toggleMute),
    playUi: guard(playUi),
    playSelect: guard(playSelect),
    playMove: guard(playMove),
    playAttack: guard(playAttack),
    playRecruit: guard(playRecruit),
    playCapture: guard(playCapture),
    playVictory: guard(playVictory),
    playDefeat: guard(playDefeat)
  };
})();
