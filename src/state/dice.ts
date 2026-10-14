import { TRACKS, type Pattern, type TrackId } from './pattern';

/**
 * 트랙별, 스텝별 "켜질 확률".
 * 킥은 1·3박, 스네어는 2·4박(스텝 4, 12), 하이햇은 짝수 스텝에 가중치를 둬서
 * 완전 무작위보다 듣기 좋은 결과가 나오게 한다. 직접 들어보며 숫자를 조정하면 된다.
 */
const CHANCE: Record<TrackId, number[]> = {
  kick: [0.95, 0.05, 0.1, 0.05, 0.2, 0.05, 0.25, 0.05, 0.7, 0.05, 0.25, 0.1, 0.15, 0.05, 0.2, 0.1],
  snare: [0, 0, 0.05, 0, 0.9, 0, 0.05, 0.1, 0, 0, 0.05, 0, 0.9, 0, 0.05, 0.2],
  hihat: [0.9, 0.2, 0.8, 0.25, 0.9, 0.2, 0.8, 0.25, 0.9, 0.2, 0.8, 0.25, 0.9, 0.2, 0.8, 0.3],
  clap: [0, 0, 0, 0.05, 0.3, 0, 0.05, 0.05, 0, 0, 0.05, 0.05, 0.35, 0, 0.1, 0.1],
};

/** rng를 바꿔 끼울 수 있게 해두면 테스트할 때 결과를 고정할 수 있다. */
export function generatePattern(rng: () => number = Math.random): Pattern {
  return TRACKS.map((track) => CHANCE[track.id].map((chance) => rng() < chance));
}