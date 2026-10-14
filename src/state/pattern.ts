export const STEPS = 16;
export const STEPS_PER_BEAT = 4;
export const DEFAULT_VOLUME = 0.8;

export type TrackId = 'kick' | 'snare' | 'hihat' | 'clap';

export interface TrackDef {
  id: TrackId;
  label: string;
  /** CSS 색상 값 (style.css의 변수를 사용) */
  color: string;
}

export const TRACKS: readonly TrackDef[] = [
  { id: 'kick', label: '킥', color: 'var(--coral)' },
  { id: 'snare', label: '스네어', color: 'var(--sun)' },
  { id: 'hihat', label: '하이햇', color: 'var(--mint)' },
  { id: 'clap', label: '클랩', color: 'var(--grape)' },
];

/** pattern[트랙][스텝] = 켜져 있으면 true */
export type Pattern = boolean[][];

export function createEmptyPattern(): Pattern {
  return TRACKS.map(() => Array<boolean>(STEPS).fill(false));
}

/** 처음 접속했을 때 바로 재생해볼 수 있는 기본 비트 */
export function createDefaultPattern(): Pattern {
  const pattern = createEmptyPattern();
  const turnOn = (id: TrackId, steps: number[]) => {
    const t = TRACKS.findIndex((track) => track.id === id);
    steps.forEach((s) => {
      pattern[t][s] = true;
    });
  };
  turnOn('kick', [0, 8, 10]);
  turnOn('snare', [4, 12]);
  turnOn('hihat', [0, 2, 4, 6, 8, 10, 12, 14]);
  turnOn('clap', [12]);
  return pattern;
}

export function clonePattern(pattern: Pattern): Pattern {
  return pattern.map((row) => [...row]);
}