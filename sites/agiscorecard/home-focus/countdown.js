// This clock marks an observation window, never an asserted AGI arrival date.
const clock = document.querySelector('[data-countdown-target]');
if (clock) {
  const target = Date.parse(clock.dataset.countdownTarget);
  const zh = clock.dataset.countdownLang === 'zh';
  const pause = clock.querySelector('#cd-pause');
  const timer = clock.querySelector('[role="timer"]');
  let paused = false;
  function update() {
    if (paused || document.hidden) return;
    const seconds = Math.max(0, Math.ceil((target - Date.now()) / 1000));
    const values = [Math.floor(seconds / 86400), Math.floor(seconds % 86400 / 3600), Math.floor(seconds % 3600 / 60), seconds % 60];
    ['days', 'hours', 'min', 'sec'].forEach((key, i) => {
      clock.querySelector('#cd-' + key).textContent = i ? String(values[i]).padStart(2, '0') : String(values[i]);
    });
    if (seconds === 0) {
      clock.querySelector('.focus-clock-date').textContent = zh ? '2027 年观察窗口已开启。请查看最新证据。' : 'The 2027 observation window has opened. Check the latest evidence.';
      timer.setAttribute('aria-label', zh ? '2027 年观察窗口已开启' : 'The 2027 observation window has opened');
      pause.hidden = true;
    }
  }
  pause.hidden = false;
  pause.addEventListener('click', () => {
    paused = !paused;
    pause.setAttribute('aria-pressed', String(paused));
    pause.textContent = paused ? (zh ? '继续计时' : 'Resume clock') : (zh ? '暂停计时' : 'Pause clock');
    update();
  });
  document.addEventListener('visibilitychange', update);
  update();
  setInterval(update, 1000);
}
