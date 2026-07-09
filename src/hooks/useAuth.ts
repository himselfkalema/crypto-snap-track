import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: displayName ? { display_name: displayName } : undefined,
      },
    });
    if (error) {
      toast({ variant: 'destructive', title: 'Sign up failed', description: error.message });
    } else {
      toast({ title: 'Check your email', description: 'Click the confirmation link to activate your account.' });
    }
    return { error };
  }, [toast]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) toast({ variant: 'destructive', title: 'Sign in failed', description: error.message });
    return { error };
  }, [toast]);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) toast({ variant: 'destructive', title: 'Sign out failed', description: error.message });
    return { error };
  }, [toast]);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast({ variant: 'destructive', title: 'Reset failed', description: error.message });
    else toast({ title: 'Check your email', description: 'Password reset link sent.' });
    return { error };
  }, [toast]);

  const resendVerification = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${window.location.origin}/` },
    });
    if (error) toast({ variant: 'destructive', title: 'Could not resend', description: error.message });
    else toast({ title: 'Verification email sent', description: `Check ${email} for the confirmation link.` });
    return { error };
  }, [toast]);

  const emailVerified = !!user?.email_confirmed_at;

  return { user, session, loading, signUp, signIn, signOut, resetPassword, resendVerification, emailVerified };
}
