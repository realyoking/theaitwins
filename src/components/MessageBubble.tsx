import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion } from 'framer-motion';
import { Ghost, Cpu, Skull, Copy, Check, RotateCcw, Share2 } from 'lucide-react';
import type { ChatMessage, AIModel } from '@/lib/store';
import { useAppStore } from '@/lib/store';

interface MessageBubbleProps {
  msg: ChatMessage;
  userInitial: string;
  model: AIModel;
  onRenderCode?: (code: string) => void;
}

const MessageBubble = ({ msg, userInitial, model, onRenderCode }: MessageBubbleProps) => {
  const isUser = msg.role === 'user';
  const { showTimestamps, compactMode, fontSize } = useAppStore();
  const [copied, setCopied] = useState(false);

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

  const textSizeClass = fontSize === 'sm' ? 'text-[13px]' : fontSize === 'lg' ? 'text-[16px]' : 'text-[14px]';

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={`flex gap-4 w-full ${compactMode ? 'mb-3' : 'mb-6'} ${isUser ? 'flex-row-reverse' : ''} group`}
    >
      <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center font-bold text-xs mt-1 shadow-sm border
        ${isUser ? 'bg-muted text-muted-foreground border-border' : 'bg-primary text-primary-foreground border-transparent'}`}>
        {isUser ? userInitial : <BotIcon className="w-3.5 h-3.5" />}
      </div>

      <div className={`flex flex-col max-w-[85%] md:max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
        {msg.image && isUser && (
          <img src={msg.image} className="max-w-[200px] rounded-xl mb-2 shadow-sm" alt="User upload" />
        )}
        {msg.type === 'image' && !isUser && msg.url && (
          <img src={msg.url} className="w-full max-w-md rounded-2xl border border-border" alt="AI generated" />
        )}
        {msg.text && (
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
                      const code = codeEl?.children || '';
                      return (
                        <div className="relative my-3">
                          <div className="flex justify-between items-center bg-surface-elevated px-3 py-1.5 rounded-t-xl border border-border border-b-0">
                            <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase">code</span>
                            <div className="flex gap-1">
                              <button onClick={() => { navigator.clipboard.writeText(String(code)); }}
                                className="flex items-center gap-1 px-2 py-1 bg-muted hover:bg-accent rounded text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors">
                                📋 Copy
                              </button>
                              {onRenderCode && (
                                <button onClick={() => onRenderCode(String(code))}
                                  className="flex items-center gap-1 px-2 py-1 bg-muted hover:bg-accent rounded text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors">
                                  ▶ Render
                                </button>
                              )}
                            </div>
                          </div>
                          <pre {...props} className="!mt-0 !rounded-t-none">{children}</pre>
                        </div>
                      );
                    },
                  }}
                >{msg.text}</ReactMarkdown>
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className={`flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${isUser ? 'flex-row-reverse' : ''}`}>
          <button onClick={handleCopy} className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors" title="Copy">
            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button onClick={handleShare} className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors" title="Share">
            <Share2 className="w-3.5 h-3.5" />
          </button>
          {showTimestamps && msg.timestamp && (
            <span className="text-[9px] text-muted-foreground ml-2">
              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default MessageBubble;
