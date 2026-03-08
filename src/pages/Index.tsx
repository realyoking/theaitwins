import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAppStore } from '@/lib/store';
import Onboarding from '@/components/Onboarding';
import Sidebar from '@/components/Sidebar';
import ChatArea from '@/components/ChatArea';
import CodeCanvas from '@/components/CodeCanvas';
import SettingsModal from '@/components/SettingsModal';
import PricingModal from '@/components/PricingModal';
import CheckoutModal from '@/components/CheckoutModal';
import AnalyticsModal from '@/components/AnalyticsModal';
import PluginSystem from '@/components/PluginSystem';
import AnnouncementPopup from '@/components/AnnouncementPopup';

const Index = () => {
  const { user, theme, checkDailyReset, checkStreak, customThemeId, setCustomThemeId, customFont, plugins, setPlugins } = useAppStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [pluginsOpen, setPluginsOpen] = useState(false);
  const [authUser, setAuthUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const navigate = useNavigate();
  const [checkout, setCheckout] = useState<{ open: boolean; title: string; cost: string; type: 'plan' | 'credits'; value: string | number }>({
    open: false, title: '', cost: '', type: 'plan', value: ''
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setAuthUser(session?.user ?? null);
      setAuthLoading(false);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthUser(session?.user ?? null);
      setAuthLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    document.documentElement.className = theme;
    checkDailyReset();
    checkStreak();
    if (customThemeId && customThemeId !== 'default-dark') {
      setCustomThemeId(customThemeId);
    }
    // Apply saved font
    if (customFont && customFont !== 'Inter') {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${customFont.replace(/ /g, '+')}:wght@400;500;600;700;800;900&display=swap`;
      document.head.appendChild(link);
      document.body.style.fontFamily = `'${customFont}', system-ui, sans-serif`;
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !authUser) {
      navigate('/auth');
    }
  }, [authLoading, authUser, navigate]);

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

  if (authLoading || !authUser) return null;
  if (!user) return <Onboarding />;

  return (
    <div className="h-[100dvh] overflow-hidden flex">
      <Sidebar
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenPricing={() => setPricingOpen(true)}
        onOpenAnalytics={() => setAnalyticsOpen(true)}
        onOpenPlugins={() => setPluginsOpen(true)}
      />
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
      <AnalyticsModal open={analyticsOpen} onClose={() => setAnalyticsOpen(false)} />
      <PluginSystem open={pluginsOpen} onClose={() => setPluginsOpen(false)} plugins={plugins} setPlugins={setPlugins} />
      <AnnouncementPopup />
    </div>
  );
};

export default Index;
