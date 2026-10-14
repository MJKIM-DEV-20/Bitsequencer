import { DEFAULT_VOLUME, STEPS, STEPS_PER_BEAT, TRACKS, type Pattern } from '../state/pattern';

export interface GridHandlers {
  onToggle(track: number, step: number): void;
  onVolume(track: number, value: number): void;
  onMute(track: number, muted: boolean): void;
}

export interface Grid {
  el: HTMLElement;
  /** 패턴 상태를 화면에 반영 */
  render(pattern: Pattern): void;
  /** 현재 재생 중인 스텝 강조 (null이면 해제) */
  setPlayhead(step: number | null): void;
}

const BEATS = STEPS / STEPS_PER_BEAT;

/** 4칸씩 묶어서 박자 단위가 보이도록 셀을 배치한다. */
function buildRow(className: string, buildCell: (step: number) => HTMLElement): HTMLElement {
  const row = document.createElement('div');
  row.className = className;
  for (let b = 0; b < BEATS; b++) {
    const beat = document.createElement('div');
    beat.className = 'beat';
    for (let i = 0; i < STEPS_PER_BEAT; i++) {
      beat.append(buildCell(b * STEPS_PER_BEAT + i));
    }
    row.append(beat);
  }
  return row;
}

export function createGrid(handlers: GridHandlers): Grid {
  const el = document.createElement('section');
  el.className = 'grid';
  el.setAttribute('aria-label', '비트 격자');

  // 스텝별로 강조해야 할 요소(LED + 각 트랙의 패드)를 모아둔다.
  const stepEls: HTMLElement[][] = Array.from({ length: STEPS }, () => []);
  const pads: HTMLButtonElement[][] = TRACKS.map(() => []);

  el.append(
    buildRow('ruler', (step) => {
      const led = document.createElement('span');
      led.className = 'led';
      led.setAttribute('aria-hidden', 'true');
      stepEls[step].push(led);
      return led;
    }),
  );

  TRACKS.forEach((track, t) => {
    const block = document.createElement('div');
    block.className = 'track';
    block.style.setProperty('--c', track.color);

    const head = document.createElement('div');
    head.className = 'track__head';
    head.innerHTML = `
      <span class="track__name">${track.label}</span>
      <button type="button" class="btn mute" aria-pressed="false" aria-label="${track.label} 음소거">음소거</button>
      <input class="volume" type="range" min="0" max="1" step="0.01" value="${DEFAULT_VOLUME}" aria-label="${track.label} 볼륨" />
    `;

    const mute = head.querySelector<HTMLButtonElement>('.mute')!;
    mute.addEventListener('click', () => {
      const muted = mute.getAttribute('aria-pressed') !== 'true';
      mute.setAttribute('aria-pressed', String(muted));
      block.classList.toggle('is-muted', muted);
      handlers.onMute(t, muted);
    });

    const volume = head.querySelector<HTMLInputElement>('.volume')!;
    volume.addEventListener('input', () => handlers.onVolume(t, Number(volume.value)));

    const row = buildRow('track__pads', (step) => {
      const pad = document.createElement('button');
      pad.type = 'button';
      pad.className = 'pad';
      pad.dataset.step = String(step);
      pad.setAttribute('aria-pressed', 'false');
      pad.setAttribute('aria-label', `${track.label} ${step + 1}번째 칸`);
      pads[t].push(pad);
      stepEls[step].push(pad);
      return pad;
    });
    row.addEventListener('click', (e) => {
      const pad = (e.target as HTMLElement).closest<HTMLButtonElement>('.pad');
      if (pad) handlers.onToggle(t, Number(pad.dataset.step));
    });

    block.append(head, row);
    el.append(block);
  });

  let current: number | null = null;

  return {
    el,
    render(pattern) {
      pattern.forEach((row, t) =>
        row.forEach((on, s) => {
          const pad = pads[t][s];
          pad.classList.toggle('is-on', on);
          pad.setAttribute('aria-pressed', String(on));
        }),
      );
    },
    setPlayhead(step) {
      if (current !== null) stepEls[current].forEach((node) => node.classList.remove('is-playing'));
      current = step;
      if (step !== null) stepEls[step].forEach((node) => node.classList.add('is-playing'));
    },
  };
}