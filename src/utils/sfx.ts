/**
 * 轻量音效合成（Web Audio API）。
 * 仅用于两处：事件卡弹出的纸张翻页声、国会选举时的远处人声嘈杂。
 * 不加载任何外部音频文件。
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

function noiseBuffer(ac: AudioContext, duration: number): AudioBuffer {
  const len = Math.max(1, Math.floor(ac.sampleRate * duration));
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

/** 遥远的纸张翻页声：几层高频带通噪声的短促摩擦 */
export function playPageTurn(): void {
  const ac = getCtx();
  if (!ac) return;
  const now = ac.currentTime;
  const bursts = [
    { delay: 0, dur: 0.26, freq: 2400, q: 0.8, gain: 0.14 },
    { delay: 0.05, dur: 0.2, freq: 4200, q: 1.1, gain: 0.09 },
    { delay: 0.11, dur: 0.16, freq: 5600, q: 1.4, gain: 0.05 },
  ];
  bursts.forEach((b) => {
    const src = ac.createBufferSource();
    src.buffer = noiseBuffer(ac, b.dur);
    const filter = ac.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = b.freq;
    filter.Q.value = b.q;
    const gain = ac.createGain();
    const t0 = now + b.delay;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(b.gain, t0 + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + b.dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ac.destination);
    src.start(t0);
    src.stop(t0 + b.dur + 0.02);
  });
}

/** 遥远的国会人声交谈：多层带通噪声叠加，缓慢起伏后渐隐 */
export function playParliamentMurmur(): void {
  const ac = getCtx();
  if (!ac) return;
  const now = ac.currentTime;
  const dur = 2.8;
  const layers = [
    { freq: 420, q: 0.7, gain: 0.045, delay: 0.0 },
    { freq: 760, q: 0.9, gain: 0.038, delay: 0.12 },
    { freq: 1250, q: 1.0, gain: 0.03, delay: 0.05 },
    { freq: 1900, q: 1.2, gain: 0.022, delay: 0.18 },
    { freq: 2800, q: 1.4, gain: 0.014, delay: 0.09 },
  ];
  layers.forEach((l) => {
    const src = ac.createBufferSource();
    src.buffer = noiseBuffer(ac, dur);
    const filter = ac.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = l.freq;
    filter.Q.value = l.q;
    const gain = ac.createGain();
    const t0 = now + l.delay;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(l.gain, t0 + 0.55);
    // 缓慢起伏，模拟远处交谈的强弱
    const lfo = ac.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.6 + Math.random() * 0.7;
    const lfoGain = ac.createGain();
    lfoGain.gain.value = l.gain * 0.5;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    lfo.start(t0);
    lfo.stop(t0 + dur);
    gain.gain.setValueAtTime(l.gain, t0 + dur - 0.8);
    gain.gain.linearRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ac.destination);
    src.start(t0);
    src.stop(t0 + dur);
  });
}
