import type { TrackId } from '../state/pattern';

/**
 * 샘플 파일 없이 오실레이터와 노이즈로 합성하는 드럼 4종.
 * 실시간(AudioContext)과 내보내기(OfflineAudioContext) 둘 다 쓸 수 있도록
 * BaseAudioContext를 인자로 받는다.
 */
type Ctx = BaseAudioContext;
export type DrumFn = (ctx: Ctx, dest: AudioNode, time: number) => void;

const noiseBuffers = new WeakMap<Ctx, AudioBuffer>();

function getNoise(ctx: Ctx): AudioBuffer {
  let buffer = noiseBuffers.get(ctx);
  if (!buffer) {
    buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); // 1초짜리 화이트 노이즈
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    noiseBuffers.set(ctx, buffer);
  }
  return buffer;
}

function noiseSource(ctx: Ctx, time: number, duration: number): AudioBufferSourceNode {
  const source = ctx.createBufferSource();
  source.buffer = getNoise(ctx);
  source.start(time, Math.random() * 0.5); // 매번 다른 구간을 써서 기계적인 느낌을 줄인다
  source.stop(time + duration);
  return source;
}

/** 시작 클릭음을 막기 위해 아주 짧은 attack을 준 뒤 지수 감쇠 */
function envelope(param: AudioParam, time: number, peak: number, decay: number) {
  param.setValueAtTime(0.0001, time);
  param.linearRampToValueAtTime(peak, time + 0.002);
  param.exponentialRampToValueAtTime(0.001, time + decay);
}

const kick: DrumFn = (ctx, dest, time) => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(160, time);
  osc.frequency.exponentialRampToValueAtTime(45, time + 0.12); // 피치가 빠르게 내려가며 "쿵" 소리가 난다
  envelope(gain.gain, time, 1, 0.4);
  osc.connect(gain).connect(dest);
  osc.start(time);
  osc.stop(time + 0.45);
};

const snare: DrumFn = (ctx, dest, time) => {
  // 노이즈(치는 소리) + 짧은 톤(몸통)
  const noise = noiseSource(ctx, time, 0.25);
  const highpass = ctx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = 1200;
  const noiseGain = ctx.createGain();
  envelope(noiseGain.gain, time, 0.7, 0.18);
  noise.connect(highpass).connect(noiseGain).connect(dest);

  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(220, time);
  osc.frequency.exponentialRampToValueAtTime(120, time + 0.08);
  envelope(oscGain.gain, time, 0.5, 0.1);
  osc.connect(oscGain).connect(dest);
  osc.start(time);
  osc.stop(time + 0.15);
};

const hihat: DrumFn = (ctx, dest, time) => {
  const noise = noiseSource(ctx, time, 0.08);
  const highpass = ctx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = 7500;
  const gain = ctx.createGain();
  envelope(gain.gain, time, 0.45, 0.05);
  noise.connect(highpass).connect(gain).connect(dest);
};

const clap: DrumFn = (ctx, dest, time) => {
  const noise = noiseSource(ctx, time, 0.3);
  const bandpass = ctx.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.value = 1500;
  bandpass.Q.value = 1;
  const gain = ctx.createGain();
  // 짧게 세 번 치고 마지막에 길게 울리는 박수 소리
  for (let i = 0; i < 3; i++) {
    const start = time + i * 0.014;
    gain.gain.setValueAtTime(0.9, start);
    gain.gain.exponentialRampToValueAtTime(0.2, start + 0.012);
  }
  gain.gain.setValueAtTime(0.9, time + 0.042);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);
  noise.connect(bandpass).connect(gain).connect(dest);
};

export const DRUMS: Record<TrackId, DrumFn> = { kick, snare, hihat, clap };