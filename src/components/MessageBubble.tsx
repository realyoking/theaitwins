import ReactMarkdown from 'react-markdown';
import { motion } from 'framer-motion';
import { Ghost, Cpu } from 'lucide-react';
import type { ChatMessage, AIModel } from '@/lib/store';

interface MessageBubbleProps {
  msg: ChatMessage;
  userInitial: string;
  model: AIModel;
  onRenderCode?: (code: string) => void;
}

const MessageBubble = ({ msg, userInitial, model, onRenderCode }: MessageBubbleProps) => {
  const isUser = msg.role === 'user';
  const BotIcon = model === 'anson67' ? Ghost : Cpu;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={`flex gap-4 w-full mb-6 ${isUser ? 'flex-row-reverse' : ''}`}
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
          <div className={`text-[14px] leading-relaxed ${isUser
            ? 'bg-chat-user px-4 py-3 rounded-2xl rounded-tr-sm'
            : 'w-full pt-1'}`}>
            {isUser ? (
              <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
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
                            {onRenderCode && (
                              <button onClick={() => onRenderCode(String(code))}
                                className="flex items-center gap-1 px-2 py-1 bg-muted hover:bg-accent rounded text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors">
                                ▶ Render
                              </button>
                            )}
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
      </div>
    </motion.div>
  );
};

export default MessageBubble;
