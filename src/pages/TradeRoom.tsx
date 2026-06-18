import { useEffect, useRef, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Send, AlertTriangle, Check, X, Clock } from 'lucide-react';

const statusColor: Record<string, string> = {
  pending: 'bg-warning text-warning-foreground',
  payment_sent: 'bg-primary text-primary-foreground',
  completed: 'bg-success text-success-foreground',
  cancelled: 'bg-muted text-muted-foreground',
  disputed: 'bg-destructive text-destructive-foreground',
};

export default function TradeRoom() {
  const { id } = useParams();
  const { user, loading } = useAuth();
  const [trade, setTrade] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [buyerProfile, setBuyerProfile] = useState<any>(null);
  const [sellerProfile, setSellerProfile] = useState<any>(null);
  const [text, setText] = useState('');
  const [now, setNow] = useState(Date.now());
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const { data: t } = await supabase.from('trades').select('*').eq('id', id).maybeSingle();
      setTrade(t);
      if (t) {
        const { data: profs } = await supabase.from('profiles').select('*').in('id', [t.buyer_id, t.seller_id]);
        setBuyerProfile(profs?.find(p => p.id === t.buyer_id));
        setSellerProfile(profs?.find(p => p.id === t.seller_id));
      }
      const { data: m } = await supabase.from('trade_messages').select('*').eq('trade_id', id).order('created_at');
      setMessages(m ?? []);
    };
    load();

    const channel = supabase
      .channel(`trade:${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trades', filter: `id=eq.${id}` },
        (p) => setTrade(p.new))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'trade_messages', filter: `trade_id=eq.${id}` },
        (p) => setMessages(prev => [...prev, p.new]))
      .subscribe();

    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => { supabase.removeChannel(channel); clearInterval(t); };
  }, [id]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (!trade) return <AppShell><div className="container py-12">Loading…</div></AppShell>;

  const isBuyer = user.id === trade.buyer_id;
  const isSeller = user.id === trade.seller_id;
  if (!isBuyer && !isSeller) return <Navigate to="/trades" replace />;

  const other = isBuyer ? sellerProfile : buyerProfile;
  const expiresMs = new Date(trade.expires_at).getTime() - now;
  const expired = expiresMs <= 0 && trade.status === 'pending';
  const mm = Math.max(0, Math.floor(expiresMs / 60000));
  const ss = Math.max(0, Math.floor((expiresMs % 60000) / 1000));

  const send = async () => {
    if (!text.trim()) return;
    const t = text;
    setText('');
    await supabase.from('trade_messages').insert({ trade_id: id, sender_id: user.id, content: t });
    await supabase.from('notifications').insert({
      user_id: isBuyer ? trade.seller_id : trade.buyer_id,
      type: 'new_message',
      title: 'New message',
      body: t.slice(0, 80),
      link: `/trades/${id}`,
    });
  };

  const updateStatus = async (status: string, extra: any = {}) => {
    await supabase.from('trades').update({ status, ...extra }).eq('id', id);
    toast.success(`Trade ${status.replace('_', ' ')}`);
  };

  const openDispute = async () => {
    if (!disputeReason.trim()) return toast.error('Add a reason');
    await supabase.from('disputes').insert({ trade_id: id, opener_id: user.id, reason: disputeReason });
    await updateStatus('disputed');
    setDisputeOpen(false);
    setDisputeReason('');
  };

  const submitReview = async () => {
    const revieweeId = isBuyer ? trade.seller_id : trade.buyer_id;
    const { error } = await supabase.from('reviews').insert({
      trade_id: id, reviewer_id: user.id, reviewee_id: revieweeId, rating, comment: reviewText,
    });
    if (error) return toast.error(error.message);
    toast.success('Review submitted');
    setReviewing(false);
  };

  return (
    <AppShell>
      <div className="container py-8 grid lg:grid-cols-3 gap-6">
        {/* Trade info */}
        <Card className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <Badge className={statusColor[trade.status]}>{trade.status.replace('_', ' ')}</Badge>
            {trade.status === 'pending' && (
              <div className="flex items-center gap-1 text-sm font-mono">
                <Clock className="h-4 w-4" /> {expired ? 'expired' : `${mm}:${ss.toString().padStart(2, '0')}`}
              </div>
            )}
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Trading with</div>
            <div className="font-semibold">@{other?.username ?? '…'}</div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Coin</span><span className="font-mono">{trade.coin}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Crypto</span><span className="font-mono">{Number(trade.crypto_amount).toFixed(8)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Fiat</span><span className="font-mono">{Number(trade.fiat_amount).toLocaleString()} {trade.fiat_currency}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Price</span><span className="font-mono">{Number(trade.price).toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Method</span><span>{trade.payment_method}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Role</span><span>{isBuyer ? 'Buyer' : 'Seller'}</span></div>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-2">
            {trade.status === 'pending' && isBuyer && (
              <Button onClick={() => updateStatus('payment_sent')} className="w-full bg-primary">
                <Check className="h-4 w-4 mr-2" /> I've sent payment
              </Button>
            )}
            {trade.status === 'payment_sent' && isSeller && (
              <Button onClick={() => updateStatus('completed', { completed_at: new Date().toISOString() })} className="w-full bg-success">
                <Check className="h-4 w-4 mr-2" /> Release crypto & complete
              </Button>
            )}
            {(trade.status === 'pending' || trade.status === 'payment_sent') && (
              <>
                <Button variant="outline" onClick={() => updateStatus('cancelled', { cancelled_at: new Date().toISOString() })} className="w-full">
                  <X className="h-4 w-4 mr-2" /> Cancel trade
                </Button>
                <Dialog open={disputeOpen} onOpenChange={setDisputeOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full text-destructive border-destructive/40">
                      <AlertTriangle className="h-4 w-4 mr-2" /> Open dispute
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Open a dispute</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <Label>Reason</Label>
                      <Textarea value={disputeReason} onChange={e => setDisputeReason(e.target.value)} rows={4} maxLength={1000} />
                      <Button onClick={openDispute} className="w-full">Submit dispute</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            )}
            {trade.status === 'completed' && !reviewing && (
              <Button onClick={() => setReviewing(true)} className="w-full" variant="outline">Leave review</Button>
            )}
            {reviewing && (
              <div className="space-y-2 p-3 border rounded-lg">
                <Label>Rating</Label>
                <div className="flex gap-1">
                  {[1,2,3,4,5].map(n => (
                    <button key={n} type="button" onClick={() => setRating(n)} className={`text-2xl ${n <= rating ? 'text-warning' : 'text-muted'}`}>★</button>
                  ))}
                </div>
                <Textarea placeholder="Comment…" value={reviewText} onChange={e => setReviewText(e.target.value)} maxLength={500} />
                <Button onClick={submitReview} className="w-full">Submit review</Button>
              </div>
            )}
          </div>
        </Card>

        {/* Chat */}
        <Card className="glass-card p-0 lg:col-span-2 flex flex-col h-[600px]">
          <div className="p-4 border-b border-border/40 font-semibold">Trade chat</div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && <p className="text-center text-muted-foreground text-sm">No messages yet. Say hi 👋</p>}
            {messages.map(m => {
              const mine = m.sender_id === user.id;
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${mine ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                    <div className="text-sm whitespace-pre-wrap break-words">{m.content}</div>
                    <div className="text-[10px] opacity-70 mt-1">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="p-3 border-t border-border/40 flex gap-2">
            <Input
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
              placeholder="Type a message…"
              maxLength={1000}
            />
            <Button onClick={send} size="icon"><Send className="h-4 w-4" /></Button>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
