import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Puzzle, ToggleLeft, ToggleRight, Code, Play, Trash2, Plus, Calculator, Globe, Clock, Type, Hash, Palette } from 'lucide-react';

export type Plugin = {
  id: string;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
  type: 'builtin' | 'custom';
  code?: string;
};

const BUILTIN_PLUGINS: Plugin[] = [
  { id: 'calculator', name: 'Calculator', description: 'Evaluate math expressions in chat. Type /calc 2+2', icon: '🧮', enabled: false, type: 'builtin' },
  { id: 'translator', name: 'Quick Translate', description: 'Translate text inline. Type /translate [lang] [text]', icon: '🌐', enabled: false, type: 'builtin' },
  { id: 'timestamp', name: 'Timestamp', description: 'Insert current date/time. Type /now', icon: '🕐', enabled: false, type: 'builtin' },
  { id: 'wordcount', name: 'Word Counter', description: 'Count words in selection. Type /count [text]', icon: '📊', enabled: false, type: 'builtin' },
  { id: 'lorem', name: 'Lorem Generator', description: 'Generate placeholder text. Type /lorem [words]', icon: '📝', enabled: false, type: 'builtin' },
  { id: 'color', name: 'Color Picker', description: 'Convert colors between formats. Type /color #ff0000', icon: '🎨', enabled: false, type: 'builtin' },
  { id: 'uuid', name: 'UUID Generator', description: 'Generate unique IDs. Type /uuid', icon: '🔑', enabled: false, type: 'builtin' },
  { id: 'base64', name: 'Base64 Encoder', description: 'Encode/decode base64. Type /base64 [text]', icon: '🔐', enabled: false, type: 'builtin' },
];

// Execute builtin plugin commands
export const executePlugin = (command: string, plugins: Plugin[]): string | null => {
  const parts = command.trim().split(/\s+/);
  const cmd = parts[0]?.toLowerCase();
  const args = parts.slice(1).join(' ');

  const enabled = plugins.filter(p => p.enabled);
  const enabledIds = new Set(enabled.map(p => p.id));

  if (cmd === '/calc' && enabledIds.has('calculator')) {
    try { return `🧮 Result: ${Function('"use strict"; return (' + args.replace(/[^0-9+\-*/.()%^ ]/g, '') + ')')()}`; } catch { return '🧮 Error: Invalid expression'; }
  }
  if (cmd === '/now' && enabledIds.has('timestamp')) {
    return `🕐 ${new Date().toLocaleString()}`;
  }
  if (cmd === '/count' && enabledIds.has('wordcount')) {
    const words = args.trim().split(/\s+/).filter(Boolean).length;
    const chars = args.length;
    return `📊 ${words} words, ${chars} characters`;
  }
  if (cmd === '/lorem' && enabledIds.has('lorem')) {
    const n = parseInt(args) || 50;
    const lorem = 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua'.split(' ');
    const words = Array.from({ length: n }, (_, i) => lorem[i % lorem.length]).join(' ');
    return `📝 ${words}`;
  }
  if (cmd === '/uuid' && enabledIds.has('uuid')) {
    return `🔑 ${crypto.randomUUID()}`;
  }
  if (cmd === '/base64' && enabledIds.has('base64')) {
    try { return `🔐 Encoded: ${btoa(args)}`; } catch { return '🔐 Error encoding'; }
  }
  if (cmd === '/color' && enabledIds.has('color')) {
    const hex = args.trim();
    if (/^#[0-9a-f]{6}$/i.test(hex)) {
      const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
      return `🎨 HEX: ${hex} | RGB: rgb(${r},${g},${b}) | HSL: (use converter)`;
    }
    return '🎨 Provide a valid hex color like #ff0000';
  }

  // Custom plugins
  for (const plugin of enabled.filter(p => p.type === 'custom' && p.code)) {
    try {
      const fn = new Function('command', 'args', plugin.code!);
      const result = fn(cmd, args);
      if (result) return String(result);
    } catch { /* skip */ }
  }

  return null;
};

interface PluginSystemProps {
  open: boolean;
  onClose: () => void;
  plugins: Plugin[];
  setPlugins: (plugins: Plugin[]) => void;
}

const PluginSystem = ({ open, onClose, plugins, setPlugins }: PluginSystemProps) => {
  const [tab, setTab] = useState<'builtin' | 'custom'>('builtin');
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCode, setNewCode] = useState('// command: the slash command\n// args: everything after the command\n// return a string to display, or null to skip\nif (command === "/mycommand") {\n  return "Hello from my plugin! Args: " + args;\n}\nreturn null;');
  const [testResult, setTestResult] = useState('');

  const togglePlugin = (id: string) => {
    setPlugins(plugins.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p));
  };

  const addCustomPlugin = () => {
    if (!newName.trim()) return;
    const plugin: Plugin = {
      id: Date.now().toString(),
      name: newName.trim(),
      description: newDesc.trim() || 'Custom plugin',
      icon: '🧩',
      enabled: true,
      type: 'custom',
      code: newCode,
    };
    setPlugins([...plugins, plugin]);
    setNewName('');
    setNewDesc('');
    setNewCode('');
  };

  const deletePlugin = (id: string) => {
    setPlugins(plugins.filter(p => p.id !== id));
  };

  const testCode = () => {
    try {
      const fn = new Function('command', 'args', newCode);
      const result = fn('/test', 'hello world');
      setTestResult(result ? String(result) : 'No output (returned null)');
    } catch (e: any) {
      setTestResult(`Error: ${e.message}`);
    }
  };

  const builtinPlugins = plugins.filter(p => p.type === 'builtin');
  const customPlugins = plugins.filter(p => p.type === 'custom');

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 bg-background/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-card p-6 rounded-3xl shadow-2xl border border-border relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button onClick={onClose} className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground bg-muted rounded-full">
              <X className="w-4 h-4" />
            </button>
            <h2 className="text-lg font-bold mb-1 flex items-center gap-2"><Puzzle className="w-5 h-5" /> Plugins</h2>
            <p className="text-xs text-muted-foreground mb-5">Extend your chat with slash commands</p>

            <div className="flex gap-1 bg-muted p-1 rounded-lg mb-5">
              <button onClick={() => setTab('builtin')} className={`flex-1 px-3 py-1.5 text-[11px] font-bold rounded-md transition-all ${tab === 'builtin' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>
                Built-in
              </button>
              <button onClick={() => setTab('custom')} className={`flex-1 px-3 py-1.5 text-[11px] font-bold rounded-md transition-all ${tab === 'custom' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>
                Custom
              </button>
            </div>

            {tab === 'builtin' && (
              <div className="space-y-2">
                {builtinPlugins.map(plugin => (
                  <div key={plugin.id} className="flex items-center gap-3 p-3 bg-muted rounded-xl">
                    <span className="text-xl">{plugin.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold">{plugin.name}</div>
                      <div className="text-[10px] text-muted-foreground">{plugin.description}</div>
                    </div>
                    <button onClick={() => togglePlugin(plugin.id)} className="shrink-0">
                      {plugin.enabled
                        ? <ToggleRight className="w-6 h-6 text-primary" />
                        : <ToggleLeft className="w-6 h-6 text-muted-foreground" />}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {tab === 'custom' && (
              <div className="space-y-4">
                {customPlugins.length > 0 && (
                  <div className="space-y-2">
                    {customPlugins.map(plugin => (
                      <div key={plugin.id} className="flex items-center gap-3 p-3 bg-muted rounded-xl">
                        <span className="text-xl">{plugin.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold">{plugin.name}</div>
                          <div className="text-[10px] text-muted-foreground">{plugin.description}</div>
                        </div>
                        <button onClick={() => togglePlugin(plugin.id)} className="shrink-0">
                          {plugin.enabled ? <ToggleRight className="w-6 h-6 text-primary" /> : <ToggleLeft className="w-6 h-6 text-muted-foreground" />}
                        </button>
                        <button onClick={() => deletePlugin(plugin.id)} className="shrink-0 text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-t border-border pt-4">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-3 flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Create Plugin
                  </span>
                  <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Plugin name"
                    className="w-full px-3 py-2 bg-muted rounded-lg text-xs outline-none border border-transparent focus:border-muted-foreground/30 mb-2" />
                  <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Description (optional)"
                    className="w-full px-3 py-2 bg-muted rounded-lg text-xs outline-none border border-transparent focus:border-muted-foreground/30 mb-2" />
                  <textarea value={newCode} onChange={(e) => setNewCode(e.target.value)} rows={6}
                    className="w-full px-3 py-2 bg-muted rounded-lg text-xs outline-none border border-transparent focus:border-muted-foreground/30 font-mono resize-none custom-scrollbar mb-2" />

                  <div className="flex gap-2 mb-2">
                    <button onClick={testCode} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-muted rounded-lg text-xs font-bold hover:bg-accent transition-colors">
                      <Play className="w-3 h-3" /> Test
                    </button>
                    <button onClick={addCustomPlugin} className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold">
                      <Plus className="w-3 h-3 inline mr-1" /> Add Plugin
                    </button>
                  </div>

                  {testResult && (
                    <div className="px-3 py-2 bg-muted/50 rounded-lg text-xs font-mono border border-border">
                      {testResult}
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default PluginSystem;
