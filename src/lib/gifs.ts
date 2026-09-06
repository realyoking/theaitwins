/**
 * GIF / sticker search — Tenor + GIPHY public endpoints, called straight by URL
 * from the browser. No connector, no self-hosted proxy.
 */

export type GifMedia = 'gifs' | 'stickers' | 'clips' | 'emojis';

export interface GifItem {
  id: string;
  title: string;
  url: string;
  preview: string;
  source?: 'tenor' | 'giphy';
}

const RECENT_KEY = 'tat_recent_gifs';
const FAV_KEY = 'tat_fav_gifs';
const PROVIDER_KEY = 'tat_gif_provider';

/** Public/anonymous demo keys published by the providers themselves. */
const TENOR_KEY = 'LIVDSRZULELA';
const GIPHY_KEY = 'dc6zaTOxFJmzC';

export type GifProvider = 'tenor' | 'giphy';

export const getGifProvider = (): GifProvider =>
  (localStorage.getItem(PROVIDER_KEY) as GifProvider) || 'tenor';

export const setGifProvider = (p: GifProvider) => {
  localStorage.setItem(PROVIDER_KEY, p);
  cache.clear();
};

const cache = new Map<string, GifItem[]>();

async function tenor(q: string, media: GifMedia, page: number): Promise<GifItem[]> {
  const params = new URLSearchParams({
    key: TENOR_KEY,
    q: q || 'trending',
    limit: '30',
    pos: String((page - 1) * 30),
    media_filter: 'minimal',
    contentfilter: 'medium',
  });
  if (media === 'stickers') params.set('searchfilter', 'sticker');
  const path = q.trim() ? 'search' : 'trending';
  const r = await fetch(`https://g.tenor.com/v1/${path}?${params}`);
  if (!r.ok) throw new Error(`Tenor ${r.status}`);
  const d = await r.json();
  return (d.results || []).map((g: any) => {
    const m = g.media?.[0] || {};
    return {
      id: String(g.id),
      title: g.title || g.content_description || q,
      url: m.gif?.url || m.mediumgif?.url || m.tinygif?.url,
      preview: m.tinygif?.url || m.nanogif?.url || m.gif?.url,
      source: 'tenor' as const,
    };
  }).filter((g: GifItem) => !!g.url);
}

async function giphy(q: string, media: GifMedia, page: number): Promise<GifItem[]> {
  const kind = media === 'stickers' ? 'stickers' : 'gifs';
  const path = q.trim() ? 'search' : 'trending';
  const params = new URLSearchParams({
    api_key: GIPHY_KEY,
    limit: '30',
    offset: String((page - 1) * 30),
    rating: 'pg-13',
  });
  if (q.trim()) params.set('q', q);
  const r = await fetch(`https://api.giphy.com/v1/${kind}/${path}?${params}`);
  if (!r.ok) throw new Error(`GIPHY ${r.status}`);
  const d = await r.json();
  return (d.data || []).map((g: any) => ({
    id: String(g.id),
    title: g.title || q,
    url: g.images?.downsized_medium?.url || g.images?.original?.url,
    preview: g.images?.fixed_width_small?.url || g.images?.preview_gif?.url || g.images?.original?.url,
    source: 'giphy' as const,
  })).filter((g: GifItem) => !!g.url);
}

export async function searchGifs(q: string, media: GifMedia = 'gifs', page = 1): Promise<GifItem[]> {
  const provider = getGifProvider();
  const key = `${provider}:${media}:${q.trim().toLowerCase()}:${page}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const order: GifProvider[] = provider === 'tenor' ? ['tenor', 'giphy'] : ['giphy', 'tenor'];
  let lastErr: any;
  for (const p of order) {
    try {
      const items = p === 'tenor' ? await tenor(q, media, page) : await giphy(q, media, page);
      if (items.length) {
        cache.set(key, items);
        return items;
      }
    } catch (e) {
      lastErr = e;
    }
  }
  if (lastErr) throw new Error(`GIF search failed: ${lastErr.message || lastErr}`);
  return [];
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
