import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Optional TOTP two-factor authentication for regular users.
 * Uses Supabase Auth MFA (same primitives as the admin portal).
 */
export function TotpCard() {
  const [factor, setFactor] = useState<{ id: string; status: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [qr, setQr] = useState<{ factorId: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const { data } = await supabase.auth.mfa.listFactors();
    const totp = data?.totp?.[0];
    setFactor(totp ? { id: totp.id, status: totp.status } : null);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const startEnroll = async () => {
    setEnrolling(true);
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Authenticator app' });
    setEnrolling(false);
    if (error || !data) return toast.error(error?.message ?? 'Could not start enrollment');
    setQr({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  };

  const verifyEnroll = async () => {
    if (!qr) return;
    setVerifying(true);
    const { data: chal, error: cErr } = await supabase.auth.mfa.challenge({ factorId: qr.factorId });
    if (cErr || !chal) { setVerifying(false); return toast.error(cErr?.message ?? 'Challenge failed'); }
    const { error } = await supabase.auth.mfa.verify({ factorId: qr.factorId, challengeId: chal.id, code });
    setVerifying(false);
    if (error) return toast.error(error.message);
    toast.success('Two-factor authentication enabled');
    setQr(null); setCode('');
    refresh();
  };

  const disable = async () => {
    if (!factor) return;
    if (!confirm('Disable two-factor authentication? Your account will be less secure.')) return;
    const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
    if (error) return toast.error(error.message);
    toast.success('Two-factor authentication disabled');
    refresh();
  };

  if (loading) return <Card className="glass-card p-6"><p className="text-sm text-muted-foreground">Loading security settings…</p></Card>;

  const active = factor?.status === 'verified';

  return (
    <Card className="glass-card p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Two-factor authentication
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Protect your account with a time-based code from an authenticator app.
          </p>
        </div>
        {active && <Badge className="bg-success text-success-foreground">Enabled</Badge>}
      </div>

      {qr ? (
        <div className="space-y-3">
          <div className="flex items-start gap-4 flex-col sm:flex-row">
            <img src={qr.qr} alt="Scan this QR code with your authenticator app" className="h-40 w-40 bg-white p-2 rounded-md" />
            <div className="space-y-2 text-sm">
              <p>Scan the QR code with Google Authenticator, 1Password, Authy, or a similar app.</p>
              <p className="text-muted-foreground">Can't scan? Enter this secret manually:</p>
              <code className="block font-mono text-xs bg-secondary/50 p-2 rounded break-all">{qr.secret}</code>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Enter the 6-digit code to finish</Label>
            <Input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" maxLength={6} placeholder="123456" />
          </div>
          <div className="flex gap-2">
            <Button onClick={verifyEnroll} disabled={verifying || code.length !== 6}>{verifying ? 'Verifying…' : 'Confirm & enable'}</Button>
            <Button variant="outline" onClick={() => { setQr(null); setCode(''); }}>Cancel</Button>
          </div>
        </div>
      ) : active ? (
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Smartphone className="h-4 w-4" /> Codes required at every sign-in.
          </p>
          <Button variant="outline" onClick={disable}>Disable</Button>
        </div>
      ) : (
        <Button onClick={startEnroll} disabled={enrolling} className="">
          {enrolling ? 'Preparing…' : 'Enable authenticator app'}
        </Button>
      )}
    </Card>
  );
}
