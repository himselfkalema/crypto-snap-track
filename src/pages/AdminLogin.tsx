// Dedicated Admin Login page.
// Flow:
//   1. Sign in with email + password. (Every attempt is logged server-side.)
//   2. Verify the account holds the admin role via `admin-verify`. If not,
//      show a generic "Access denied" — never leak whether the account exists
//      or is authenticated-but-not-admin.
//   3. If no verified TOTP factor exists → force enrollment (QR + verify).
//   4. If a factor exists → require TOTP challenge (AAL1 → AAL2).
//   5. On success → redirect to /admin.
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ShieldCheck, Mail, Lock, AlertTriangle } from 'lucide-react';
import { z } from 'zod';

const emailSchema = z.string().trim().toLowerCase().email().max(255);
const passwordSchema = z.string().min(8).max(200);
const codeSchema = z.string().regex(/^\d{6}$/);

type Stage = 'credentials' | 'enroll' | 'challenge' | 'authorized';

async function logAttempt(email: string, success: boolean, reason?: string, user_id?: string) {
  // Fire-and-forget — never block the UI on the audit write.
  try {
    await supabase.functions.invoke('admin-log-attempt', { body: { email, success, reason, user_id } });
  } catch { /* swallow */ }
}

export default function AdminLogin() {
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>('credentials');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Credentials
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Enrollment
  const [enrollFactorId, setEnrollFactorId] = useState<string | null>(null);
  const [enrollQr, setEnrollQr] = useState<string | null>(null);
  const [enrollSecret, setEnrollSecret] = useState<string | null>(null);

  // Challenge / verify (used by both flows)
  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState('');

  const trimmedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  // If we arrive already authenticated (e.g. tab reload), pick up mid-flow.
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await routeAfterSignIn(session.user.email ?? '', session.user.id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function routeAfterSignIn(userEmail: string, userId: string) {
    setBusy(true); setError(null);
    // Server-verified role check.
    const { data: verify, error: verifyErr } = await supabase.functions.invoke('admin-verify');
    if (verifyErr || !verify?.ok) {
      await supabase.auth.signOut();
      await logAttempt(userEmail, false, 'not_admin', userId);
      setStage('credentials');
      setError('Access denied.');
      setBusy(false);
      return;
    }

    // Check MFA factors.
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const verified = factors?.totp?.find((f) => f.status === 'verified');
    const unverified = factors?.totp?.find((f) => (f.status as string) !== 'verified');

    if (!verified) {
      // Force enrollment. Clean up any dangling unverified factor first.
      if (unverified) await supabase.auth.mfa.unenroll({ factorId: unverified.id });
      const { data: enroll, error: enrErr } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
      if (enrErr || !enroll) {
        setError(enrErr?.message ?? 'Could not start MFA enrollment.');
        setBusy(false); return;
      }
      setEnrollFactorId(enroll.id);
      setEnrollQr(enroll.totp.qr_code);
      setEnrollSecret(enroll.totp.secret);
      const { data: ch } = await supabase.auth.mfa.challenge({ factorId: enroll.id });
      setChallengeId(ch?.id ?? null);
      setFactorId(enroll.id);
      setStage('enroll');
      setBusy(false);
      return;
    }

    // Verified factor exists — check current AAL. If already aal2, we're done.
    const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalData?.currentLevel === 'aal2') {
      await logAttempt(userEmail, true, 'session_resumed', userId);
      setStage('authorized');
      navigate('/admin', { replace: true });
      return;
    }

    // Need a challenge.
    setFactorId(verified.id);
    const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: verified.id });
    if (chErr || !ch) {
      setError(chErr?.message ?? 'Could not start MFA challenge.');
      setBusy(false); return;
    }
    setChallengeId(ch.id);
    setStage('challenge');
    setBusy(false);
  }

  async function onSubmitCredentials(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const emailParsed = emailSchema.safeParse(email);
    const pwParsed = passwordSchema.safeParse(password);
    if (!emailParsed.success || !pwParsed.success) {
      setError('Enter a valid email and password.');
      return;
    }
    setBusy(true);
    const { data, error: signErr } = await supabase.auth.signInWithPassword({
      email: emailParsed.data, password: pwParsed.data,
    });
    if (signErr || !data?.user) {
      await logAttempt(emailParsed.data, false, signErr?.message?.slice(0, 100) ?? 'sign_in_failed');
      setError('Access denied.'); // generic message — never confirm/deny account existence
      setBusy(false);
      return;
    }
    await routeAfterSignIn(data.user.email ?? emailParsed.data, data.user.id);
  }

  async function onVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!factorId || !challengeId || !codeSchema.safeParse(code).success) {
      setError('Enter the 6-digit code.'); return;
    }
    setBusy(true);
    const { error: vErr } = await supabase.auth.mfa.verify({ factorId, challengeId, code });
    if (vErr) {
      await logAttempt(trimmedEmail, false, 'mfa_verify_failed');
      setError(vErr.message);
      setBusy(false);
      // Refresh the challenge so the user can retry.
      const { data: ch } = await supabase.auth.mfa.challenge({ factorId });
      setChallengeId(ch?.id ?? null);
      setCode('');
      return;
    }
    await logAttempt(trimmedEmail, true, stage === 'enroll' ? 'mfa_enrolled' : 'mfa_verified');
    setStage('authorized');
    navigate('/admin', { replace: true });
  }

  async function cancelAndSignOut() {
    if (enrollFactorId && stage === 'enroll') {
      await supabase.auth.mfa.unenroll({ factorId: enrollFactorId }).catch(() => {});
    }
    await supabase.auth.signOut();
    setStage('credentials'); setCode(''); setPassword('');
    setEnrollFactorId(null); setEnrollQr(null); setEnrollSecret(null);
    setFactorId(null); setChallengeId(null);
    setError(null); setBusy(false);
  }

  return (
    <div className="min-h-screen bg-mesh flex items-center justify-center p-6">
      <Helmet>
        <title>Admin Sign in — BitBite</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-6">
          <Logo className="h-10 w-10" />
        </Link>
        <Card className="p-8 glass-strong space-y-5">
          <div className="text-center space-y-1">
            <div className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-primary/10">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-xl font-semibold">Admin sign in</h1>
            <p className="text-xs text-muted-foreground">Restricted area. All access attempts are logged.</p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Sign in blocked</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {stage === 'credentials' && (
            <form onSubmit={onSubmitCredentials} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="admin-email" type="email" autoComplete="username" required
                    value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-pw">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="admin-pw" type="password" autoComplete="current-password" required minLength={8}
                    value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" />
                </div>
              </div>
              <Button type="submit" className="w-full " disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Continue'}
              </Button>
            </form>
          )}

          {stage === 'enroll' && (
            <form onSubmit={onVerifyCode} className="space-y-4">
              <div className="rounded-lg border border-border/60 p-4 text-center space-y-3">
                <p className="text-sm font-medium">Scan this QR code</p>
                <p className="text-xs text-muted-foreground">
                  Use Google Authenticator, 1Password, Authy or any TOTP app.
                </p>
                {enrollQr && (
                  <img src={enrollQr} alt="TOTP QR code" className="mx-auto h-44 w-44 rounded bg-white p-2" />
                )}
                {enrollSecret && (
                  <p className="font-mono text-xs text-muted-foreground break-all select-all">
                    Manual key: {enrollSecret}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="enroll-code">Enter the 6-digit code from your app</Label>
                <Input id="enroll-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
                  value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  className="text-center font-mono text-xl tracking-[0.4em]" placeholder="123456" />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={cancelAndSignOut}>Cancel</Button>
                <Button type="submit" className="flex-1 " disabled={busy || code.length !== 6}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enable MFA'}
                </Button>
              </div>
            </form>
          )}

          {stage === 'challenge' && (
            <form onSubmit={onVerifyCode} className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Open your authenticator app and enter the current 6-digit code.
              </p>
              <Input inputMode="numeric" autoComplete="one-time-code" maxLength={6}
                value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="text-center font-mono text-xl tracking-[0.4em]" placeholder="123456" />
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={cancelAndSignOut}>Cancel</Button>
                <Button type="submit" className="flex-1 " disabled={busy || code.length !== 6}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
                </Button>
              </div>
            </form>
          )}
        </Card>
        <p className="text-xs text-muted-foreground text-center mt-4">
          Not an admin? <Link to="/auth" className="underline">Return to user sign in</Link>
        </p>
      </div>
    </div>
  );
}
