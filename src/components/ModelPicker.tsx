import { useState, useEffect } from 'react';
import { ChevronDown, Cloud, Cpu, Download, Check, Loader2, AlertTriangle, KeyRound, RefreshCw, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { WEBLLM_MODELS, loadWebLLMModel, onWebLLMStatus, isWebGPUSupported, getLoadedModelId, type WebLLMStatus } from '@/lib/webllm';
import { getByokConfig, saveByokConfig, fetchByokModels } from '@/lib/byok';

export type AIProvider = 'lovable' | 'webllm' | 'byok';

export interface SelectedModel {
  provider: AIProvider;
  modelId: string;
  displayName: string;
}

const LOVABLE_MODELS = [
  { id: 'google/gemini-3-flash-preview', name: 'Gemini 3 Flash', desc: 'Fast & balanced (default)' },
  { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', desc: 'Good multimodal + reasoning' },
  { id: 'google/gemini-2.5-flash-lite', name: 'Gemini 2.5 Lite', desc: 'Fastest, cheapest' },
  { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', desc: 'Best quality' },
  { id: 'openai/gpt-5-nano', name: 'GPT-5 Nano', desc: 'Fast, cost-effective' },
  { id: 'openai/gpt-5-mini', name: 'GPT-5 Mini', desc: 'Strong all-rounder' },
  { id: 'openai/gpt-5', name: 'GPT-5', desc: 'Maximum quality' },
];

const MODEL_STORE_KEY = 'tat_selected_model';

function loadSelectedModel(): SelectedModel {
  try {
    const saved = localStorage.getItem(MODEL_STORE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return { provider: 'lovable', modelId: 'google/gemini-3-flash-preview', displayName: 'Gemini 3 Flash' };
}

function saveSelectedModel(m: SelectedModel) {
  localStorage.setItem(MODEL_STORE_KEY, JSON.stringify(m));
}

let _selectedModel: SelectedModel = loadSelectedModel();
let _listeners: (() => void)[] = [];

export function getSelectedModel(): SelectedModel {
  return _selectedModel;
}

export function setSelectedModel(m: SelectedModel) {
  _selectedModel = m;
  saveSelectedModel(m);
  _listeners.forEach((l) => l());
}

export function useSelectedModel(): SelectedModel {
  const [model, setModel] = useState(_selectedModel);
  useEffect(() => {
    const listener = () => setModel({ ..._selectedModel });
    _listeners.push(listener);
    return () => { _listeners = _listeners.filter((l) => l !== listener); };
  }, []);
  return model;
}

type Tab = 'cloud' | 'byok' | 'local';

const ModelPicker = () => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('cloud');
  const selected = useSelectedModel();
  const [webllmStatus, setWebllmStatus] = useState<WebLLMStatus>('idle');
  const [webllmProgress, setWebllmProgress] = useState('');
  const [loadingModelId, setLoadingModelId] = useState<string | null>(null);
  const webgpuSupported = isWebGPUSupported();

  // BYOK state
  const [cfg, setCfg] = useState(getByokConfig());
  const [fetching, setFetching] = useState(false);
  const [byokError, setByokError] = useState('');
  const [filter, setFilter] = useState('');

  useEffect(() => {
    return onWebLLMStatus((status, progress) => {
      setWebllmStatus(status);
      if (progress) setWebllmProgress(progress);
      if (status === 'ready' || status === 'error') setLoadingModelId(null);
    });
  }, []);

  useEffect(() => {
    if (open) setTab(selected.provider === 'byok' ? 'byok' : selected.provider === 'webllm' ? 'local' : 'cloud');
  }, [open]);

  const handleFetchModels = async () => {
    setFetching(true);
    setByokError('');
    try {
      const models = await fetchByokModels(cfg.baseUrl, cfg.apiKey);
      const next = saveByokConfig({ baseUrl: cfg.baseUrl, apiKey: cfg.apiKey, models });
      setCfg(next);
      if (!models.length) setByokError('No models returned by this endpoint.');
    } catch (e: any) {
      setByokError(e.message);
    } finally {
      setFetching(false);
    }
  };

  const handleSelectByok = (id: string) => {
    setCfg(saveByokConfig({ selectedModel: id }));
    setSelectedModel({ provider: 'byok', modelId: id, displayName: id.split('/').pop()!.slice(0, 22) });
    setOpen(false);
  };

  const handleSelectWebLLM = async (model: typeof WEBLLM_MODELS[0]) => {
    setSelectedModel({ provider: 'webllm', modelId: model.id, displayName: model.name });
    setOpen(false);
    if (getLoadedModelId() !== model.id) {
      setLoadingModelId(model.id);
      await loadWebLLMModel(model.id);
    }
  };

  const providerIcon =
    selected.provider === 'lovable' ? <Cloud className="w-3 h-3" />
    : selected.provider === 'byok' ? <KeyRound className="w-3 h-3" />
    : <Cpu className="w-3 h-3" />;

  const tabBtn = (id: Tab, label: string, Icon: any) => (
    <button
      onClick={() => setTab(id)}
      className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-bold rounded-lg transition-colors ${
        tab === id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      <Icon className="w-3 h-3" /> {label}
    </button>
  );

  const byokModels = cfg.models.filter((m) => m.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded-full bg-muted/70 border border-border/60 hover:bg-card transition-colors text-foreground max-w-[130px]"
      >
        {providerIcon}
        <span className="max-w-[64px] md:max-w-[110px] truncate">{selected.displayName}</span>
        <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full left-0 mb-2 w-[min(20rem,calc(100vw-1.5rem))] max-h-[65vh] overflow-y-auto custom-scrollbar bg-popover/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl z-50"
            >
              <div className="sticky top-0 bg-popover/95 backdrop-blur-xl p-2 border-b border-border/60">
                <div className="flex gap-1 bg-muted p-0.5 rounded-xl">
                  {tabBtn('cloud', 'Cloud', Cloud)}
                  {tabBtn('byok', 'BYOK', KeyRound)}
                  {tabBtn('local', 'Local', Cpu)}
                </div>
              </div>

              {loadingModelId && (
                <div className="px-3 py-2 bg-amber-500/10 border-b border-border flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                  <span className="text-[10px] text-amber-500 font-medium truncate">{webllmProgress || 'Downloading model...'}</span>
                </div>
              )}

              {tab === 'cloud' && (
                <div className="p-2">
                  {LOVABLE_MODELS.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => { setSelectedModel({ provider: 'lovable', modelId: model.id, displayName: model.name }); setOpen(false); }}
                      className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left transition-colors ${
                        selected.provider === 'lovable' && selected.modelId === model.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-foreground'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold truncate">{model.name}</div>
                        <div className="text-[9px] text-muted-foreground truncate">{model.desc}</div>
                      </div>
                      {selected.provider === 'lovable' && selected.modelId === model.id && <Check className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  ))}
                </div>
              )}

              {tab === 'byok' && (
                <div className="p-2 space-y-2">
                  <div className="flex items-center gap-1.5 px-1">
                    <Sparkles className="w-3 h-3 text-primary" />
                    <span className="text-[9px] font-bold text-muted-foreground uppercase">OpenAI-compatible endpoint</span>
                  </div>
                  <input
                    value={cfg.baseUrl}
                    onChange={(e) => setCfg(saveByokConfig({ baseUrl: e.target.value }))}
                    placeholder="https://api.openai.com/v1"
                    className="w-full px-2.5 py-2 text-[11px] bg-muted rounded-xl border border-border outline-none focus:ring-1 ring-ring/40"
                  />
                  <input
                    value={cfg.apiKey}
                    onChange={(e) => setCfg(saveByokConfig({ apiKey: e.target.value }))}
                    type="password"
                    placeholder="sk-..."
                    className="w-full px-2.5 py-2 text-[11px] bg-muted rounded-xl border border-border outline-none focus:ring-1 ring-ring/40"
                  />
                  <input
                    value={cfg.imageModel}
                    onChange={(e) => setCfg(saveByokConfig({ imageModel: e.target.value }))}
                    placeholder="Image model (e.g. gpt-image-1)"
                    className="w-full px-2.5 py-2 text-[11px] bg-muted rounded-xl border border-border outline-none focus:ring-1 ring-ring/40"
                  />

                  <button
                    onClick={handleFetchModels}
                    disabled={fetching || !cfg.baseUrl.trim()}
                    className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold bg-primary text-primary-foreground rounded-xl disabled:opacity-40"
                  >
                    {fetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    Fetch models
                  </button>

                  {byokError && (
                    <div className="flex items-start gap-1.5 px-2 py-1.5 text-[10px] text-destructive bg-destructive/10 rounded-lg">
                      <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" /> <span className="break-all">{byokError}</span>
                    </div>
                  )}

                  {cfg.models.length > 0 && (
                    <>
                      <input
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        placeholder={`Search ${cfg.models.length} models...`}
                        className="w-full px-2.5 py-1.5 text-[11px] bg-muted rounded-xl border border-border outline-none"
                      />
                      <div className="max-h-52 overflow-y-auto custom-scrollbar space-y-0.5">
                        {byokModels.map((id) => (
                          <button
                            key={id}
                            onClick={() => handleSelectByok(id)}
                            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                              selected.provider === 'byok' && selected.modelId === id ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-foreground'
                            }`}
                          >
                            <span className="text-[11px] font-medium truncate flex-1">{id}</span>
                            {selected.provider === 'byok' && selected.modelId === id && <Check className="w-3.5 h-3.5 shrink-0" />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  <p className="text-[9px] text-muted-foreground px-1">Key is stored only in this browser.</p>
                </div>
              )}

              {tab === 'local' && (
                <div className="p-2">
                  {!webgpuSupported && (
                    <div className="flex items-center gap-2 px-2.5 py-2 text-[10px] text-amber-500 bg-amber-500/10 rounded-lg mb-1">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>WebGPU not supported. Try Chrome 113+.</span>
                    </div>
                  )}
                  {WEBLLM_MODELS.map((model) => {
                    const isLoaded = getLoadedModelId() === model.id;
                    const isLoading = loadingModelId === model.id;
                    return (
                      <button
                        key={model.id}
                        onClick={() => handleSelectWebLLM(model)}
                        disabled={!webgpuSupported || isLoading}
                        className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left transition-colors disabled:opacity-50 ${
                          selected.provider === 'webllm' && selected.modelId === model.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-foreground'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold truncate">{model.name}</span>
                            <span className="text-[8px] text-muted-foreground bg-muted px-1 py-0.5 rounded shrink-0">{model.size}</span>
                          </div>
                          <div className="text-[9px] text-muted-foreground truncate">{model.description}</div>
                        </div>
                        {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500 shrink-0" />
                          : isLoaded ? <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          : <Download className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ModelPicker;
