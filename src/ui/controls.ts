export const BPM_MIN = 60;
export const BPM_MAX = 180;

export interface ControlHandlers {
  onPlayToggle(): void;
  onBpm(bpm: number): void;
  onDice(): void;
  onUndo(): void;
  onClear(): void;
}

export interface Controls {
  el: HTMLElement;
  setPlaying(playing: boolean): void;
  setBpm(bpm: number): void;
  setUndoEnabled(enabled: boolean): void;
}

const DICE_FACE = `
  <svg viewBox="0 0 64 64" aria-hidden="true">
    <circle cx="16" cy="16" r="6" /><circle cx="48" cy="16" r="6" />
    <circle cx="32" cy="32" r="6" />
    <circle cx="16" cy="48" r="6" /><circle cx="48" cy="48" r="6" />
  </svg>`;

export function createControls(handlers: ControlHandlers, initialBpm: number): Controls {
  const el = document.createElement('div');
  el.className = 'controls';
  el.innerHTML = `
    <button type="button" class="play" aria-pressed="false">
      <span class="play__icon" aria-hidden="true"></span>
      <span class="play__text">재생</span>
    </button>

    <div class="bpm">
      <label class="bpm__label" for="bpm-range">속도</label>
      <input id="bpm-range" class="bpm__range" type="range"
             min="${BPM_MIN}" max="${BPM_MAX}" step="1" value="${initialBpm}" />
      <output class="bpm__value" for="bpm-range">${initialBpm}</output>
      <span class="bpm__unit">BPM</span>
    </div>

    <div class="dice-group">
      <button type="button" class="btn undo" disabled>되돌리기</button>
      <button type="button" class="btn clear">지우기</button>
      <button type="button" class="dice" aria-label="주사위 굴리기">${DICE_FACE}</button>
    </div>
  `;

  const play = el.querySelector<HTMLButtonElement>('.play')!;
  const playText = el.querySelector<HTMLElement>('.play__text')!;
  const range = el.querySelector<HTMLInputElement>('.bpm__range')!;
  const bpmValue = el.querySelector<HTMLOutputElement>('.bpm__value')!;
  const undo = el.querySelector<HTMLButtonElement>('.undo')!;
  const clear = el.querySelector<HTMLButtonElement>('.clear')!;
  const dice = el.querySelector<HTMLButtonElement>('.dice')!;

  play.addEventListener('click', handlers.onPlayToggle);
  range.addEventListener('input', () => handlers.onBpm(Number(range.value)));
  undo.addEventListener('click', handlers.onUndo);
  clear.addEventListener('click', handlers.onClear);

  dice.addEventListener('click', () => {
    // 연타해도 매번 굴러가도록 클래스를 떼었다가 다시 붙인다.
    dice.classList.remove('is-rolling');
    void dice.offsetWidth;
    dice.classList.add('is-rolling');
    handlers.onDice();
  });

  return {
    el,
    setPlaying(playing) {
      play.classList.toggle('is-playing', playing);
      play.setAttribute('aria-pressed', String(playing));
      playText.textContent = playing ? '정지' : '재생';
    },
    setBpm(bpm) {
      range.value = String(bpm);
      bpmValue.textContent = String(bpm);
    },
    setUndoEnabled(enabled) {
      undo.disabled = !enabled;
    },
  };
}