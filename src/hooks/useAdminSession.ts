// Server-verified admin session guard. Confirms admin role + AAL2 via the
// admin-verify edge function on mount and every 60s. Enforces:
// - 15 min idle timeout (reset by pointer/keyboard/scroll activity)
// - 4 hr absolute session cap
// - forced sign-out to /admin/login on any expiry or verification failure
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const IDLE_MS = 15 * 60 * 1000;
const ABSOLUTE_MS = 4 * 60 * 60 * 1000;
const REVERIFY_MS = 60 * 1000;

export interface AdminSessionState {
  status: 'loading' | 'authorized' | 'unauthorized';
  email?: string;
  userId?: string;
  mfaAgeSeconds: number;
  refresh: () => Promise<void>;
}

export function useAdminSession(): AdminSessionState {
  const navigate = useNavigate();
  const [status, setStatus] = useState<AdminSessionState['status']>('loading');
  const [info, setInfo] = useState<{ email?: string; userId?: string; mfaAgeSeconds: number }>({ mfaAgeSeconds: 0 });
  const sessionStartRef = useRef<number>(Date.now());
  const lastActivityRef = useRef<number>(Date.now());

  const forceOut = useCallback(async (reason: string) => {
    await supabase.auth.signOut().catch(() => {});
    setStatus('unauthorized');
    toast.error(reason);
    navigate('/admin/login', { replace: true });
  }, [navigate]);

  const verify = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke('admin-verify');
    if (error || !data?.ok) {
      await forceOut('Session ended. Please sign in again.');
      return;
    }
    setInfo({ email: data.email, userId: data.user_id, mfaAgeSeconds: data.mfa_age_seconds });
    setStatus('authorized');
  }, [forceOut]);

  // Initial + periodic re-verification.
  useEffect(() => {
    verify();
    const t = setInterval(verify, REVERIFY_MS);
    return () => clearInterval(t);
  }, [verify]);

  // Idle + absolute session timers.
  useEffect(() => {
    const bump = () => { lastActivityRef.current = Date.now(); };
    ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'].forEach((ev) =>
      window.addEventListener(ev, bump, { passive: true }),
    );
    const t = setInterval(() => {
      const now = Date.now();
      if (now - sessionStartRef.current > ABSOLUTE_MS) {
        forceOut('Admin session expired (4h maximum). Please sign in again.');
        return;
      }
      if (now - lastActivityRef.current > IDLE_MS) {
        forceOut('Signed out after 15 minutes of inactivity.');
      }
    }, 15_000);
    return () => {
      clearInterval(t);
      ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'].forEach((ev) =>
        window.removeEventListener(ev, bump),
      );
    };
  }, [forceOut]);

  return { status, ...info, refresh: verify };
}
