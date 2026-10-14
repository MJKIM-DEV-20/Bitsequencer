import { TRACKS } from '../state/pattern';
import { DRUMS } from './drums';

/**
 * AudioContext와 믹서(트랙별 볼륨 → 마스터 → 컴프레서 → 스피커)를 관리한다.
 * UI를 모르고, "트랙 번호와 시각"만 받아서 소리를 낸다.
 */
export class AudioEngine {
  readonly ctx: AudioContext;
  private readonly trackGains: GainNode[];
  private volumes: number[];
  private muted: boolean[];

  constructor(volumes: number[], muted: boolean[]) {
    this.ctx = new AudioContext();
    this.volumes = [...volumes];
    this.muted = [...muted];

    const master = this.ctx.createGain();
    master.gain.value = 0.8;
    // 네 악기가 동시에 울려도 찢어지지 않도록 가볍게 눌러준다.
    const compressor = this.ctx.createDynamicsCompressor();
    master.connect(compressor).connect(this.ctx.destination);

    this.trackGains = TRACKS.map((_, t) => {
      const gain = this.ctx.createGain();
      gain.connect(master);
      gain.gain.value = this.level(t);
      return gain;
    });
  }

  /** 브라우저 정책상 사용자 클릭 이후에만 소리가 켜진다. */
  resume(): Promise<void> {
    return this.ctx.resume();
  }

  setVolume(track: number, value: number) {
    this.volumes[track] = value;
    this.apply(track);
  }

  setMuted(track: number, muted: boolean) {
    this.muted[track] = muted;
    this.apply(track);
  }

  /** time은 ctx.currentTime 기준의 정확한 재생 시각(초) */
  trigger(track: number, time: number) {
    DRUMS[TRACKS[track].id](this.ctx, this.trackGains[track], time);
  }

  /** 칸을 눌렀을 때 들려주는 미리듣기 */
  preview(track: number) {
    void this.resume().then(() => this.trigger(track, this.ctx.currentTime));
  }

  private level(track: number): number {
    return this.muted[track] ? 0 : this.volumes[track] ** 2; // 제곱해서 슬라이더 감각을 자연스럽게
  }

  private apply(track: number) {
    this.trackGains[track].gain.setTargetAtTime(this.level(track), this.ctx.currentTime, 0.01);
  }
}