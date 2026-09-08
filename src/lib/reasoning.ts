/** Codex-style reasoning effort levels. */

export type Effort = 'none' | 'low' | 'medium' | 'high' | 'super' | 'ultra';

export interface EffortDef {
  id: Effort;
  label: string;
  tier: string;
  cost: number;
  hint: string;
  instruction: string;
  thinkingLabel: string;
}

export const EFFORTS: EffortDef[] = [
  {
    id: 'none',
    thinkingLabel: 'Replying…',
    label: 'Instant',
    tier: 'None',
    cost: 1,
    hint: 'No deliberation. Straight to the answer.',
    instruction: 'REASONING EFFORT: NONE. Answer immediately in as few words as possible. Never show working.',
  },
  {
    id: 'low',
    thinkingLabel: 'Thinking…',
    label: 'Sol',
    tier: 'Low',
    cost: 1,
    hint: 'Light thinking, fast replies.',
    instruction: 'REASONING EFFORT: LOW. Think briefly, then answer concisely.',
  },
  {
    id: 'medium',
    thinkingLabel: 'Reasoning…',
    label: 'Terra',
    tier: 'Medium',
    cost: 2,
    hint: 'Balanced reasoning.',
    instruction: 'REASONING EFFORT: MEDIUM. Reason step by step internally, then give a clear, well-structured answer.',
  },
  {
    id: 'high',
    thinkingLabel: 'Thinking deeply…',
    label: 'Nova',
    tier: 'High',
    cost: 4,
    hint: 'Deep, careful reasoning.',
    instruction:
      'REASONING EFFORT: HIGH. Reason carefully and thoroughly, consider edge cases and alternatives, then give a detailed answer.',
  },
  {
    id: 'super',
    thinkingLabel: 'Analysing deeply…',
    label: 'Quasar',
    tier: 'Super high',
    cost: 6,
    hint: 'Exhaustive analysis and self-checking.',
    instruction:
      'REASONING EFFORT: SUPER HIGH. Explore multiple approaches, self-critique your draft answer, fix any flaws, then deliver an expert-level response.',
  },
  {
    id: 'ultra',
    thinkingLabel: 'Reasoning at maximum depth…',
    label: 'Singularity',
    tier: 'Ultra',
    cost: 10,
    hint: 'Maximum depth. Slowest, best quality.',
    instruction:
      'REASONING EFFORT: ULTRA. Take maximum care: decompose the problem, evaluate several solutions, verify facts and math, self-review twice, and produce the most complete, precise, production-quality answer you can.',
  },
];

export const effortDef = (id: Effort): EffortDef => EFFORTS.find((e) => e.id === id) || EFFORTS[1];
export const effortIndex = (id: Effort) => Math.max(0, EFFORTS.findIndex((e) => e.id === id));
