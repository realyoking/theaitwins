/**
 * Agent activity bus — drives the "real person working" feel:
 * step list, live % and cursor targets (find source, grab image, place it…).
 */
import { startProgress, setProgress, endProgress } from './progress';

export type ActKind = 'think' | 'search' | 'image' | 'write' | 'place' | 'render' | 'done';

export interface AgentAct {
  id: string;
  kind: ActKind;
  label: string;
  status: 'pending' | 'active' | 'done' | 'error';
  /** cursor target in % of the canvas */
  x: number;
  y: number;
}

export interface AgentState {
  running: boolean;
  percent: number;
  acts: AgentAct[];
  cursor: { x: number; y: number; label: string };
}

const EVT = 'tat:agent';
let state: AgentState = { running: false, percent: 0, acts: [], cursor: { x: 30, y: 30, label: 'AI Agent' } };

function emit() {
  window.dispatchEvent(new CustomEvent(EVT, { detail: { ...state, acts: state.acts.map((a) => ({ ...a })) } }));
}

export function getAgentState() {
  return state;
}

export function onAgent(cb: (s: AgentState) => void) {
  const h = (e: Event) => cb((e as CustomEvent).detail as AgentState);
  window.addEventListener(EVT, h);
  return () => window.removeEventListener(EVT, h);
}

const spot = () => ({ x: 12 + Math.random() * 72, y: 14 + Math.random() * 62 });

export function planActs(steps: { kind: ActKind; label: string }[]): AgentAct[] {
  return steps.map((s, i) => ({ id: `a${i}`, ...s, status: 'pending' as const, ...spot() }));
}

export function startAgent(acts: AgentAct[], title = 'Agent working…') {
  state = { running: true, percent: 1, acts, cursor: { x: 20, y: 20, label: title } };
  startProgress(title);
  emit();
}

export function actStart(id: string, label?: string) {
  state.acts = state.acts.map((a) => (a.id === id ? { ...a, status: 'active', label: label ?? a.label } : a));
  const a = state.acts.find((x) => x.id === id);
  if (a) state.cursor = { x: a.x, y: a.y, label: a.label };
  const idx = state.acts.findIndex((x) => x.id === id);
  state.percent = Math.round(((idx + 0.35) / state.acts.length) * 100);
  setProgress(state.percent, a?.label);
  emit();
}

export function actProgress(pct: number, label?: string) {
  state.percent = Math.max(state.percent, Math.min(99, Math.round(pct)));
  state.cursor = { ...spot(), label: label ?? state.cursor.label };
  setProgress(state.percent, label);
  emit();
}

export function actDone(id: string) {
  state.acts = state.acts.map((a) => (a.id === id ? { ...a, status: 'done' } : a));
  const idx = state.acts.findIndex((x) => x.id === id);
  state.percent = Math.round(((idx + 1) / state.acts.length) * 100);
  setProgress(state.percent);
  emit();
}

export function actError(id: string, msg: string) {
  state.acts = state.acts.map((a) => (a.id === id ? { ...a, status: 'error', label: `${a.label} — ${msg}` } : a));
  emit();
}

export function endAgent(label = 'Done') {
  state = { ...state, running: false, percent: 100 };
  endProgress(label);
  emit();
}

/** Runs one labelled step with automatic status + progress handling. */
export async function step<T>(id: string, label: string, fn: (p: (pct: number, l?: string) => void) => Promise<T>) {
  actStart(id, label);
  try {
    const r = await fn((pct, l) => actProgress(pct, l));
    actDone(id);
    return r;
  } catch (e: any) {
    actError(id, e.message || 'failed');
    throw e;
  }
}
