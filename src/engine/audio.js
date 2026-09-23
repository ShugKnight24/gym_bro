/**
 * Procedural audio: synthesized SFX and a step-sequenced adaptive soundtrack on
 * the Web Audio API, no asset files. Graph: sfx bus + music bus (via a duck
 * gain) → master → compressor → destination. Music is scheduled on the audio
 * clock by a lookahead timer; intensity adds bass/drum/arp layers.
 *
 * Import-safe in node: without AudioContext every method is a silent no-op.
 */

const KEY = "gymbro_audio";
const DEFAULTS = { master: 0.8, music: 0.5, sfx: 0.8, muted: false };
const LOOKAHEAD = 0.1;
const TICK_MS = 25;
const FADE = 1;

const clamp01 = (v) => Math.min(1, Math.max(0, Number(v) || 0));
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const rand = (a, b) => a + Math.random() * (b - a);

function loadPrefs() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!d) return { ...DEFAULTS };
    return {
      master: d.master == null ? DEFAULTS.master : clamp01(d.master),
      music: d.music == null ? DEFAULTS.music : clamp01(d.music),
      sfx: d.sfx == null ? DEFAULTS.sfx : clamp01(d.sfx),
      muted: !!d.muted,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

function savePrefs(p) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {}
}

// Tracks: chords as midi notes per bar (16 steps); level = base + intensity * span.
const TRACKS = {
  title: {
    bpm: 80, base: 0.15, span: 0.4, kickEvery: 8, bell: true,
    chords: [[60, 64, 67, 71], [57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 65]],
    bass: [0, 8],
  },
  gym: {
    bpm: 110, base: 0.3, span: 0.7, kickEvery: 4, bell: false,
    chords: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]],
    bass: [0, 3, 6, 8, 10, 14],
  },
  event: {
    bpm: 132, base: 0.6, span: 0.4, kickEvery: 4, bell: false,
    chords: [[62, 65, 69], [58, 62, 65], [60, 64, 67], [57, 61, 64]],
    bass: [0, 2, 4, 6, 8, 10, 12, 14],
  },
};

export function createAudio() {
  const prefs = loadPrefs();
  let ctx = null;
  let master = null, musicBus = null, duck = null, sfxBus = null, noiseBuf = null;
  let track = null;
  let intensity = 0;
  let voices = [];
  let timer = null;

  function Ctor() {
    if (typeof window === "undefined") return null;
    return window.AudioContext || window.webkitAudioContext || null;
  }

  const hidden = () => typeof document !== "undefined" && document.hidden;

  function applyGains() {
    if (!ctx) return;
    const t = ctx.currentTime;
    master.gain.setTargetAtTime(prefs.muted ? 0 : prefs.master, t, 0.03);
    musicBus.gain.setTargetAtTime(prefs.music, t, 0.03);
    sfxBus.gain.setTargetAtTime(prefs.sfx, t, 0.03);
  }

  function build() {
    const C = Ctor();
    if (!C) return false;
    ctx = new C();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    comp.connect(ctx.destination);
    master = ctx.createGain();
    master.connect(comp);
    duck = ctx.createGain();
    duck.connect(master);
    musicBus = ctx.createGain();
    musicBus.connect(duck);
    sfxBus = ctx.createGain();
    sfxBus.connect(master);
    master.gain.value = musicBus.gain.value = sfxBus.gain.value = 0;
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    applyGains();
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", () => {
        try {
          if (hidden()) ctx.suspend();
          else ctx.resume().then(ensureTimer, () => {});
          ensureTimer();
        } catch {}
      });
    }
    return true;
  }

  // One enveloped oscillator. o: type, g (peak), a (attack), to (glide target), lp.
  function tone(dest, t, f, dur, o = {}) {
    const osc = ctx.createOscillator();
    osc.type = o.type || "sine";
    osc.frequency.setValueAtTime(f, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + (o.slide || dur));
    const g = ctx.createGain();
    const a = o.a ?? 0.005;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, o.g ?? 0.3), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, a + 0.01));
    let node = osc;
    if (o.lp) {
      const flt = ctx.createBiquadFilter();
      flt.type = "lowpass";
      flt.frequency.value = o.lp;
      osc.connect(flt);
      node = flt;
    }
    node.connect(g);
    g.connect(dest);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  // Filtered noise burst. o: type (filter), f, q, g, a.
  function noise(dest, t, dur, o = {}) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const flt = ctx.createBiquadFilter();
    flt.type = o.type || "bandpass";
    flt.frequency.value = o.f || 1000;
    flt.Q.value = o.q || 0.8;
    const g = ctx.createGain();
    const a = o.a ?? 0.003;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, o.g ?? 0.2), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, a + 0.01));
    src.connect(flt);
    flt.connect(g);
    g.connect(dest);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.05);
  }

  // SFX recipes: (out, t, r) where r is the pitch ratio.
  const SFX = {
    rep_perfect(o, t, r) {
      tone(o, t, 880 * r, 0.16, { type: "triangle", to: 440 * r, slide: 0.08, g: 0.35 });
      tone(o, t, 1320 * r, 0.1, { type: "square", g: 0.06, lp: 3000 });
      noise(o, t, 0.05, { type: "highpass", f: 6000, g: 0.1 });
      [2093, 2637, 3136].forEach((f, i) => tone(o, t + 0.04 + i * 0.04, f * r, 0.25, { g: 0.05 }));
    },
    rep_good(o, t, r) {
      tone(o, t, 660 * r, 0.12, { type: "triangle", to: 330 * r, slide: 0.08, g: 0.25 });
      tone(o, t, 990 * r, 0.1, { g: 0.05 });
    },
    rep_miss(o, t, r) {
      tone(o, t, 110 * r, 0.22, { type: "sawtooth", to: 70 * r, g: 0.18, lp: 600 });
      noise(o, t, 0.15, { type: "lowpass", f: 300, g: 0.2 });
    },
    clank(o, t, r) {
      [0, rand(0.04, 0.08)].forEach((d, k) => {
        [523, 1187, 1733, 2410].forEach((f, i) =>
          tone(o, t + d, f * r * (k ? 1.06 : 1), 0.5 - i * 0.08, { g: 0.07 / (k + 1) }));
        noise(o, t + d, 0.04, { f: 3000, g: 0.25 / (k + 1) });
      });
    },
    cash(o, t, r) {
      noise(o, t, 0.06, { type: "highpass", f: 3000, g: 0.12 });
      tone(o, t + 0.03, 1568 * r, 0.3, { type: "triangle", g: 0.15 });
      tone(o, t + 0.11, 2093 * r, 0.45, { type: "triangle", g: 0.15 });
      tone(o, t + 0.11, 2637 * r, 0.35, { g: 0.05 });
    },
    ui(o, t, r) {
      tone(o, t, 1200 * r, 0.04, { type: "triangle", g: 0.12, a: 0.001 });
    },
    buy(o, t, r) {
      noise(o, t, 0.03, { type: "highpass", f: 4000, g: 0.08 });
      tone(o, t, 784 * r, 0.15, { type: "triangle", g: 0.15 });
      tone(o, t + 0.07, 1175 * r, 0.22, { type: "triangle", g: 0.15 });
    },
    error(o, t, r) {
      tone(o, t, 220 * r, 0.09, { type: "square", g: 0.08, lp: 1200 });
      tone(o, t + 0.12, 196 * r, 0.12, { type: "square", g: 0.08, lp: 1200 });
    },
    fanfare(o, t, r) {
      [523, 659, 784, 1047].forEach((f, i) =>
        tone(o, t + i * 0.09, f * r, i === 3 ? 0.6 : 0.14, { type: "square", g: 0.08, lp: 3500 }));
      [392, 523, 659].forEach((f) =>
        tone(o, t + 0.27, f * r, 0.6, { type: "sawtooth", g: 0.04, a: 0.03, lp: 2000 }));
    },
    cheer(o, t) {
      noise(o, t, 1.6, { f: 900, q: 0.6, g: 0.15, a: 0.4 });
      noise(o, t, 1.4, { f: 2500, q: 0.9, g: 0.08, a: 0.5 });
      for (let i = 0; i < 14; i++) noise(o, t + rand(0.1, 1.2), 0.03, { f: rand(1500, 3000), g: rand(0.05, 0.12) });
    },
    sleep(o, t, r) {
      [1047, 880, 698, 523].forEach((f, i) => tone(o, t + i * 0.18, f * r, 0.8, { g: 0.09, a: 0.01 }));
    },
    break(o, t, r) {
      noise(o, t, 0.35, { f: 1500, q: 2, g: 0.35 });
      tone(o, t, 180 * r, 0.4, { type: "sawtooth", to: 40, g: 0.15, lp: 1200 });
      [613, 1471, 2239].forEach((f) => tone(o, t, f * r, 0.35, { g: 0.06 }));
      for (let i = 0; i < 4; i++) noise(o, t + rand(0.05, 0.3), 0.03, { f: rand(800, 4000), q: 3, g: 0.25 });
    },
    step(o, t, r) {
      noise(o, t, 0.06, { type: "lowpass", f: 400 * r, g: 0.12, a: 0.002 });
      tone(o, t, 90 * r, 0.05, { g: 0.06 });
    },
    pr(o, t, r) {
      tone(o, t, 150, 0.4, { to: 40, g: 0.5 });
      noise(o, t, 1, { type: "highpass", f: 5000, g: 0.1 });
      [523, 659, 784, 1047].forEach((f) =>
        tone(o, t + 0.02, f * r, 0.9, { type: "sawtooth", g: 0.05, a: 0.02, lp: 2500 }));
      [2093, 2637, 3136, 4186].forEach((f, i) => tone(o, t + 0.1 + i * 0.05, f * r, 0.3, { g: 0.04 }));
    },
  };

  function duckMusic() {
    if (track !== "event" && intensity < 0.6) return;
    const t = ctx.currentTime;
    duck.gain.cancelScheduledValues(t);
    duck.gain.setValueAtTime(duck.gain.value, t);
    duck.gain.linearRampToValueAtTime(0.6, t + 0.02);
    duck.gain.setTargetAtTime(1, t + 0.1, 0.12);
  }

  // Music: one voice per track so the outgoing one can crossfade.
  function scheduleStep(v, s, t) {
    const def = v.def;
    const o = v.gain;
    const lv = Math.min(1, def.base + intensity * def.span);
    const sd = 60 / def.bpm / 4;
    const chord = def.chords[Math.floor(s / 16) % def.chords.length];
    const st = s % 16;
    if (st === 0) {
      chord.forEach((m) =>
        tone(o, t, mtof(m), sd * 16 * 0.97, { type: "sawtooth", g: 0.022, a: 0.4, lp: 700 + 500 * lv }));
    }
    if (lv >= 0.2 && def.bass.includes(st)) {
      tone(o, t, mtof(chord[0] - 12), sd * 1.6, { type: "sawtooth", g: 0.09, lp: 350 + 300 * lv });
    }
    if (lv >= 0.4 && (st % 2 === 0 || lv >= 0.95)) {
      noise(o, t, 0.04, { type: "highpass", f: 7000, g: st % 4 === 2 ? 0.05 : 0.025 });
    }
    if (lv >= 0.5 && st % def.kickEvery === 0) tone(o, t, 140, 0.25, { to: 45, slide: 0.12, g: 0.35 });
    if (lv >= 0.7 && (st === 4 || st === 12)) {
      noise(o, t, 0.14, { f: 1800, q: 0.7, g: 0.12 });
      tone(o, t, 200, 0.08, { type: "triangle", g: 0.06 });
    }
    if ((lv >= 0.85 && st % 2 === 0) || (def.bell && st % 4 === 0)) {
      tone(o, t, mtof(chord[(st >> 1) % chord.length] + 12), 0.3, { type: "triangle", g: 0.025 });
    }
  }

  function tick() {
    if (!ctx || ctx.state !== "running" || hidden() || !voices.length) return stopTimer();
    const now = ctx.currentTime;
    voices = voices.filter((v) => {
      if (now < v.stopAt) return true;
      try { v.gain.disconnect(); } catch {}
      return false;
    });
    for (const v of voices) {
      if (v.next < now - 0.2) v.next = now + 0.05;
      const sd = 60 / v.def.bpm / 4;
      while (v.next < now + LOOKAHEAD && v.next < v.stopAt) {
        scheduleStep(v, v.step++, v.next);
        v.next += sd;
      }
    }
    if (!voices.length) stopTimer();
  }

  function stopTimer() {
    if (timer != null) clearInterval(timer);
    timer = null;
  }

  function ensureTimer() {
    if (timer != null || !ctx || !voices.length || ctx.state !== "running" || hidden()) return;
    timer = setInterval(() => {
      try { tick(); } catch { stopTimer(); }
    }, TICK_MS);
  }

  function startVoice() {
    if (!ctx || !track || voices.some((v) => v.name === track && v.stopAt === Infinity)) return;
    const t = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(1, t + FADE);
    gain.connect(musicBus);
    voices.push({ name: track, def: TRACKS[track], gain, step: 0, next: t + 0.05, stopAt: Infinity });
  }

  const safe = (fn) => (...args) => {
    try { return fn(...args); } catch { return undefined; }
  };

  return {
    unlock: safe(() => {
      if (!ctx && !build()) return;
      if (ctx.state === "suspended" && !hidden()) ctx.resume().then(ensureTimer, () => {});
      startVoice();
      ensureTimer();
    }),
    play: safe((name, opts = {}) => {
      const fn = SFX[name];
      if (!fn || !ctx || ctx.state !== "running" || prefs.muted) return;
      const r = Math.pow(2, ((Number(opts.pitch) || 0) + rand(-0.3, 0.3)) / 12);
      const out = ctx.createGain();
      out.gain.value = clamp01(opts.gain ?? 1) * rand(0.9, 1.05);
      out.connect(sfxBus);
      fn(out, ctx.currentTime + 0.005, r);
      setTimeout(() => { try { out.disconnect(); } catch {} }, 3000);
      duckMusic();
    }),
    setMusic: safe((next) => {
      next = TRACKS[next] ? next : null;
      if (next === track) return;
      track = next;
      if (!ctx) return;
      const t = ctx.currentTime;
      for (const v of voices) {
        if (v.stopAt !== Infinity) continue;
        v.gain.gain.cancelScheduledValues(t);
        v.gain.gain.setValueAtTime(v.gain.gain.value, t);
        v.gain.gain.linearRampToValueAtTime(0, t + FADE);
        v.stopAt = t + FADE + 0.1;
      }
      startVoice();
      ensureTimer();
    }),
    setIntensity: safe((v) => { intensity = clamp01(v); }),
    setVolume: safe((bus, v) => {
      if (!(bus in DEFAULTS) || bus === "muted") return;
      prefs[bus] = clamp01(v);
      savePrefs(prefs);
      applyGains();
    }),
    volume: (bus) => (bus in DEFAULTS && bus !== "muted" ? prefs[bus] : 0),
    setMuted: safe((m) => {
      prefs.muted = !!m;
      savePrefs(prefs);
      applyGains();
    }),
    muted: () => prefs.muted,
  };
}
