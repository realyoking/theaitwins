import { useState, useEffect } from 'react';
import { ChevronDown, Cloud, Cpu, Download, Check, Loader2, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { WEBLLM_MODELS, loadWebLLMModel, onWebLLMStatus, isWebGPUSupported, getLoadedModelId, type WebLLMStatus } from '@/lib/webllm';

export type AIProvider = 'lovable' | 'webllm';

export interface SelectedModel {
  provider: AIProvider;
  modelId: string;
  displayName: string;
}

// Lovable AI models available through the gateway
const LOVABLE_MODELS = [
  { id: 'google/gemini-3-flash-preview', name: 'Gemini 3 Flash', desc: 'Fast & balanced (default)' },
  { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', desc: 'Good multimodal + reasoning' },
  { id: 'google/gemini-2.5-flash-lite', name: 'Gemini 2.5 Lite', desc: 'Fastest, cheapest' },
  { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', desc: 'Best quality, expensive' },
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

// Global state for the selected model
let _selectedModel: SelectedModel = loadSelectedModel();
let _listeners: (() => void)[] = [];

export function getSelectedModel(): SelectedModel {
  return _selectedModel;
}

export function setSelectedModel(m: SelectedModel) {
  _selectedModel = m;
  saveSelectedModel(m);
  _listeners.forEach(l => l());
}

export function useSelectedModel(): SelectedModel {
  const [model, setModel] = useState(_selectedModel);
  useEffect(() => {
    const listener = () => setModel({ ..._selectedModel });
    _listeners.push(listener);
    return () => { _listeners = _listeners.filter(l => l !== listener); };
  }, []);
  return model;
}

const ModelPicker = () => {
  const [open, setOpen] = useState(false);
  const selected = useSelectedModel();
  const [webllmStatus, setWebllmStatus] = useState<WebLLMStatus>('idle');
  const [webllmProgress, setWebllmProgress] = useState('');
  const [loadingModelId, setLoadingModelId] = useState<string | null>(null);
  const webgpuSupported = isWebGPUSupported();

  useEffect(() => {
    return onWebLLMStatus((status, progress) => {
      setWebllmStatus(status);
      if (progress) setWebllmProgress(progress);
      if (status === 'ready') setLoadingModelId(null);
      if (status === 'error') setLoadingModelId(null);
    });
  }, []);

  const handleSelectLovable = (model: typeof LOVABLE_MODELS[0]) => {
    setSelectedModel({ provider: 'lovable', modelId: model.id, displayName: model.name });
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

  const providerIcon = selected.provider === 'lovable'
    ? <Cloud className="w-3.5 h-3.5" />
    : <Cpu className="w-3.5 h-3.5" />;

  const statusBadge = selected.provider === 'webllm' && webllmStatus === 'loading' ? (
    <Loader2 className="w-3 h-3 animate-spin text-amber-500" />
  ) : selected.provider === 'webllm' && webllmStatus === 'ready' ? (
    <Check className="w-3 h-3 text-emerald-500" />
  ) : null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold rounded-lg bg-muted border border-border hover:bg-card transition-colors text-foreground"
      >
        {providerIcon}
        <span className="max-w-[80px] truncate">{selected.displayName}</span>
        {statusBadge}
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full left-0 mb-2 w-72 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden"
            >
              {/* Loading indicator */}
              {loadingModelId && (
                <div className="px-3 py-2 bg-amber-500/10 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                    <span className="text-[10px] text-amber-500 font-medium truncate">{webllmProgress || 'Downloading model...'}</span>
                  </div>
                </div>
              )}

              {/* Cloud Models */}
              <div className="p-2">
                <div className="flex items-center gap-1.5 px-2 mb-1">
                  <Cloud className="w-3 h-3 text-primary" />
                  <span className="text-[9px] font-bold text-muted-foreground uppercase">Lovable AI (Cloud)</span>
                  <Wifi className="w-3 h-3 text-muted-foreground ml-auto" />
                </div>
                {LOVABLE_MODELS.map(model => (
                  <button
                    key={model.id}
                    onClick={() => handleSelectLovable(model)}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                      selected.provider === 'lovable' && selected.modelId === model.id
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-muted text-foreground'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold">{model.name}</div>
                      <div className="text-[9px] text-muted-foreground">{model.desc}</div>
                    </div>
                    {selected.provider === 'lovable' && selected.modelId === model.id && (
                      <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                    )}
                  </button>
                ))}
              </div>

              <div className="border-t border-border" />

              {/* WebLLM Models */}
              <div className="p-2">
                <div className="flex items-center gap-1.5 px-2 mb-1">
                  <Cpu className="w-3 h-3 text-primary" />
                  <span className="text-[9px] font-bold text-muted-foreground uppercase">WebLLM (On-Device)</span>
                  <WifiOff className="w-3 h-3 text-muted-foreground ml-auto" />
                </div>

                {!webgpuSupported && (
                  <div className="flex items-center gap-2 px-2.5 py-2 text-[10px] text-amber-500 bg-amber-500/10 rounded-lg mb-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>WebGPU not supported in this browser. Try Chrome 113+.</span>
                  </div>
                )}

                {WEBLLM_MODELS.map(model => {
                  const isLoaded = getLoadedModelId() === model.id;
                  const isLoading = loadingModelId === model.id;
                  return (
                    <button
                      key={model.id}
                      onClick={() => handleSelectWebLLM(model)}
                      disabled={!webgpuSupported || isLoading}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors disabled:opacity-50 ${
                        selected.provider === 'webllm' && selected.modelId === model.id
                          ? 'bg-primary/10 text-primary'
                          : 'hover:bg-muted text-foreground'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold">{model.name}</span>
                          <span className="text-[8px] text-muted-foreground bg-muted px-1 py-0.5 rounded">{model.size}</span>
                        </div>
                        <div className="text-[9px] text-muted-foreground">{model.description}</div>
                      </div>
                      {isLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500 shrink-0" />
                      ) : isLoaded ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      ) : (
                        <Download className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ModelPicker;
