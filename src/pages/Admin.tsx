import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield, LogOut, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface Deposit {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  method: string;
  reference: string | null;
  status: string;
  created_at: string;
  notes: string | null;
}

export default function Admin() {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check admin role
  useEffect(() => {
    const checkAdminRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      if (!roles) {
        toast({
          title: 'Access Denied',
          description: 'You do not have admin privileges',
          variant: 'destructive'
        });
        navigate('/');
        return;
      }

      setIsAdmin(true);
      fetchDeposits();
    };

    checkAdminRole();
  }, [navigate, toast]);

  const fetchDeposits = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('deposits')
      .select('*')
      .in('status', ['PENDING', 'CONFIRMED'])
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load deposits',
        variant: 'destructive'
      });
    } else {
      setDeposits(data || []);
    }
    setLoading(false);
  };

  const handleAction = async (depositId: string, action: 'confirm' | 'process' | 'reject') => {
    setProcessingId(depositId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const response = await supabase.functions.invoke('admin-deposits', {
        body: { 
          depositId, 
          action,
          notes: notes[depositId] || null
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (response.error) throw response.error;

      toast({
        title: 'Success',
        description: `Deposit ${action}ed successfully`
      });

      setNotes(prev => ({ ...prev, [depositId]: '' }));
      fetchDeposits();
    } catch (error: any) {
      console.error('Action error:', error);
      toast({
        title: 'Error',
        description: error.message || `Failed to ${action} deposit`,
        variant: 'destructive'
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  if (isAdmin === null || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Admin Panel</h1>
              <p className="text-muted-foreground">Manage deposit requests</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">
                  {deposits.filter(d => d.status === 'PENDING').length}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Confirmed</p>
                <p className="text-2xl font-bold">
                  {deposits.filter(d => d.status === 'CONFIRMED').length}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Deposits</p>
                <p className="text-2xl font-bold">{deposits.length}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Deposits List */}
        <div className="space-y-4">
          {deposits.length === 0 ? (
            <Card className="p-8 text-center bg-card border-border">
              <p className="text-muted-foreground">No pending deposits</p>
            </Card>
          ) : (
            deposits.map((deposit) => (
              <Card key={deposit.id} className="p-6 bg-card border-border">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        deposit.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-500' :
                        deposit.status === 'CONFIRMED' ? 'bg-blue-500/20 text-blue-500' :
                        'bg-green-500/20 text-green-500'
                      }`}>
                        {deposit.status}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(deposit.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Amount:</span>{' '}
                        <span className="font-bold">{deposit.amount} {deposit.currency}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Method:</span>{' '}
                        <span className="font-medium">{deposit.method}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">User ID:</span>{' '}
                        <span className="font-mono text-xs">{deposit.user_id}</span>
                      </div>
                      {deposit.reference && (
                        <div>
                          <span className="text-muted-foreground">Reference:</span>{' '}
                          <span className="font-mono text-xs">{deposit.reference}</span>
                        </div>
                      )}
                    </div>
                    {deposit.notes && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Notes:</span>{' '}
                        <span>{deposit.notes}</span>
                      </div>
                    )}
                    
                    {/* Notes textarea */}
                    <div className="pt-2">
                      <Textarea
                        placeholder="Add notes (optional)"
                        value={notes[deposit.id] || ''}
                        onChange={(e) => setNotes(prev => ({ ...prev, [deposit.id]: e.target.value }))}
                        className="text-sm"
                        rows={2}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 min-w-[140px]">
                    {deposit.status === 'PENDING' && (
                      <>
                        <Button
                          onClick={() => handleAction(deposit.id, 'confirm')}
                          disabled={processingId === deposit.id}
                          className="w-full"
                          variant="default"
                        >
                          {processingId === deposit.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Confirm
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={() => handleAction(deposit.id, 'reject')}
                          disabled={processingId === deposit.id}
                          variant="destructive"
                          className="w-full"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </>
                    )}
                    {deposit.status === 'CONFIRMED' && (
                      <Button
                        onClick={() => handleAction(deposit.id, 'process')}
                        disabled={processingId === deposit.id}
                        className="w-full"
                        variant="default"
                      >
                        {processingId === deposit.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Process & Credit
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}