import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Percent } from 'lucide-react';
import { usePlatformFee, updatePlatformFee } from '@/hooks/usePlatformFee';

interface Props {
  actorId: string;
  onAudit?: (action: string, target: string) => void;
}

export function PlatformFeeCard({ actorId, onAudit }: Props) {
  const { feePct, loading, error, reload } = usePlatformFee();
  const [draft, setDraft] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const value = draft !== '' ? draft : feePct !== null ? String(feePct) : '';

  const save = async () => {
    const pct = Number(value);
    if (!Number.isFinite(pct) || pct < 0 || pct > 10) {
      toast.error('Fee must be between 0 and 10 percent');
      return;
    }
    setSaving(true);
    const { error: err } = await updatePlatformFee(pct, actorId);
    setSaving(false);
    if (err) return toast.error(err.message);
    onAudit?.('platform_fee_updated', `${pct}%`);
    setDraft('');
    await reload();
    toast.success(`Marketplace fee set to ${pct}%`);
  };

  return (
    <Card className="glass-card p-6 space-y-4 max-w-md">
      <div className="flex items-center gap-2">
        <Percent className="h-4 w-4 text-primary" />
        <h2 className="font-semibold">Marketplace trade fee</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Charged on the crypto amount of every completed trade and deducted from the
        buyer's release. Shown to both traders before they confirm.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading current fee…
        </div>
      ) : error ? (
        <div className="space-y-2">
          <p className="text-sm text-destructive">Could not load the fee: {error}</p>
          <Button size="sm" variant="outline" onClick={reload}>Retry</Button>
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="fee-pct">Fee percentage</Label>
          <div className="flex gap-2">
            <Input
              id="fee-pct"
              type="number"
              step="0.05"
              min={0}
              max={10}
              value={value}
              onChange={e => setDraft(e.target.value)}
            />
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Currently active: {feePct}%</p>
        </div>
      )}
    </Card>
  );
}
