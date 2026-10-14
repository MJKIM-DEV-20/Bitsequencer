import { STEPS, type Pattern } from '../state/pattern';
import type { AudioEngine } from './engine';

const TICK_MS = 25; // Worker가 깨우는 간격
const SCHEDULE_AHEAD = 0.1; // 앞으로 이 시간(초) 안에 올 스텝을 미리 예약
const START_DELAY = 0.06;

interface Options {
  engine: AudioEngine;
  getPattern: () => Pattern;
  getBpm: () => number;
  /** 소리가 실제로 재생되는 시점에 맞춰 호출된다 (화면 하이라이트용) */
  onStep: (step: number) => void;
}

/**
 * 룩어헤드 스케줄러.
 * setInterval로 소리를 직접 내면 박자가 흔들리므로, 타이머는 "예약"만 하고
 * 실제 재생 시각은 AudioContext.currentTime 기준으로 정확히 지정한다.
 */
export class Scheduler {
  private readonly worker = new Worker(new URL('../worker/clock.worker.ts', import.meta.url), {
    type: 'module',
  });
  private running = false;
  private nextStep = 0;
  private nextTime = 0;
  private queue: { step: number; time: number }[] = [];
  private raf = 0;

  private readonly opts: Options;

  constructor(opts: Options) {
    this.opts = opts;
    this.worker.onmessage = () => this.schedule();
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.nextStep = 0;
    this.nextTime = this.opts.engine.ctx.currentTime + START_DELAY;
    this.queue = [];
    this.worker.postMessage({ type: 'start', interval: TICK_MS });
    this.raf = requestAnimationFrame(this.draw);
  }

  stop() {
    this.running = false;
    this.worker.postMessage({ type: 'stop' });
    cancelAnimationFrame(this.raf);
    this.queue = [];
  }

  private schedule() {
    if (!this.running) return;
    const { engine, getPattern, getBpm } = this.opts;
    while (this.nextTime < engine.ctx.currentTime + SCHEDULE_AHEAD) {
      // 예약하는 순간의 패턴을 읽으므로 편집/주사위는 "다음 스텝"부터 반영된다.
      getPattern().forEach((row, track) => {
        if (row[this.nextStep]) engine.trigger(track, this.nextTime);
      });
      this.queue.push({ step: this.nextStep, time: this.nextTime });
      if (this.queue.length > 32) this.queue.shift(); // 탭이 가려져 rAF가 멈춘 동안 쌓이는 것 방지

      this.nextTime += 60 / getBpm() / 4; // 16분음표 길이
      this.nextStep = (this.nextStep + 1) % STEPS;
    }
  }

  private draw = () => {
    const now = this.opts.engine.ctx.currentTime;
    while (this.queue.length > 0 && this.queue[0].time <= now) {
      this.opts.onStep(this.queue.shift()!.step);
    }
    this.raf = requestAnimationFrame(this.draw);
  };
}