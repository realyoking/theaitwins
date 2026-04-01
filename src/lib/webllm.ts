/**
 * WebLLM Integration — runs AI models directly in the browser via WebGPU
 * Uses dynamic import to avoid bloating the main bundle
 */

export type WebLLMStatus = 'idle' | 'loading' | 'ready' | 'error' | 'generating';

export interface WebLLMModel {
  id: string;
  name: string;
  size: string;
  description: string;
}

export const WEBLLM_MODELS: WebLLMModel[] = [
  { id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC', name: 'Llama 3.2 1B', size: '~700MB', description: 'Fast & lightweight, good for quick chats' },
  { id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC', name: 'Llama 3.2 3B', size: '~1.8GB', description: 'Better quality, still runs in browser' },
  { id: 'SmolLM2-1.7B-Instruct-q4f16_1-MLC', name: 'SmolLM2 1.7B', size: '~1GB', description: 'Compact & capable' },
  { id: 'Phi-3.5-mini-instruct-q4f16_1-MLC', name: 'Phi 3.5 Mini', size: '~2.2GB', description: 'Microsoft reasoning model' },
  { id: 'gemma-2-2b-it-q4f16_1-MLC', name: 'Gemma 2 2B', size: '~1.3GB', description: 'Google compact model' },
  { id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC', name: 'Qwen 2.5 1.5B', size: '~900MB', description: 'Alibaba multilingual model' },
];

let engine: any = null;
let currentModelId: string | null = null;
let statusListeners: ((status: WebLLMStatus, progress?: string) => void)[] = [];

export function onWebLLMStatus(listener: (status: WebLLMStatus, progress?: string) => void) {
  statusListeners.push(listener);
  return () => { statusListeners = statusListeners.filter(l => l !== listener); };
}

function notifyStatus(status: WebLLMStatus, progress?: string) {
  statusListeners.forEach(l => l(status, progress));
}

export function isWebGPUSupported(): boolean {
  return 'gpu' in navigator;
}

async function getWebLLM() {
  return await import('@mlc-ai/web-llm');
}

export async function loadWebLLMModel(modelId: string): Promise<boolean> {
  if (!isWebGPUSupported()) {
    notifyStatus('error', 'WebGPU is not supported in this browser');
    return false;
  }

  if (currentModelId === modelId && engine) {
    notifyStatus('ready');
    return true;
  }

  try {
    notifyStatus('loading', 'Initializing...');
    const webllm = await getWebLLM();

    if (engine) {
      await engine.unload();
    }

    engine = new webllm.MLCEngine();
    engine.setInitProgressCallback((report: any) => {
      notifyStatus('loading', report.text);
    });

    await engine.reload(modelId);
    currentModelId = modelId;
    notifyStatus('ready');
    return true;
  } catch (err: any) {
    console.error('WebLLM load error:', err);
    notifyStatus('error', err.message || 'Failed to load model');
    engine = null;
    currentModelId = null;
    return false;
  }
}

export async function chatWebLLM(
  messages: { role: string; content: string }[],
  onDelta: (text: string) => void,
  onDone: () => void,
  signal?: AbortSignal
) {
  if (!engine) throw new Error('No WebLLM model loaded');
  notifyStatus('generating');

  try {
    const reply = await engine.chat.completions.create({
      messages: messages as any,
      stream: true,
      temperature: 0.7,
      max_tokens: 2048,
    });

    let fullText = '';
    for await (const chunk of reply as any) {
      if (signal?.aborted) break;
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) {
        fullText += delta;
        onDelta(delta);
      }
    }

    notifyStatus('ready');
    onDone();
    return fullText;
  } catch (err: any) {
    notifyStatus('ready');
    if (err.name === 'AbortError') {
      onDone();
      return '';
    }
    throw err;
  }
}

export function getLoadedModelId(): string | null {
  return currentModelId;
}

export async function unloadWebLLM() {
  if (engine) {
    await engine.unload();
    engine = null;
    currentModelId = null;
    notifyStatus('idle');
  }
}
