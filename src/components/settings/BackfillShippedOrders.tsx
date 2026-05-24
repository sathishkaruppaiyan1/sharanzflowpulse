import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { History, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

type CallResult = {
  fetched: number;
  inserted: number;
  skipped: number;
  failed: number;
  next_since_id: string | null;
  has_more: boolean;
  pages_processed: number;
  errors: Array<{ order: string; message: string }>;
  error?: string;
};

const FLAG_KEY = 'historical_backfill_done';

const BackfillShippedOrders = () => {
  const { toast } = useToast();
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState<string | null>(null);
  const [confirmStep, setConfirmStep] = useState(false);
  const [totals, setTotals] = useState({ fetched: 0, inserted: 0, skipped: 0, failed: 0 });
  const [recentErrors, setRecentErrors] = useState<CallResult['errors']>([]);
  const [statusLine, setStatusLine] = useState<string>('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', FLAG_KEY)
        .maybeSingle();
      const at = (data?.value as any)?.completed_at;
      if (at) setCompleted(at);
    })();
  }, []);

  const run = async () => {
    setRunning(true);
    setConfirmStep(false);
    setTotals({ fetched: 0, inserted: 0, skipped: 0, failed: 0 });
    setRecentErrors([]);
    setStatusLine('Starting backfill…');

    let sinceId: string | null = null;
    const running = { fetched: 0, inserted: 0, skipped: 0, failed: 0 };
    let callCount = 0;

    try {
      while (true) {
        callCount++;
        setStatusLine(`Calling backfill (batch ${callCount})…`);

        const { data, error } = await supabase.functions.invoke<CallResult>(
          'backfill-shipped-orders',
          { body: { since_id: sinceId } },
        );

        if (error) throw new Error(error.message);
        if (!data) throw new Error('No response from edge function');
        if (data.error) throw new Error(data.error);

        running.fetched += data.fetched;
        running.inserted += data.inserted;
        running.skipped += data.skipped;
        running.failed += data.failed;
        setTotals({ ...running });
        if (data.errors?.length) setRecentErrors(prev => [...prev, ...data.errors].slice(-20));

        if (!data.has_more || !data.next_since_id) break;
        sinceId = data.next_since_id;
        setStatusLine(`Imported ${running.inserted} so far… continuing from id ${sinceId}`);
      }

      const completedAt = new Date().toISOString();
      await supabase.from('system_settings').upsert(
        { key: FLAG_KEY, value: { completed_at: completedAt, ...running } },
        { onConflict: 'key' },
      );
      setCompleted(completedAt);
      setStatusLine(`Done. Imported ${running.inserted} fulfilled orders into shipped stage.`);
      toast({
        title: 'Backfill complete',
        description: `${running.inserted} inserted, ${running.skipped} skipped, ${running.failed} failed.`,
      });
    } catch (e: any) {
      const msg = e?.message || String(e);
      setStatusLine(`Failed: ${msg}`);
      toast({ title: 'Backfill failed', description: msg, variant: 'destructive' });
    } finally {
      setRunning(false);
    }
  };

  const progressPct = totals.fetched > 0
    ? Math.min(100, Math.round(((totals.inserted + totals.skipped + totals.failed) / totals.fetched) * 100))
    : 0;

  return (
    <Card className="shadow-lg border-0 bg-white">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <History className="h-5 w-5 text-indigo-600" />
          <CardTitle>Historical Backfill: Shopify Fulfilled Orders → Shipped</CardTitle>
        </div>
        <CardDescription>
          One-time import. Pulls every fulfilled order from Shopify and inserts them at the
          <strong> shipped </strong> stage with their tracking number, carrier and URL preserved.
          Safe to re-run — existing orders are skipped automatically.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {completed && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              Last run completed on {new Date(completed).toLocaleString()}. You can run again safely;
              already-imported orders will be skipped.
            </AlertDescription>
          </Alert>
        )}

        {running && (
          <div className="space-y-2">
            <Progress value={progressPct} />
            <p className="text-sm text-gray-600">{statusLine}</p>
            <div className="grid grid-cols-4 gap-2 text-sm">
              <Stat label="Fetched" value={totals.fetched} />
              <Stat label="Inserted" value={totals.inserted} color="text-green-700" />
              <Stat label="Skipped" value={totals.skipped} color="text-amber-700" />
              <Stat label="Failed" value={totals.failed} color="text-red-700" />
            </div>
          </div>
        )}

        {!running && !confirmStep && (
          <Button onClick={() => setConfirmStep(true)} disabled={running} className="w-full">
            <History className="mr-2 h-4 w-4" />
            {completed ? 'Run backfill again' : 'Run historical backfill'}
          </Button>
        )}

        {!running && confirmStep && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="space-y-3">
              <p>
                This will pull <strong>all fulfilled orders</strong> from Shopify and insert them at
                stage = shipped. On a large store this can take several minutes.
              </p>
              <div className="flex gap-2">
                <Button variant="destructive" onClick={run}>
                  Yes, start backfill
                </Button>
                <Button variant="outline" onClick={() => setConfirmStep(false)}>
                  Cancel
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {running && (
          <div className="flex items-center text-sm text-gray-600">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Do not close this tab until it finishes.
          </div>
        )}

        {recentErrors.length > 0 && (
          <div className="mt-4 max-h-40 overflow-y-auto rounded border border-red-200 bg-red-50 p-3 text-xs">
            <p className="font-semibold text-red-800 mb-1">Recent errors:</p>
            <ul className="space-y-1 text-red-700">
              {recentErrors.slice(-10).map((e, i) => (
                <li key={i}>
                  <span className="font-mono">{e.order}</span> — {e.message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const Stat = ({ label, value, color }: { label: string; value: number; color?: string }) => (
  <div className="rounded border bg-gray-50 px-3 py-2">
    <p className="text-xs text-gray-500">{label}</p>
    <p className={`text-lg font-semibold ${color ?? 'text-gray-900'}`}>{value}</p>
  </div>
);

export default BackfillShippedOrders;
