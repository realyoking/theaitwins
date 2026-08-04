/** Global progress bus — drives the top progress bar with a live % + label. */
export interface ProgressState {
  active: boolean;
  percent: number;
  label: string;
}

const EVT = 'tat:progress';

let current: ProgressState = { active: false, percent: 0, label: '' };

export function getProgress() {
  return current;
}

function emit() {
  window.dispatchEvent(new CustomEvent(EVT, { detail: { ...current } }));
}

export function startProgress(label = 'Working…') {
  current = { active: true, percent: 2, label };
  emit();
}

export function setProgress(percent: number, label?: string) {
  current = {
    active: true,
    percent: Math.max(0, Math.min(100, Math.round(percent))),
    label: label ?? current.label,
  };
  emit();
}

/** Smoothly creeps toward `cap` while a step of unknown length runs. */
export function creepProgress(cap = 90, stepMs = 400) {
  const t = setInterval(() => {
    if (!current.active) return clearInterval(t);
    if (current.percent >= cap) return;
    setProgress(current.percent + Math.max(0.5, (cap - current.percent) * 0.08));
  }, stepMs);
  return () => clearInterval(t);
}

export function endProgress(label = 'Done') {
  current = { active: true, percent: 100, label };
  emit();
  setTimeout(() => {
    current = { active: false, percent: 0, label: '' };
    emit();
  }, 700);
}

export function onProgress(cb: (s: ProgressState) => void) {
  const h = (e: Event) => cb((e as CustomEvent).detail as ProgressState);
  window.addEventListener(EVT, h);
  return () => window.removeEventListener(EVT, h);
}
