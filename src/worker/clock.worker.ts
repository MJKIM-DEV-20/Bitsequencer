/**
 * 일정한 간격으로 "tick"만 보내는 타이머.
 * 탭이 백그라운드로 가면 메인 스레드 타이머는 느려지지만 Worker 타이머는 영향을 덜 받는다.
 */
type Message = { type: 'start'; interval: number } | { type: 'stop' };

let id: number | undefined;

self.onmessage = (e: MessageEvent<Message>) => {
  clearInterval(id);
  id = undefined;
  if (e.data.type === 'start') {
    id = setInterval(() => self.postMessage('tick'), e.data.interval);
  }
};