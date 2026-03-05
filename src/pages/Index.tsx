import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import Onboarding from '@/components/Onboarding';
import Sidebar from '@/components/Sidebar';
import ChatArea from '@/components/ChatArea';
import CodeCanvas from '@/components/CodeCanvas';
import SettingsModal from '@/components/SettingsModal';
import PricingModal from '@/components/PricingModal';
import CheckoutModal from '@/components/CheckoutModal';

const Index = () => {
  const { user, theme, checkDailyReset } = useAppStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [checkout, setCheckout] = useState<{ open: boolean; title: string; cost: string; type: 'plan' | 'credits'; value: string | number }>({
    open: false, title: '', cost: '', type: 'plan', value: ''
  });

  useEffect(() => {
    document.documentElement.className = theme;
    checkDailyReset();
  }, []);

  const handleCheckout = (type: 'plan' | 'credits', value: string | number, cost: string) => {
    setPricingOpen(false);
    setCheckout({ open: true, title: type === 'plan' ? 'Upgrade Plan' : 'Buy Credits', cost, type, value });
  };

  const handleCheckoutSuccess = () => {
    const store = useAppStore.getState();
    if (checkout.type === 'plan') {
      localStorage.setItem('tat_pro', 'true');
      localStorage.setItem('tat_credits', '999999');
      window.location.reload();
    } else {
      const newCredits = store.credits + (checkout.value as number);
      localStorage.setItem('tat_credits', String(newCredits));
      window.location.reload();
    }
  };

  if (!user) return <Onboarding />;

  return (
    <div className="h-[100dvh] overflow-hidden flex">
      <Sidebar onOpenSettings={() => setSettingsOpen(true)} onOpenPricing={() => setPricingOpen(true)} />
      <ChatArea />
      <CodeCanvas />

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <PricingModal open={pricingOpen} onClose={() => setPricingOpen(false)} onCheckout={handleCheckout} />
      <CheckoutModal
        open={checkout.open}
        onClose={() => setCheckout((c) => ({ ...c, open: false }))}
        title={checkout.title}
        cost={checkout.cost}
        onSuccess={handleCheckoutSuccess}
      />
    </div>
  );
};

export default Index;
