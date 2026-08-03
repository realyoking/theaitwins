/**
 * Skills — reusable instruction packs the user can toggle on.
 * They are injected into the system prompt of every AI surface.
 */

export interface Skill {
  id: string;
  name: string;
  description: string;
  instructions: string;
  enabled: boolean;
  builtin?: boolean;
}

const KEY = 'tat_skills';

export const BUILTIN_SKILLS: Skill[] = [
  {
    id: 'web-designer',
    name: 'Web Designer',
    description: 'Produces polished, responsive single-file websites.',
    instructions:
      'When building UI, use a strong type scale, generous spacing, a single accent color and subtle motion. Always responsive. Never use lorem ipsum — write real copy.',
    enabled: true,
    builtin: true,
  },
  {
    id: 'visual-director',
    name: 'Visual Director',
    description: 'Generates matching imagery/video for what it builds.',
    instructions:
      'When a page or story needs visuals, call the generate_image (or generate_video) tool first, then embed the resulting ASSET:<id> reference into the HTML you write.',
    enabled: true,
    builtin: true,
  },
  {
    id: 'teacher',
    name: 'Explainer',
    description: 'Explains concepts step by step with examples.',
    instructions: 'Explain in short numbered steps, give one concrete example, and end with a 1-line summary.',
    enabled: false,
    builtin: true,
  },
];

export function getSkills(): Skill[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved: Skill[] = JSON.parse(raw);
      const merged = [...saved];
      for (const b of BUILTIN_SKILLS) if (!merged.some((s) => s.id === b.id)) merged.push(b);
      return merged;
    }
  } catch {}
  return [...BUILTIN_SKILLS];
}

export function saveSkills(skills: Skill[]) {
  localStorage.setItem(KEY, JSON.stringify(skills));
  window.dispatchEvent(new Event('tat:skills-changed'));
}

export function upsertSkill(skill: Skill) {
  const list = getSkills();
  const i = list.findIndex((s) => s.id === skill.id);
  if (i === -1) list.unshift(skill);
  else list[i] = skill;
  saveSkills(list);
}

export function deleteSkill(id: string) {
  saveSkills(getSkills().filter((s) => s.id !== id));
}

export function skillsPromptBlock(): string {
  const active = getSkills().filter((s) => s.enabled);
  if (!active.length) return '';
  return `\n## ACTIVE SKILLS\n${active
    .map((s) => `### ${s.name}\n${s.instructions}`)
    .join('\n')}\n`;
}
