// Modal: prompt a 6-digit TOTP code, verify it via Supabase MFA, then invoke
// `onVerified`. Used both during login and for step-up re-authentication.
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldCheck } from 'lucide-react';

interface Props {
  open: boolean;
  title?: string;
  description?: string;
  onCancel: () => void;
  onVerified: () => void;
}

export function MfaChallengeDialog({ open, title, description, onCancel, onVerified }: Props) {
  const [code, setCode] = useState('');
  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) { setCode(''); setError(null); setChallengeId(null); return; }
    (async () => {
      setBusy(true);
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totp = factors?.totp?.find((f) => f.status === 'verified');
      if (!totp) { setError('No verified TOTP factor. Contact support.'); setBusy(false); return; }
      setFactorId(totp.id);
      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: totp.id });
      if (chErr) setError(chErr.message); else setChallengeId(ch!.id);
      setBusy(false);
    })();
  }, [open]);

  const verify = async () => {
    if (!factorId || !challengeId || code.length !== 6) return;
    setBusy(true); setError(null);
    const { error: err } = await supabase.auth.mfa.verify({ factorId, challengeId, code });
    setBusy(false);
    if (err) { setError(err.message); return; }
    onVerified();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <div className="mx-auto mb-2 grid h-11 w-11 place-items-center rounded-xl bg-primary/10">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <DialogTitle className="text-center">{title ?? 'Enter authenticator code'}</DialogTitle>
          <DialogDescription className="text-center">
            {description ?? 'Open your authenticator app and enter the 6-digit code.'}
          </DialogDescription>
        </DialogHeader>
        <Input
          inputMode="numeric" autoComplete="one-time-code" maxLength={6}
          value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          placeholder="123456" className="text-center font-mono text-xl tracking-[0.4em]"
        />
        {error && <p className="text-sm text-destructive text-center">{error}</p>}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onCancel} disabled={busy}>Cancel</Button>
          <Button className="flex-1 " onClick={verify} disabled={busy || code.length !== 6}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
