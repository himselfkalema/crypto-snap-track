import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { Logo } from '@/components/Logo';

export default function ComingSoon({ title, description }: { title: string; description?: string }) {
  return (
    <AppShell>
      <div className="container py-16 max-w-2xl">
        <Card className="glass-card p-12 text-center animate-scale-in">
          <Logo className="h-14 w-14 mx-auto mb-4" />
          <h1 className="text-3xl font-display font-bold mb-2">{title}</h1>
          <p className="text-muted-foreground">
            {description ?? 'This section is being crafted for the BitBite V3 launch. Check back soon.'}
          </p>
        </Card>
      </div>
    </AppShell>
  );
}
