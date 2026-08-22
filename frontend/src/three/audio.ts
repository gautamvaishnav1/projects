let ctx: AudioContext | null = null, rainGain: GainNode, noiseBuf: AudioBuffer, enabled = false;
export function initAudio() {
  if (ctx) return; ctx = new AudioContext();
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
  const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 1000;
  rainGain = ctx.createGain(); rainGain.gain.value = 0;
  src.connect(f).connect(rainGain).connect(ctx.destination); src.start();
}
export function setAudioEnabled(on: boolean) { enabled = on; initAudio(); ctx!.resume(); if (!on) rainGain.gain.setTargetAtTime(0, ctx!.currentTime, 0.3); }
export function setRainLevel(v: number) { if (ctx && enabled) rainGain.gain.setTargetAtTime(v * 0.22, ctx.currentTime, 0.6); }
export function thunder() {
  if (!ctx || !enabled) return; const t = ctx.currentTime;
  const src = ctx.createBufferSource(); src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = "lowpass";
  f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(50, t + 1.4);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
  src.connect(f).connect(g).connect(ctx.destination); src.start(t); src.stop(t + 2);
}
