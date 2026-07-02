import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

export default function ComingSoon({ title, description }: { title: string; description?: string }) {
  return (
    <AppShell>
      <div className="container py-16 max-w-2xl">
        <Card className="glass-card p-12 text-center animate-scale-in">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-display font-bold mb-2">{title}</h1>
          <p className="text-muted-foreground">
            {description ?? 'This section is being crafted for the BitBite V3 launch. Check back soon.'}
          </p>
        </Card>
      </div>
    </AppShell>
  );
}
