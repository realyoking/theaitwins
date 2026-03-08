import { motion, AnimatePresence } from 'framer-motion';
import { X, BarChart3, MessageSquare, Zap, TrendingUp } from 'lucide-react';
import { useAppStore } from '@/lib/store';

interface AnalyticsModalProps {
  open: boolean;
  onClose: () => void;
}

const AnalyticsModal = ({ open, onClose }: AnalyticsModalProps) => {
  const { analytics, conversations, streak } = useAppStore();

  const totalConvos = conversations.length;
  const totalMsgs = conversations.reduce((a, c) => a + c.messages.length, 0);
  const totalWords = conversations.reduce((a, c) => a + c.messages.reduce((b, m) => b + (m.text?.split(/\s+/).length || 0), 0), 0);

  const modelData = Object.entries(analytics.modelUsage || {});
  const modeData = Object.entries(analytics.modeUsage || {});
  const dailyData = Object.entries(analytics.dailyMessages || {}).slice(-7);

  const maxDaily = Math.max(...dailyData.map(([, v]) => v), 1);

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
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2"><BarChart3 className="w-5 h-5" /> Analytics</h2>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { label: 'Total Messages', value: totalMsgs, icon: MessageSquare, color: 'text-primary' },
                { label: 'Conversations', value: totalConvos, icon: TrendingUp, color: 'text-primary' },
                { label: 'Credits Used', value: analytics.creditsUsed || 0, icon: Zap, color: 'text-amber-accent' },
                { label: 'Total Words', value: totalWords.toLocaleString(), icon: BarChart3, color: 'text-primary' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="bg-muted p-4 rounded-xl border border-border">
                  <Icon className={`w-4 h-4 ${color} mb-2`} />
                  <div className="text-2xl font-black">{value}</div>
                  <div className="text-[10px] text-muted-foreground font-bold uppercase">{label}</div>
                </div>
              ))}
            </div>

            {/* Streak */}
            <div className="bg-muted p-4 rounded-xl border border-border mb-6 text-center">
              <div className="text-3xl font-black">🔥 {streak}</div>
              <div className="text-[10px] text-muted-foreground font-bold uppercase mt-1">Day Streak</div>
            </div>

            {/* Daily Messages Chart */}
            {dailyData.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xs font-bold uppercase text-muted-foreground mb-3">Last 7 Days</h3>
                <div className="flex items-end gap-1 h-24">
                  {dailyData.map(([date, count]) => (
                    <div key={date} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full bg-primary/20 rounded-t-md relative overflow-hidden" style={{ height: `${(count / maxDaily) * 100}%`, minHeight: '4px' }}>
                        <div className="absolute inset-0 bg-primary rounded-t-md" />
                      </div>
                      <span className="text-[8px] text-muted-foreground">{date.slice(5)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Model Usage */}
            {modelData.length > 0 && (
              <div className="mb-4">
                <h3 className="text-xs font-bold uppercase text-muted-foreground mb-2">Model Usage</h3>
                <div className="space-y-2">
                  {modelData.map(([model, count]) => {
                    const total = modelData.reduce((a, [, v]) => a + v, 0);
                    const pct = total > 0 ? (count / total * 100) : 0;
                    return (
                      <div key={model}>
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="font-bold capitalize">{model}</span>
                          <span className="text-muted-foreground">{count} ({pct.toFixed(0)}%)</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Mode Usage */}
            {modeData.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase text-muted-foreground mb-2">Mode Usage</h3>
                <div className="flex gap-2">
                  {modeData.map(([mode, count]) => (
                    <div key={mode} className="flex-1 bg-muted p-3 rounded-xl border border-border text-center">
                      <div className="text-lg font-black">{count}</div>
                      <div className="text-[9px] text-muted-foreground font-bold uppercase capitalize">{mode}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AnalyticsModal;
