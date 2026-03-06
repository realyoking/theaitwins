import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard, Lock, ShieldCheck, Smartphone, Wallet, Banknote } from 'lucide-react';

interface CheckoutModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  cost: string;
  onSuccess: () => void;
}

const methods = [
  { id: 'card', label: 'Card', icon: CreditCard },
  { id: 'paypal', label: 'PayPal', icon: Wallet },
  { id: 'apple', label: 'Apple Pay', icon: Smartphone },
  { id: 'google', label: 'Google Pay', icon: Smartphone },
  { id: 'crypto', label: 'Crypto', icon: Banknote },
  { id: 'alipay', label: 'Alipay', icon: Wallet },
] as const;

type Method = typeof methods[number]['id'];

const CheckoutModal = ({ open, onClose, title, cost, onSuccess }: CheckoutModalProps) => {
  const [method, setMethod] = useState<Method>('card');
  const [processing, setProcessing] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      onSuccess();
      onClose();
    }, 1500);
  };

  const inputClass = "w-full mt-1 px-3 py-3 bg-muted rounded-xl outline-none border border-transparent focus:border-muted-foreground/30 text-sm";

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 bg-background/60 backdrop-blur-md z-[60] flex items-center justify-center p-4" onClick={onClose}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card w-full max-w-md rounded-3xl shadow-2xl border border-border overflow-hidden relative max-h-[90vh] overflow-y-auto custom-scrollbar"
          >
            <div className="p-6 border-b border-border flex justify-between items-center bg-surface-sunken">
              <div>
                <h3 className="text-lg font-bold">{title}</h3>
                <p className="text-xs text-muted-foreground">Total: <span className="font-black text-foreground">{cost}</span></p>
              </div>
              <button onClick={onClose} className="p-2 bg-muted rounded-full hover:scale-110 transition-transform">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-3 gap-2">
                {methods.map((m) => (
                  <button key={m.id} type="button" onClick={() => setMethod(m.id)}
                    className={`p-2.5 rounded-xl flex flex-col items-center gap-1.5 transition-all border text-center ${method === m.id
                      ? 'ring-2 ring-ring bg-muted border-transparent'
                      : 'border-border hover:bg-muted/50'}`}>
                    <m.icon className="w-4 h-4" />
                    <span className="text-[9px] font-bold">{m.label}</span>
                  </button>
                ))}
              </div>

              {method === 'card' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Card Number</label>
                    <input required placeholder="0000 0000 0000 0000" className={inputClass + ' font-mono tracking-widest'} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Expiry</label>
                      <input required placeholder="MM/YY" className={inputClass} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">CVC</label>
                      <input required placeholder="123" className={inputClass} />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Name on Card</label>
                    <input required placeholder="John Doe" className={inputClass} />
                  </div>
                </div>
              )}

              {method === 'paypal' && (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground mb-4">You will be redirected to PayPal to complete payment.</p>
                </div>
              )}

              {method === 'apple' && (
                <div className="text-center py-6">
                  <Smartphone className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Confirm with Apple Pay on your device.</p>
                </div>
              )}

              {method === 'google' && (
                <div className="text-center py-6">
                  <Smartphone className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Confirm with Google Pay on your device.</p>
                </div>
              )}

              {method === 'crypto' && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">Send payment to the following address:</p>
                  <div className="bg-muted p-3 rounded-xl font-mono text-xs break-all border border-border">
                    0x1234...abcd (ETH/USDC)
                  </div>
                </div>
              )}

              {method === 'alipay' && (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground">Scan the QR code with Alipay to pay.</p>
                  <div className="w-32 h-32 mx-auto mt-4 bg-muted rounded-xl border border-border flex items-center justify-center text-muted-foreground text-xs">
                    QR Code
                  </div>
                </div>
              )}

              <button type="submit" disabled={processing}
                className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold shadow-xl hover:opacity-90 transition-all flex justify-center items-center gap-2 disabled:opacity-50">
                {processing ? 'Processing...' : <><span>Pay {cost}</span> <Lock className="w-4 h-4" /></>}
              </button>
              <p className="text-[9px] text-center text-muted-foreground mt-2 flex items-center justify-center gap-1">
                Secured by Stripe <ShieldCheck className="w-3 h-3" />
              </p>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CheckoutModal;
