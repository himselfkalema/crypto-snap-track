interface PasswordStrengthProps {
  password: string;
}

/**
 * Simple client-side password strength meter. The authoritative check is
 * Supabase Auth's length + HIBP policy at signup / password change time.
 */
export function scorePassword(pw: string): { score: number; label: string; hint: string } {
  if (!pw) return { score: 0, label: '', hint: '' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  const label = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent'][score] ?? '';
  const hint =
    score < 3
      ? 'Try 12+ characters mixing upper/lowercase, digits, and a symbol.'
      : score < 4
        ? 'Nice — a symbol or extra length makes it stronger.'
        : 'Looks strong.';
  return { score, label, hint };
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const { score, label, hint } = scorePassword(password);
  if (!password) return null;
  const colors = ['bg-destructive', 'bg-destructive', 'bg-warning', 'bg-warning', 'bg-success', 'bg-success'];

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-5 gap-1">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className={`h-1 rounded-full ${i <= score ? colors[score] : 'bg-muted'}`} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{label}</span> — {hint}
      </p>
    </div>
  );
}
