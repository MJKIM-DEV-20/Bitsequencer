import './style.css';
import {
  DEFAULT_VOLUME,
  TRACKS,
  clonePattern,
  createDefaultPattern,
  createEmptyPattern,
  type Pattern,
} from './state/pattern';
import { generatePattern } from './state/dice';
import { AudioEngine } from './audio/engine';
import { Scheduler } from './audio/scheduler';
import { createGrid } from './ui/grid';
import { BPM_MAX, BPM_MIN, createControls } from './ui/controls';

const state = {
  pattern: createDefaultPattern(),
  /** 주사위/지우기 직전 패턴 (되돌리기 1단계용) */
  previous: null as Pattern | null,
  bpm: 120,
  playing: false,
  volumes: TRACKS.map(() => DEFAULT_VOLUME),
  muted: TRACKS.map(() => false),
};

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <main class="machine">
    <header class="machine__head">
      <h1 class="title">Beat Sequencer</h1>
      <p class="tagline">칸을 누르고, 주사위를 굴려서 나만의 비트를 만들어요.</p>
    </header>
    <div data-slot="controls"></div>
    <div data-slot="grid"></div>
    <footer class="files">
      <button type="button" class="btn" disabled title="곧 추가돼요">저장</button>
      <button type="button" class="btn" disabled title="곧 추가돼요">불러오기</button>
      <button type="button" class="btn" disabled title="곧 추가돼요">WAV 내보내기</button>
    </footer>
  </main>
`;

// ---- 오디오 (첫 클릭 때 만든다: 브라우저가 사용자 동작 전에는 소리를 막는다) ----
let audio: { engine: AudioEngine; scheduler: Scheduler } | null = null;

function ensureAudio() {
  if (!audio) {
    const engine = new AudioEngine(state.volumes, state.muted);
    const scheduler = new Scheduler({
      engine,
      getPattern: () => state.pattern,
      getBpm: () => state.bpm,
      onStep: (step) => grid.setPlayhead(step),
    });
    audio = { engine, scheduler };
  }
  return audio;
}

async function togglePlay() {
  if (state.playing) {
    state.playing = false;
    controls.setPlaying(false);
    audio?.scheduler.stop();
    grid.setPlayhead(null);
    return;
  }
  const { engine, scheduler } = ensureAudio();
  await engine.resume();
  state.playing = true;
  controls.setPlaying(true);
  scheduler.start();
}

function setPattern(next: Pattern, { undoable }: { undoable: boolean }) {
  if (undoable) state.previous = clonePattern(state.pattern);
  state.pattern = next;
  grid.render(state.pattern);
  controls.setUndoEnabled(state.previous !== null);
}

const grid = createGrid({
  onToggle(track, step) {
    const on = !state.pattern[track][step];
    state.pattern[track][step] = on;
    grid.render(state.pattern);
    // 재생 중이 아닐 때 칸을 켜면 그 소리를 미리 들려준다.
    if (on && !state.playing) ensureAudio().engine.preview(track);
  },
  onVolume(track, value) {
    state.volumes[track] = value;
    audio?.engine.setVolume(track, value);
  },
  onMute(track, muted) {
    state.muted[track] = muted;
    audio?.engine.setMuted(track, muted);
  },
});

const controls = createControls(
  {
    onPlayToggle: togglePlay,
    onBpm(bpm) {
      state.bpm = Math.min(BPM_MAX, Math.max(BPM_MIN, bpm));
      controls.setBpm(state.bpm); // 스케줄러가 매 스텝마다 읽으므로 재생 중에도 바로 반영된다.
    },
    onDice() {
      setPattern(generatePattern(), { undoable: true });
    },
    onUndo() {
      if (!state.previous) return;
      const restore = state.previous;
      state.previous = null;
      setPattern(restore, { undoable: false });
    },
    onClear() {
      setPattern(createEmptyPattern(), { undoable: true });
    },
  },
  state.bpm,
);

app.querySelector('[data-slot="controls"]')!.replaceWith(controls.el);
app.querySelector('[data-slot="grid"]')!.replaceWith(grid.el);
grid.render(state.pattern);

// 스페이스바로 재생/정지 (버튼이나 슬라이더에 포커스가 있을 땐 기본 동작 유지)
window.addEventListener('keydown', (e) => {
  if (e.code !== 'Space') return;
  if ((e.target as HTMLElement).closest('button, input')) return;
  e.preventDefault();
  void togglePlay();
});