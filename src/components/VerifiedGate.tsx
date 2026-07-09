import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MailWarning } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface VerifiedGateProps {
  children: React.ReactNode;
  /** Short verb used in the copy, e.g. "create an offer", "start a trade". */
  action?: string;
}

/**
 * Blocks its children behind an email-verified check. Shows a "resend email"
 * card when the signed-in user hasn't confirmed their address yet.
 * DB-level triggers enforce the same rule; this is UX.
 */
export function VerifiedGate({ children, action = 'continue' }: VerifiedGateProps) {
  const { user, emailVerified, resendVerification } = useAuth();
  const [sending, setSending] = useState(false);

  if (!user || emailVerified) return <>{children}</>;

  const resend = async () => {
    if (!user.email) return;
    setSending(true);
    await resendVerification(user.email);
    setSending(false);
  };

  return (
    <Card className="glass-card p-6 flex flex-col sm:flex-row items-start gap-4 border-warning/40">
      <div className="h-10 w-10 rounded-lg bg-warning/10 grid place-items-center shrink-0">
        <MailWarning className="h-5 w-5 text-warning" />
      </div>
      <div className="flex-1 space-y-1">
        <h3 className="font-semibold">Verify your email to {action}</h3>
        <p className="text-sm text-muted-foreground">
          We sent a confirmation link to <span className="font-mono">{user.email}</span>.
          Click it to unlock trading, offers, and bots. Check your spam folder if it hasn't arrived.
        </p>
      </div>
      <Button variant="outline" onClick={resend} disabled={sending}>
        {sending ? 'Sending…' : 'Resend email'}
      </Button>
    </Card>
  );
}
