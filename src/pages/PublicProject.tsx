import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Code2, ArrowLeft } from 'lucide-react';

const PublicProject = () => {
  const { id } = useParams();
  const [code, setCode] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('playground_projects')
        .select('title, code')
        .eq('id', id)
        .eq('published', true)
        .maybeSingle();
      if (error || !data) { setError('This project is not available.'); return; }
      setTitle(data.title);
      setCode(data.code);
      document.title = `${data.title} · TheAiTwins`;
    })();
  }, [id]);

  if (error) {
    return (
      <main className="h-[100dvh] grid place-items-center bg-background text-foreground">
        <div className="text-center">
          <h1 className="text-lg font-bold mb-2">Not found</h1>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Link to="/" className="text-primary text-sm underline">Back home</Link>
        </div>
      </main>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-background text-foreground">
      <header className="shrink-0 h-12 flex items-center gap-2 px-3 border-b border-border/60">
        <Link to="/playground" className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><ArrowLeft className="w-4 h-4" /></Link>
        <Code2 className="w-4 h-4 text-primary" />
        <h1 className="text-sm font-bold truncate">{title || 'Shared project'}</h1>
      </header>
      <div className="flex-1 min-h-0 bg-white">
        {code === null
          ? <div className="h-full grid place-items-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          : <iframe srcDoc={code} className="w-full h-full border-none" sandbox="allow-scripts allow-modals" title={title} />}
      </div>
    </div>
  );
};

export default PublicProject;
