import { Route, Routes } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Providers } from '@/app/providers';

function HomePlaceholder() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-12">
      <div className="flex w-full max-w-md flex-col items-center gap-6 text-center">
        <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Sparkles className="size-6" />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">newpda</h1>
          <p className="text-sm text-muted-foreground">
            Gerenciador da pelada — em desenvolvimento. Veja{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">CLAUDE.md</code> para
            governança técnica.
          </p>
        </div>
        <Button size="lg">Pronto pra primeira partida</Button>
      </div>
    </main>
  );
}

export function App() {
  return (
    <Providers>
      <Routes>
        <Route path="/" element={<HomePlaceholder />} />
        <Route path="*" element={<HomePlaceholder />} />
      </Routes>
    </Providers>
  );
}
