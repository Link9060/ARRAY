import { useEffect, useState } from 'react';
import { Activity, ExternalLink, RefreshCw } from 'lucide-react';
import {
  GROVE_ACTIONS_URL, fetchGroveWorkerRuns,
  type WorkerRun, type WorkerRunsSnapshot,
} from '../engine/githubWorkflow';

function statusText(status: WorkerRun['status']): string {
  return ({
    queued: 'QUEUED',
    running: 'RUNNING',
    success: 'FINISHED / PR STEP PASSED',
    failure: 'FAILED',
    cancelled: 'CANCELLED',
    other: 'CHECK RUN',
  })[status];
}

export default function GroveWorkerPanel() {
  const [snapshot, setSnapshot] = useState<WorkerRunsSnapshot | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(true);

  useEffect(() => {
    let alive = true;
    let busy = false;
    const controller = new AbortController();
    async function refresh() {
      if (busy) return;
      busy = true;
      try {
        const result = await fetchGroveWorkerRuns(controller.signal);
        if (alive) { setSnapshot(result); setError(''); }
      } catch (cause) {
        if (alive && !controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : 'Could not read GitHub status.');
        }
      } finally {
        if (alive) setRefreshing(false);
        busy = false;
      }
    }
    void refresh();
    const timer = window.setInterval(() => { void refresh(); }, 90_000);
    return () => { alive = false; controller.abort(); window.clearInterval(timer); };
  }, []);

  return (
    <section className="grove-worker-panel" aria-label="Grove real Builder workflow status">
      <div className="grove-worker-head">
        <div>
          <span className="eyebrow">EXTERNAL OPERATIONS / GITHUB VERIFIED</span>
          <h3><Activity size={17} aria-hidden="true" /> Grove Builder <span>LIVE WORKFLOW FEED</span></h3>
        </div>
        <a href={GROVE_ACTIONS_URL} target="_blank" rel="noopener noreferrer">
          OPEN ACTIONS <ExternalLink size={13} aria-hidden="true" />
        </a>
      </div>
      <p className="grove-worker-description">
        Real GitHub Actions status, not simulated missions. Builder launches from GitHub
        after owner setup; ARRAY cannot dispatch the worker from this panel yet.
      </p>
      {error && <p className="grove-worker-error" role="status">{error} <a href={GROVE_ACTIONS_URL} target="_blank" rel="noopener noreferrer">View on GitHub</a></p>}
      {!snapshot && !error && <p className="grove-worker-empty"><RefreshCw size={14} aria-hidden="true" /> Connecting to public GitHub workflow history…</p>}
      {snapshot && !snapshot.configured && <p className="grove-worker-empty">Workflow awaiting merge into Grove’s main branch. No coding worker has run yet.</p>}
      {snapshot?.configured && snapshot.runs.length === 0 && <p className="grove-worker-empty">No Builder runs recorded. Launch your first review-only mission from Grove Actions.</p>}
      {snapshot?.configured && snapshot.runs.length > 0 && (
        <div className="grove-worker-runs" aria-label="Recent Grove Builder runs">
          {snapshot.runs.map((run) => (
            <a key={run.id} className="grove-worker-run" href={run.url} target="_blank" rel="noopener noreferrer">
              <span className={'grove-worker-pin grove-worker-pin--' + run.status} aria-hidden="true" />
              <span className="grove-worker-meta">
                <strong>{run.title}</strong>
                <small>RUN #{run.id} {run.startedAt ? '· ' + new Date(run.startedAt).toLocaleString() : ''}</small>
              </span>
              <span className="grove-worker-result">{statusText(run.status)}</span>
              <ExternalLink size={12} aria-hidden="true" />
            </a>
          ))}
        </div>
      )}
      <div className="grove-worker-foot">
        <span>READ-ONLY TELEMETRY</span>
        <span>{refreshing ? 'SYNCING…' : 'CHECKS EVERY 90 SEC'}</span>
      </div>
    </section>
  );
}
