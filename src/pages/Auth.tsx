import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Cpu, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Auth = () => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        navigate('/', { replace: true });
      }
    });
    // Check if already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) navigate('/', { replace: true });
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName || email.split('@')[0] } },
        });
        if (error) throw error;
        toast({ title: 'Account created!', description: 'You are now signed in.' });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background mesh-bg flex items-stretch">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-col justify-between w-[46%] xl:w-[52%] relative overflow-hidden p-12 border-r border-border/60">
        <div className="absolute -top-32 -left-24 w-[28rem] h-[28rem] rounded-full bg-gradient-primary opacity-20 blur-3xl animate-float" />
        <div className="absolute bottom-0 right-0 w-[22rem] h-[22rem] rounded-full bg-primary/20 blur-3xl animate-float" />

        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
            <Cpu className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-extrabold tracking-tight">TheAiTwins</span>
        </div>

        <div className="relative max-w-lg">
          <h1 className="font-display text-5xl xl:text-6xl font-extrabold leading-[1.05]">
            Your <span className="text-gradient">AI studio</span> for chat, code, decks and video.
          </h1>
          <p className="mt-5 text-base text-muted-foreground leading-relaxed">
            One workspace where agents write, design, build and render — live, with you watching every step.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            {['AI Workspace', 'Code Playground', 'Video Studio', 'Bring your own key'].map((t) => (
              <span key={t} className="px-3 py-1.5 rounded-full text-xs font-semibold glass text-muted-foreground">
                {t}
              </span>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-muted-foreground">Built for people who ship fast.</p>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center justify-center gap-2.5 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
              <Cpu className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-extrabold">TheAiTwins</span>
          </div>

          <div className="premium-card p-6 sm:p-8 shadow-elevated">
            <h2 className="font-display text-2xl font-extrabold">
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1.5">
              {mode === 'login' ? 'Sign in to pick up where you left off.' : 'Start building with your AI twins.'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-3 mt-6">
              {mode === 'signup' && (
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Display name"
                    className="w-full pl-10 pr-4 py-3 bg-secondary/60 border border-border rounded-xl text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/25"
                  />
                </div>
              )}
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full pl-10 pr-4 py-3 bg-secondary/60 border border-border rounded-xl text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/25"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full pl-10 pr-10 py-3 bg-secondary/60 border border-border rounded-xl text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/25"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-primary text-primary-foreground rounded-xl text-sm font-bold shadow-glow hover:brightness-110 active:scale-[.99] disabled:opacity-50 transition-all"
              >
                {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            {mode === 'login' && (
              <button
                onClick={async () => {
                  if (!email) {
                    toast({ title: 'Enter your email first', variant: 'destructive' });
                    return;
                  }
                  const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/reset-password`,
                  });
                  if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
                  else toast({ title: 'Check your email', description: 'Password reset link sent!' });
                }}
                className="block mx-auto mt-4 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                Forgot password?
              </button>
            )}
          </div>

          <p className="text-center text-xs text-muted-foreground mt-5">
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="text-primary font-bold hover:underline"
            >
              {mode === 'login' ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};


export default Auth;
