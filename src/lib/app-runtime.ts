/**
 * Runtime shim injected into playground previews so generated apps can:
 *  - call an AI model with the user's own key   → `await ai.chat("...")`
 *  - use a fake, persistent database            → `db.insert('todos', {...})`
 * Everything runs inside the sandboxed iframe; data lives in memory + is
 * mirrored back to the parent so it survives reloads of the preview.
 */

export interface AppKeyConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

const KEY = 'tat_playground_appkey';
const DB_KEY = 'tat_playground_fakedb';

export function getAppKey(): AppKeyConfig {
  try {
    return { baseUrl: 'https://api.openai.com/v1', apiKey: '', model: 'gpt-4o-mini', ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return { baseUrl: 'https://api.openai.com/v1', apiKey: '', model: 'gpt-4o-mini' };
  }
}

export function saveAppKey(cfg: AppKeyConfig) {
  localStorage.setItem(KEY, JSON.stringify(cfg));
}

export function getFakeDb(projectId: string): Record<string, any[]> {
  try {
    return JSON.parse(localStorage.getItem(`${DB_KEY}_${projectId}`) || '{}');
  } catch {
    return {};
  }
}

export function saveFakeDb(projectId: string, data: Record<string, any[]>) {
  localStorage.setItem(`${DB_KEY}_${projectId}`, JSON.stringify(data));
}

export function clearFakeDb(projectId: string) {
  localStorage.removeItem(`${DB_KEY}_${projectId}`);
}

/** Builds the <script> that is injected at the top of every preview document. */
export function buildRuntimeScript(cfg: AppKeyConfig, seed: Record<string, any[]>) {
  return `<script>(function(){
  var CFG = ${JSON.stringify(cfg)};
  var DATA = ${JSON.stringify(seed)};
  function sync(){ try { parent.postMessage({ __tatDb: DATA }, '*'); } catch(e){} }
  function uid(){ return 'r' + Math.random().toString(36).slice(2,10); }
  function match(row, where){
    if (!where) return true;
    return Object.keys(where).every(function(k){ return row[k] === where[k]; });
  }
  window.db = {
    table: function(n){ if(!DATA[n]) DATA[n] = []; return DATA[n]; },
    all: function(n){ return JSON.parse(JSON.stringify(window.db.table(n))); },
    select: function(n, where){ return window.db.table(n).filter(function(r){ return match(r, where); }); },
    insert: function(n, row){
      var r = Object.assign({ id: uid(), created_at: new Date().toISOString() }, row);
      window.db.table(n).push(r); sync(); return r;
    },
    update: function(n, id, patch){
      var t = window.db.table(n);
      for (var i=0;i<t.length;i++){ if (t[i].id === id) { Object.assign(t[i], patch); sync(); return t[i]; } }
      return null;
    },
    remove: function(n, id){
      DATA[n] = window.db.table(n).filter(function(r){ return r.id !== id; }); sync(); return true;
    },
    clear: function(n){ DATA[n] = []; sync(); },
    dump: function(){ return JSON.parse(JSON.stringify(DATA)); }
  };
  window.ai = {
    configured: !!CFG.apiKey,
    chat: async function(prompt, opts){
      opts = opts || {};
      if (!CFG.apiKey) throw new Error('No API key configured. Open App Settings in the playground and add your key.');
      var res = await fetch(CFG.baseUrl.replace(/\\/$/, '') + '/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + CFG.apiKey },
        body: JSON.stringify({
          model: opts.model || CFG.model,
          messages: typeof prompt === 'string'
            ? [{ role: 'system', content: opts.system || 'You are a helpful assistant.' }, { role: 'user', content: prompt }]
            : prompt,
          temperature: opts.temperature ?? 0.7
        })
      });
      if (!res.ok) throw new Error('AI error ' + res.status + ': ' + (await res.text()).slice(0, 200));
      var json = await res.json();
      return json.choices?.[0]?.message?.content || '';
    }
  };
})();<\/script>`;
}

/** Returns the full srcDoc for the preview iframe with the runtime injected. */
export function withRuntime(html: string, cfg: AppKeyConfig, seed: Record<string, any[]>) {
  const script = buildRuntimeScript(cfg, seed);
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, (m) => m + script);
  if (/<html[^>]*>/i.test(html)) return html.replace(/<html[^>]*>/i, (m) => m + script);
  return script + html;
}

export const RUNTIME_PROMPT = `
## APP RUNTIME AVAILABLE IN THE PREVIEW
The preview injects two globals you can use directly in your JavaScript — never re-implement them:

- \`db\` — a fake but persistent database (simulated backend):
  \`db.insert('todos', {text:'hi', done:false})\`, \`db.all('todos')\`, \`db.select('todos',{done:false})\`,
  \`db.update('todos', id, {done:true})\`, \`db.remove('todos', id)\`, \`db.clear('todos')\`.
  Rows automatically get \`id\` and \`created_at\`.
- \`ai\` — the user's own AI key (BYOK, OpenAI-compatible):
  \`const reply = await ai.chat('summarize this', { system: '...' })\`. Check \`ai.configured\` first and
  show a friendly "add your API key in App Settings" message when it is false.

When the user asks for an "AI app", build a real one with \`ai.chat\`, and persist state with \`db\`.
`;
