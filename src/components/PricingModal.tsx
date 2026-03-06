import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Zap, Coins, Crown, Rocket } from 'lucide-react';

interface PricingModalProps {
  open: boolean;
  onClose: () => void;
  onCheckout: (type: 'plan' | 'credits', value: string | number, cost: string) => void;
}

const PricingModal = ({ open, onClose, onCheckout }: PricingModalProps) => {
  const [customCredits, setCustomCredits] = useState(100);
  const pricePerCredit = 0.008;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 bg-background/50 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={onClose}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card w-full max-w-5xl rounded-3xl shadow-2xl border border-border overflow-hidden relative max-h-[90vh] overflow-y-auto custom-scrollbar"
          >
            <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-muted rounded-full hover:scale-110 transition-transform z-20">
              <X className="w-4 h-4" />
            </button>

            <div className="p-8 text-center border-b border-border">
              <h2 className="text-2xl font-black mb-2">Choose Your Plan</h2>
              <p className="text-sm text-muted-foreground">Power up your AI experience</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-border">
              {/* Free */}
              <div className="p-6 flex flex-col">
                <h3 className="text-lg font-bold mb-1">Free</h3>
                <div className="text-3xl font-black mb-4">$0</div>
                <ul className="space-y-3 mb-6 flex-1 text-sm">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4" /> 100 Credits/Day</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4" /> Fast Mode</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4" /> 3 AI Models</li>
                  <li className="flex items-center gap-2 text-muted-foreground"><X className="w-4 h-4" /> No Image Gen</li>
                </ul>
                <button onClick={onClose} className="w-full py-2.5 bg-muted rounded-xl font-bold text-sm">Current</button>
              </div>

              {/* Plus */}
              <div className="p-6 flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-bold">Plus</h3>
                  <Zap className="w-4 h-4 text-amber-accent" />
                </div>
                <div className="text-3xl font-black mb-4">$9<span className="text-sm text-muted-foreground">/mo</span></div>
                <ul className="space-y-3 mb-6 flex-1 text-sm">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-accent" /> 500 Credits/Day</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-accent" /> All Modes</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-accent" /> 3 AI Models</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-accent" /> Priority Speed</li>
                </ul>
                <button onClick={() => onCheckout('plan', 'plus', '$9.00')}
                  className="w-full py-2.5 bg-muted hover:bg-accent rounded-xl font-bold text-sm transition-colors">
                  Upgrade
                </button>
              </div>

              {/* Pro */}
              <div className="p-6 flex flex-col relative bg-surface-sunken">
                <div className="absolute top-0 inset-x-0 h-1 bg-amber-accent" />
                <div className="inline-block px-3 py-0.5 bg-primary text-primary-foreground text-[9px] font-black uppercase tracking-widest rounded-full mb-2 w-max">Popular</div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-bold">Pro</h3>
                  <Crown className="w-4 h-4 text-amber-accent" />
                </div>
                <div className="text-3xl font-black mb-4">$19<span className="text-sm text-muted-foreground">/mo</span></div>
                <ul className="space-y-3 mb-6 flex-1 text-sm">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-accent" /> ∞ Credits</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-accent" /> All Modes</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-accent" /> Image Generation</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-accent" /> Custom Prompts</li>
                </ul>
                <button onClick={() => onCheckout('plan', 'pro', '$19.00')}
                  className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm shadow-lg">
                  Upgrade to Pro
                </button>
              </div>

              {/* Enterprise */}
              <div className="p-6 flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-bold">Enterprise</h3>
                  <Rocket className="w-4 h-4 text-amber-accent" />
                </div>
                <div className="text-3xl font-black mb-4">$49<span className="text-sm text-muted-foreground">/mo</span></div>
                <ul className="space-y-3 mb-6 flex-1 text-sm">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-accent" /> ∞ Everything</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-accent" /> API Access</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-accent" /> Team Sharing</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-accent" /> Priority Support</li>
                </ul>
                <button onClick={() => onCheckout('plan', 'enterprise', '$49.00')}
                  className="w-full py-2.5 bg-muted hover:bg-accent rounded-xl font-bold text-sm transition-colors">
                  Contact Sales
                </button>
              </div>
            </div>

            {/* Custom Credits */}
            <div className="p-6 border-t border-border">
              <div className="flex items-center gap-2 mb-4">
                <Coins className="w-5 h-5 text-amber-accent" />
                <h3 className="text-lg font-bold">Buy Credits</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  {[
                    { amount: 200, price: '$1.49' },
                    { amount: 500, price: '$3.49' },
                    { amount: 1000, price: '$6.99', bonus: '+100 Bonus' },
                    { amount: 2000, price: '$12.99', bonus: '+300 Bonus' },
                    { amount: 5000, price: '$29.99', bonus: '+1000 Bonus' },
                  ].map((p) => (
                    <button key={p.amount} onClick={() => onCheckout('credits', p.amount, p.price)}
                      className="w-full flex items-center justify-between p-3 bg-muted rounded-xl hover:ring-2 ring-ring/30 transition-all text-left border border-border">
                      <div>
                        <div className="font-bold text-sm">{p.amount} Credits</div>
                        {p.bonus ? <div className="text-[10px] text-amber-accent font-bold">{p.bonus}</div> : <div className="text-[10px] text-muted-foreground">One-time</div>}
                      </div>
                      <div className="font-bold">{p.price}</div>
                    </button>
                  ))}
                </div>

                {/* Custom amount */}
                <div className="bg-muted p-4 rounded-xl border border-border">
                  <h4 className="text-sm font-bold mb-3">Custom Amount</h4>
                  <input type="range" min={50} max={10000} step={50} value={customCredits}
                    onChange={(e) => setCustomCredits(Number(e.target.value))}
                    className="w-full mb-3 accent-primary" />
                  <div className="flex justify-between mb-4">
                    <span className="text-2xl font-black">{customCredits}</span>
                    <span className="text-lg font-bold">${(customCredits * pricePerCredit).toFixed(2)}</span>
                  </div>
                  <button onClick={() => onCheckout('credits', customCredits, `$${(customCredits * pricePerCredit).toFixed(2)}`)}
                    className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm shadow-md">
                    Buy {customCredits} Credits
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default PricingModal;
