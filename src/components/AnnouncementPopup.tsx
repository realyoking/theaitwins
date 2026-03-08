import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AnnouncementButton {
  text: string;
  action: 'link' | 'text';
  url?: string;
  content?: string;
}

interface Announcement {
  id: string;
  title: string;
  subtitle: string;
  body: string;
  image_url: string | null;
  video_url: string | null;
  buttons: AnnouncementButton[];
  active: boolean;
  created_at: string;
}

const AnnouncementPopup = () => {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [visible, setVisible] = useState(false);
  const [buttonContent, setButtonContent] = useState<string | null>(null);

  useEffect(() => {
    loadAnnouncement();
  }, []);

  const loadAnnouncement = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    // Get active announcements
    const { data: announcements } = await supabase
      .from('announcements')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (!announcements || announcements.length === 0) return;

    // Get read announcements
    const { data: reads } = await supabase
      .from('announcement_reads')
      .select('announcement_id')
      .eq('user_id', session.user.id);

    const readIds = new Set((reads || []).map(r => r.announcement_id));

    // Find first unread announcement
    const unread = announcements.find(a => !readIds.has(a.id));
    if (unread) {
      setAnnouncement(unread as unknown as Announcement);
      setVisible(true);
    }
  };

  const dismiss = async () => {
    if (!announcement) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await supabase.from('announcement_reads').insert({
        user_id: session.user.id,
        announcement_id: announcement.id,
      });
    }
    setVisible(false);
    setButtonContent(null);
  };

  const handleButton = (btn: AnnouncementButton) => {
    if (btn.action === 'link' && btn.url) {
      window.open(btn.url, '_blank');
    } else if (btn.action === 'text' && btn.content) {
      setButtonContent(btn.content);
    }
  };

  if (!visible || !announcement) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] bg-background/60 backdrop-blur-md flex items-center justify-center p-4" onClick={dismiss}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Image */}
          {announcement.image_url && (
            <div className="w-full h-48 overflow-hidden">
              <img src={announcement.image_url} alt={announcement.title} className="w-full h-full object-cover" />
            </div>
          )}

          {/* Video */}
          {announcement.video_url && !announcement.image_url && (
            <div className="w-full aspect-video">
              <iframe src={announcement.video_url} className="w-full h-full" allowFullScreen />
            </div>
          )}

          <div className="p-6">
            {/* Close button */}
            <button onClick={dismiss} className="absolute top-4 right-4 p-2 bg-card/80 backdrop-blur rounded-full text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>

            {/* Content */}
            <h2 className="text-xl font-black mb-1">{announcement.title}</h2>
            {announcement.subtitle && (
              <p className="text-sm text-primary font-bold mb-3">{announcement.subtitle}</p>
            )}
            {announcement.body && (
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">{announcement.body}</p>
            )}

            {/* Button content view */}
            {buttonContent && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                className="bg-muted p-4 rounded-xl mb-4">
                <p className="text-sm whitespace-pre-wrap">{buttonContent}</p>
                <button onClick={() => setButtonContent(null)} className="text-[10px] text-primary font-bold mt-2">← Back</button>
              </motion.div>
            )}

            {/* Buttons */}
            {!buttonContent && announcement.buttons && announcement.buttons.length > 0 && (
              <div className="flex flex-col gap-2 mb-4">
                {announcement.buttons.map((btn, i) => (
                  <button key={i} onClick={() => handleButton(btn)}
                    className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform">
                    {btn.text}
                    {btn.action === 'link' ? <ExternalLink className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            )}

            {/* Dismiss */}
            <button onClick={dismiss} className="w-full py-2.5 bg-muted rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground transition-colors">
              Dismiss
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AnnouncementPopup;
