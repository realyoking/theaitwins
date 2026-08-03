import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion } from 'framer-motion';
import { Ghost, Cpu, Skull, Copy, Check, Share2, ThumbsUp, Heart, Laugh, Lightbulb, Pin, Edit3, Trash2, Volume2, VolumeX, RefreshCw, MoreHorizontal, Sparkles, Languages, ListChecks, Play, Loader2, Download, Maximize2, Image as ImageIco, Reply, Wand2 } from 'lucide-react';
import type { ChatMessage, AIModel } from '@/lib/store';
import { useAppStore } from '@/lib/store';
import { detectLanguage, getLanguageLabel, getLanguageColor, runCode, type SupportedLanguage } from '@/lib/code-runner';
import { parseDirectives, stripPartialDirective, downloadImage } from '@/lib/ai-tools';
import { attachToComposer, replyToMessage, downloadUrl } from '@/lib/media';
import AskChoices from './AskChoices';
import { toast } from 'sonner';



interface MessageBubbleProps {
  msg: ChatMessage;
  msgIndex: number;
  userInitial: string;
  model: AIModel;
  onRenderCode?: (code: string) => void;
  onQuickAction?: (action: string, text: string) => void;
}

const REACTION_ICONS = [
  { key: 'like', Icon: ThumbsUp, label: '👍' },
  { key: 'love', Icon: Heart, label: '❤️' },
  { key: 'laugh', Icon: Laugh, label: '😂' },
  { key: 'idea', Icon: Lightbulb, label: '💡' },
  { key: 'fire', Icon: Sparkles, label: '🔥' },
];

const MessageBubble = ({ msg, msgIndex, userInitial, model, onRenderCode, onQuickAction }: MessageBubbleProps) => {
  const isUser = msg.role === 'user';
  const { showTimestamps, compactMode, fontSize, toggleReaction, pinMessage, editMessage, deleteMessage, ttsEnabled, setWallpaper } = useAppStore();
  const [copied, setCopied] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(msg.text || '');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [runningCode, setRunningCode] = useState(false);
  const [codeOutput, setCodeOutput] = useState<string | null>(null);

  const BotIcon = model === 'anson67' ? Ghost : model === 'chester' ? Skull : Cpu;

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.text || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ text: msg.text || '' });
    } else {
      handleCopy();
    }
  };

  const handleTTS = () => {
    if (isSpeaking) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(msg.text || '');
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const handleEdit = () => {
    if (editText.trim() && editText !== msg.text) {
      editMessage(msgIndex, editText.trim());
    }
    setIsEditing(false);
  };

  const textSizeClass = fontSize === 'sm' ? 'text-[13px]' : fontSize === 'lg' ? 'text-[16px]' : 'text-[14px]';
  const wordCount = msg.text?.split(/\s+/).filter(Boolean).length || 0;
  const parsed = parseDirectives(stripPartialDirective(msg.text || ''));


  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={`flex gap-4 w-full ${compactMode ? 'mb-3' : 'mb-6'} ${isUser ? 'flex-row-reverse' : ''} group relative`}
    >
      {/* Pin indicator */}
      {msg.pinned && (
        <div className="absolute -top-2 left-12 text-[9px] bg-amber-accent/20 text-amber-accent px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5">
          <Pin className="w-2.5 h-2.5" /> Pinned
        </div>
      )}

      <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center font-bold text-xs mt-1 shadow-sm border
        ${isUser ? 'bg-muted text-muted-foreground border-border' : 'bg-primary text-primary-foreground border-transparent'}`}>
        {isUser ? userInitial : <BotIcon className="w-3.5 h-3.5" />}
      </div>

      <div className={`flex flex-col max-w-[85%] md:max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
        {msg.replyTo && (
          <div className="mb-1 px-3 py-1.5 rounded-xl bg-muted/60 border-l-2 border-primary text-[11px] text-muted-foreground max-w-full truncate">
            ↩︎ {msg.replyTo}
          </div>
        )}
        {msg.image && isUser && (
          <img src={msg.image} className="max-w-[200px] rounded-xl mb-2 shadow-sm" alt="User upload" />
        )}
        {!isUser && (msg.type === 'image') && (msg.url || msg.image) && (
          <div className="relative group/img w-full max-w-md mb-2">
            <img src={(msg.url || msg.image) as string} className="w-full rounded-2xl border border-border shadow-soft" alt={msg.text || 'AI generated'} />
            <div className="absolute top-2 right-2 flex gap-1 md:opacity-0 group-hover/img:opacity-100 transition-opacity">
              <button onClick={() => window.open((msg.url || msg.image) as string, '_blank')}
                className="p-1.5 rounded-lg bg-background/80 backdrop-blur border border-border hover:bg-card" title="Open full size">
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => { attachToComposer((msg.url || msg.image) as string, 'image'); toast.success('Attached — ask the AI to remix it'); }}
                className="p-1.5 rounded-lg bg-background/80 backdrop-blur border border-border hover:bg-card" title="Remix / reflect this image">
                <Wand2 className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => { setWallpaper((msg.url || msg.image) as string); toast.success('Background updated'); }}
                className="p-1.5 rounded-lg bg-background/80 backdrop-blur border border-border hover:bg-card" title="Use as background">
                <ImageIco className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => downloadImage((msg.url || msg.image) as string, `ai-image-${Date.now()}.png`)}
                className="p-1.5 rounded-lg bg-background/80 backdrop-blur border border-border hover:bg-card" title="Download">
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
        {!isUser && msg.type === 'video' && msg.url && (
          <div className="relative w-full max-w-md mb-2">
            <video src={msg.url} controls loop playsInline className="w-full rounded-2xl border border-border shadow-soft bg-black" />
            <div className="flex gap-1 mt-1">
              <button onClick={() => downloadUrl(msg.url!, `ai-video-${Date.now()}.webm`)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-muted hover:bg-accent text-[10px] font-bold">
                <Download className="w-3 h-3" /> Download
              </button>
              <button onClick={() => { attachToComposer(msg.url!, 'video'); toast.success('Video referenced in composer'); }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-muted hover:bg-accent text-[10px] font-bold">
                <Wand2 className="w-3 h-3" /> Reuse
              </button>
              <button onClick={() => window.open(msg.url!, '_blank')}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-muted hover:bg-accent text-[10px] font-bold">
                <Maximize2 className="w-3 h-3" /> Open
              </button>
            </div>
          </div>
        )}



        {/* Editing mode */}
        {isEditing ? (
          <div className="w-full">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full bg-muted rounded-xl p-3 text-sm outline-none border border-border focus:border-ring resize-none"
              rows={3}
              autoFocus
            />
            <div className="flex gap-2 mt-1">
              <button onClick={handleEdit} className="px-3 py-1 bg-primary text-primary-foreground rounded-lg text-[10px] font-bold">Save</button>
              <button onClick={() => setIsEditing(false)} className="px-3 py-1 bg-muted rounded-lg text-[10px] font-bold">Cancel</button>
            </div>
          </div>
        ) : msg.text ? (
          <div className={`${textSizeClass} leading-relaxed ${isUser
            ? 'bg-chat-user px-4 py-3 rounded-2xl rounded-tr-sm'
            : 'w-full pt-1'}`}>
            {isUser ? (
              <p className="whitespace-pre-wrap">{msg.text}</p>
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none prose-pre:bg-surface-elevated prose-pre:border prose-pre:border-border prose-pre:rounded-xl prose-code:text-xs">
                <ReactMarkdown
                  components={{
                    pre: ({ children, ...props }) => {
                      const codeEl = (children as any)?.props;
                      const codeStr = String(codeEl?.children || '');
                      const langClass = codeEl?.className || '';
                      const langMatch = langClass.match(/language-(\w+)/);
                      const langHint = langMatch ? langMatch[1] : '';
                      const detectedLang = detectLanguage(langHint);

                      const handleRunCode = async () => {
                        if (!detectedLang) return;
                        if (detectedLang === 'react') {
                          onRenderCode?.(codeStr);
                          return;
                        }
                        setRunningCode(true);
                        setCodeOutput(null);
                        try {
                          const result = await runCode(codeStr, detectedLang);
                          setCodeOutput(result.exitCode !== 0 ? `❌ ${result.output || result.stderr}` : result.output || '(no output)');
                        } catch (e: any) {
                          setCodeOutput(`⚠️ ${e.message}`);
                          toast.error(e.message);
                        } finally {
                          setRunningCode(false);
                        }
                      };

                      return (
                        <div className="relative my-3">
                          <div className="flex justify-between items-center bg-surface-elevated px-3 py-1.5 rounded-t-xl border border-border border-b-0">
                            <div className="flex items-center gap-2">
                              {detectedLang && (
                                <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: getLanguageColor(detectedLang) }} />
                              )}
                              <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase">
                                {detectedLang ? getLanguageLabel(detectedLang) : langHint || 'code'}
                              </span>
                            </div>
                            <div className="flex gap-1">
                              <button onClick={() => navigator.clipboard.writeText(codeStr)}
                                className="flex items-center gap-1 px-2 py-1 bg-muted hover:bg-accent rounded text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors">
                                <Copy className="w-3 h-3" /> Copy
                              </button>
                              {detectedLang && (
                                <button onClick={handleRunCode} disabled={runningCode}
                                  className="flex items-center gap-1 px-2 py-1 bg-primary/10 hover:bg-primary/20 text-primary rounded text-[10px] font-bold transition-colors disabled:opacity-50">
                                  {runningCode ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 fill-current" />}
                                  Run
                                </button>
                              )}
                              {onRenderCode && (
                                <button onClick={() => onRenderCode(codeStr)}
                                  className="flex items-center gap-1 px-2 py-1 bg-muted hover:bg-accent rounded text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors">
                                  ▶ Render
                                </button>
                              )}
                            </div>
                          </div>
                          <pre {...props} className="!mt-0 !rounded-t-none">{children}</pre>
                          {codeOutput && (
                            <div className="bg-muted border border-border border-t-0 rounded-b-xl px-3 py-2">
                              <div className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Output</div>
                              <pre className="text-xs font-mono whitespace-pre-wrap text-foreground">{codeOutput}</pre>
                            </div>
                          )}
                        </div>
                      );
                    },
                  }}
                >{parsed.text}</ReactMarkdown>
                {parsed.asks.map((ask, i) => (
                  <AskChoices key={i} ask={ask} onAnswer={(answer) => onQuickAction?.('', answer)} />
                ))}

              </div>
            )}
            {msg.edited && <span className="text-[9px] text-muted-foreground ml-1">(edited)</span>}
          </div>
        ) : null}

        {/* Response time */}
        {msg.responseTime && !isUser && (
          <span className="text-[9px] text-muted-foreground mt-0.5">⚡ {(msg.responseTime / 1000).toFixed(1)}s</span>
        )}

        {/* Reactions */}
        {msg.reactions && msg.reactions.length > 0 && (
          <div className="flex gap-1 mt-1">
            {msg.reactions.map((r, i) => {
              const icon = REACTION_ICONS.find(ri => ri.key === r);
              if (!icon) return (
                <span key={i} className="text-sm bg-muted px-1.5 py-0.5 rounded-full border border-border cursor-pointer hover:scale-110 transition-transform"
                  onClick={() => toggleReaction(msgIndex, r)}>
                  {r}
                </span>
              );
              return (
                <button key={i} onClick={() => toggleReaction(msgIndex, r)}
                  className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20 hover:scale-110 transition-transform text-[11px] font-bold">
                  <icon.Icon className="w-3 h-3" />
                </button>
              );
            })}
          </div>
        )}

        {/* Action bar */}
        <div className={`flex items-center gap-0.5 mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${isUser ? 'flex-row-reverse' : ''}`}>
          <button onClick={handleCopy} className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors" title="Copy">
            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button onClick={handleShare} className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors" title="Share">
            <Share2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleTTS} className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors" title="Read aloud">
            {isSpeaking ? <VolumeX className="w-3.5 h-3.5 text-primary" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          {/* Reaction picker */}
          <div className="relative">
            <button onClick={() => setShowReactions(!showReactions)} className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors" title="React">
              <Heart className="w-3.5 h-3.5" />
            </button>
            {showReactions && (
              <div className="absolute bottom-full mb-1 left-0 flex gap-0.5 bg-card border border-border rounded-full px-2 py-1 shadow-lg z-10">
                {REACTION_ICONS.map(({ key, Icon, label }) => (
                  <button key={key} onClick={() => { toggleReaction(msgIndex, key); setShowReactions(false); }}
                    className="p-1.5 hover:bg-accent rounded-full transition-colors hover:scale-125 text-muted-foreground hover:text-foreground"
                    title={label}>
                    <Icon className="w-4 h-4" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick actions for bot messages */}
          {!isUser && onQuickAction && msg.text && (
            <>
              <button onClick={() => onQuickAction('Summarize this', msg.text!)} className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors" title="Summarize">
                <Sparkles className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => onQuickAction('Translate this to English', msg.text!)} className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors" title="Translate">
                <Languages className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => onQuickAction('Extract action items from', msg.text!)} className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors" title="Extract To-Dos">
                <ListChecks className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {/* More menu */}
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors">
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
            {showMenu && (
              <div className="absolute bottom-full mb-1 right-0 bg-card border border-border rounded-xl shadow-lg py-1 min-w-[120px] z-20">
                <button onClick={() => { pinMessage(msgIndex); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent">
                  <Pin className="w-3 h-3" /> {msg.pinned ? 'Unpin' : 'Pin'}
                </button>
                {isUser && (
                  <button onClick={() => { setIsEditing(true); setEditText(msg.text || ''); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent">
                    <Edit3 className="w-3 h-3" /> Edit
                  </button>
                )}
                {!isUser && (
                  <button onClick={() => {
                    // Regenerate: resend previous user message
                    const state = useAppStore.getState();
                    const convo = state.conversations.find(c => c.id === state.activeConversationId);
                    if (convo) {
                      const prevUserMsg = convo.messages.slice(0, msgIndex).reverse().find(m => m.role === 'user');
                      if (prevUserMsg?.text && onQuickAction) onQuickAction('', prevUserMsg.text);
                    }
                    setShowMenu(false);
                  }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent">
                    <RefreshCw className="w-3 h-3" /> Regenerate
                  </button>
                )}
                <div className="border-t border-border my-1" />
                <button onClick={() => { deleteMessage(msgIndex); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-destructive hover:bg-accent">
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            )}
          </div>

          {showTimestamps && msg.timestamp && (
            <span className="text-[9px] text-muted-foreground ml-1">
              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          {!isUser && <span className="text-[9px] text-muted-foreground ml-1">{wordCount}w</span>}
        </div>
      </div>
    </motion.div>
  );
};

export default MessageBubble;
