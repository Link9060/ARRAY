import { useEffect, useState } from 'react';
import { Activity, ExternalLink, RefreshCw } from 'lucide-react';
import {
  GROVE_ACTIONS_URL, fetchGroveWorkerRuns, fetchGroveReviewQueue,
  type WorkerRun, type WorkerRunsSnapshot, type GroveReviewQueue,
} from '../engine/githubWorkflow';

function statusText(status: WorkerRun['status']): string {
  return ({
    queued: 'QUEUED',
    running: 'RUNNING',
    success: 'WORKFLOW PASSED',
    failure: 'FAILED',
    cancelled: 'CANCELLED',
    other: 'CHECK RUN',
  })[status];
}

export default function GroveWorkerPanel() {
  const [snapshot, setSnapshot] = useState<WorkerRunsSnapshot | null>(null);
  const [error, setError] = useState('');
  const [queue, setQueue] = useState<GroveReviewQueue | null>(null);
  const [queueError, setQueueError] = useState('');
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
      }
      try {
        const result = await fetchGroveReviewQueue(controller.signal);
        if (alive) { setQueue(result); setQueueError(''); }
      } catch (cause) {
        if (alive && !controller.signal.aborted) {
          setQueueError(cause instanceof Error ? cause.message : 'Cannot load review queue.');
        }
      } finally {
        if (alive) setRefreshing(false);
        busy = false;
      }
    }
    void refresh();
    // Three public GitHub requests per refresh. 4-minute cadence avoids the usual
    // unauthenticated 60-requests-per-hour budget in an ordinary single tab.
    const timer = window.setInterval(() => { void refresh(); }, 240_000);
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
        Verified GitHub Actions runs, owner-issued ARRAY tasks, and draft code reviews.
        This panel is read-only; GPT can dispatch owner-authorized tasks through the GitHub connection.
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
      <div className="grove-review-section" aria-label="Grove Builder review queue">
        <div className="grove-review-title">
          <span>CODE REVIEW QUEUE</span>
          <span>{queue ? queue.reviews.length + ' OPEN DRAFTS / ' + queue.tasks.length + ' OPEN TASKS' : 'SYNCING'}</span>
        </div>
        {queueError && <p className="grove-worker-error" role="status">{queueError}</p>}
        {!queue && !queueError && <p className="grove-worker-empty">Checking GitHub for Builder pull requests…</p>}
        {queue && queue.reviews.length === 0 && <p className="grove-worker-empty">No Builder pull requests awaiting review.</p>}
        {queue && queue.reviews.map(pr => (
          <a key={'pr-' + pr.number} className="grove-review-entry" href={pr.url} target="_blank" rel="noopener noreferrer">
            <span className="grove-review-label">PR #{pr.number} <span>{pr.isDraft ? 'DRAFT / REVIEW' : 'OPEN / REVIEW'}</span></span>
            <strong>{pr.title}</strong>
            <ExternalLink size={12} aria-hidden="true" />
          </a>
        ))}
        {queue && queue.tasks.length > 0 && (
          <>
            <div className="grove-review-title"><span>OPEN ARRAY REQUESTS</span><span>GITHUB ISSUES</span></div>
            {queue.tasks.slice(0, 5).map(task => (
              <a key={'issue-' + task.number} className="grove-review-entry" href={task.url} target="_blank" rel="noopener noreferrer">
                <span className="grove-review-label">ISSUE #{task.number} <span>{task.mode.toUpperCase()}</span></span>
                <strong>{task.title}</strong>
                <ExternalLink size={12} aria-hidden="true" />
              </a>
            ))}
          </>
        )}
      </div>
      <div className="grove-worker-foot">
        <span>READ-ONLY TELEMETRY</span>
        <span>{refreshing ? 'SYNCING…' : 'CHECKS EVERY 4 MIN'}</span>
      </div>
    </section>
  );
}
