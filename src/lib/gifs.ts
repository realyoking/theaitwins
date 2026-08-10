/**
 * GIF / sticker / clip search — powered by the KLIPY media API through
 * the `gif-search` edge function (never call the provider from the browser).
 */

export type GifMedia = 'gifs' | 'stickers' | 'clips' | 'emojis';

export interface GifItem {
  id: string;
  title: string;
  url: string;
  preview: string;
}

const RECENT_KEY = 'tat_recent_gifs';
const FAV_KEY = 'tat_fav_gifs';
const CUSTOMER_KEY = 'tat_gif_customer';

function customerId(): string {
  let id = localStorage.getItem(CUSTOMER_KEY);
  if (!id) {
    id = `c${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    localStorage.setItem(CUSTOMER_KEY, id);
  }
  return id;
}

const cache = new Map<string, GifItem[]>();

export async function searchGifs(
  q: string,
  media: GifMedia = 'gifs',
  page = 1,
): Promise<GifItem[]> {
  const key = `${media}:${q.trim().toLowerCase()}:${page}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gif-search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ q, media, page, customerId: customerId() }),
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data?.error || `GIF search failed (${resp.status})`);
  const items: GifItem[] = data.items || [];
  cache.set(key, items);
  return items;
}

/** Best single GIF for a query — used by the AI `send_gif` tool. */
export async function pickGif(q: string, media: GifMedia = 'gifs'): Promise<GifItem> {
  const items = await searchGifs(q, media);
  if (!items.length) throw new Error(`No GIF found for "${q}"`);
  return items[Math.floor(Math.random() * Math.min(5, items.length))];
}

/* ── recents & favourites ─────────────────────────────────────── */

function read(key: string): GifItem[] {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
}

export const recentGifs = () => read(RECENT_KEY);
export const favoriteGifs = () => read(FAV_KEY);

export function rememberGif(item: GifItem) {
  const next = [item, ...recentGifs().filter((g) => g.id !== item.id)].slice(0, 24);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

export function toggleFavoriteGif(item: GifItem) {
  const list = favoriteGifs();
  const exists = list.some((g) => g.id === item.id);
  const next = exists ? list.filter((g) => g.id !== item.id) : [item, ...list].slice(0, 48);
  localStorage.setItem(FAV_KEY, JSON.stringify(next));
  return !exists;
}

export const isFavoriteGif = (id: string) => favoriteGifs().some((g) => g.id === id);

export const GIF_SUGGESTIONS = [
  'lol', 'happy', 'thank you', 'wow', 'cat', 'dance', 'facepalm',
  'good job', 'sad', 'lets go', 'confused', 'mind blown',
];
