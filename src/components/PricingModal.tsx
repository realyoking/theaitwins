import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Zap, Coins } from 'lucide-react';

interface PricingModalProps {
  open: boolean;
  onClose: () => void;
  onCheckout: (type: 'plan' | 'credits', value: string | number, cost: string) => void;
}

const PricingModal = ({ open, onClose, onCheckout }: PricingModalProps) => {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 bg-background/50 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={onClose}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card w-full max-w-4xl rounded-3xl shadow-2xl border border-border overflow-hidden flex flex-col md:flex-row relative max-h-[90vh] overflow-y-auto custom-scrollbar"
          >
            <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-muted rounded-full hover:scale-110 transition-transform z-20">
              <X className="w-4 h-4" />
            </button>

            {/* Free */}
            <div className="flex-1 p-8 border-b md:border-b-0 md:border-r border-border flex flex-col">
              <h3 className="text-xl font-bold mb-2">Free Tier</h3>
              <div className="text-3xl font-black mb-6">$0</div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center gap-3 text-sm"><Check className="w-4 h-4" /> 100 Credits Daily</li>
                <li className="flex items-center gap-3 text-sm"><Check className="w-4 h-4" /> Standard & Fast Modes</li>
                <li className="flex items-center gap-3 text-sm text-muted-foreground"><X className="w-4 h-4" /> No Image Generation</li>
              </ul>
              <button onClick={onClose} className="w-full py-3 bg-muted rounded-xl font-bold text-sm mt-auto">Current Plan</button>
            </div>

            {/* Pro */}
            <div className="flex-1 p-8 bg-surface-sunken border-b md:border-b-0 md:border-r border-border flex flex-col relative">
              <div className="absolute top-0 inset-x-0 h-1 bg-amber-accent" />
              <div className="inline-block px-3 py-1 bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest rounded-full mb-4 w-max">Most Popular</div>
              <h3 className="text-xl font-bold mb-2 flex items-center gap-2">Studio Pro</h3>
              <div className="text-3xl font-black mb-6">$19<span className="text-sm text-muted-foreground">/mo</span></div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center gap-3 text-sm"><Check className="w-4 h-4 text-amber-accent" /> Infinite Credits</li>
                <li className="flex items-center gap-3 text-sm"><Check className="w-4 h-4 text-amber-accent" /> Pro & Thinking Modes</li>
                <li className="flex items-center gap-3 text-sm"><Check className="w-4 h-4 text-amber-accent" /> Image Generation (/draw)</li>
              </ul>
              <button onClick={() => onCheckout('plan', 'pro', '$19.00')}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm shadow-lg mt-auto">
                Upgrade to Pro
              </button>
            </div>

            {/* Credits */}
            <div className="flex-1 p-8 bg-muted flex flex-col">
              <h3 className="text-xl font-bold mb-2 flex items-center gap-2">Buy Credits <Coins className="w-5 h-5 text-amber-accent" /></h3>
              <p className="text-xs text-muted-foreground mb-6">Need more power without a sub?</p>
              <div className="space-y-3 flex-1">
                {[{ amount: 500, price: '$4.99' }, { amount: 2000, price: '$14.99', bonus: '+200 Bonus' }].map((p) => (
                  <button key={p.amount} onClick={() => onCheckout('credits', p.amount, p.price)}
                    className="w-full flex items-center justify-between p-3 bg-card rounded-xl hover:ring-2 ring-ring/30 transition-all text-left border border-border">
                    <div>
                      <div className="font-bold text-sm">{p.amount} Credits</div>
                      {p.bonus ? <div className="text-[10px] text-amber-accent font-bold">{p.bonus}</div> : <div className="text-[10px] text-muted-foreground">One-time purchase</div>}
                    </div>
                    <div className="font-bold">{p.price}</div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default PricingModal;
