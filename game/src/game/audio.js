// Degen Blackjack — Web Audio API synthesized sounds
// Chad Labs / Stake Engine RGS
// No external audio files — all synthesized via Web Audio API

let ctx = null;
let _muted = false;

export function isMuted() { return _muted; }
export function setMuted(value) { _muted = Boolean(value); }
export function toggleMute() { _muted = !_muted; return _muted; }

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}

// Card snap: 80ms filtered noise burst (on hit / double / dealer draw)
export function playCardSnap() {
  if (_muted) return;
  try {
    const ac = getCtx();
    const buf = ac.createBuffer(1, ac.sampleRate * 0.08, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-(i / data.length) * 30) * 0.3;
    }
    const src = ac.createBufferSource();
    src.buffer = buf;
    const filter = ac.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 2000;
    filter.Q.value = 1;
    const gain = ac.createGain();
    gain.gain.value = 0.4;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ac.destination);
    src.start();
  } catch (_) {}
}

// Deal swoosh: 150ms lowpass noise (on deal)
export function playDealSwoosh() {
  if (_muted) return;
  try {
    const ac = getCtx();
    const buf = ac.createBuffer(1, ac.sampleRate * 0.15, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = i / data.length;
      data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 15) * (1 - t) * 0.25;
    }
    const src = ac.createBufferSource();
    src.buffer = buf;
    const filter = ac.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 3000;
    const gain = ac.createGain();
    gain.gain.value = 0.5;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ac.destination);
    src.start();
  } catch (_) {}
}
