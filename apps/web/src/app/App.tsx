import { useEffect, useState } from 'react';

import { ApprovalQueue } from '../features/approvals/ApprovalQueue';
import { AuditPanel } from '../features/audit/AuditPanel';
import { ChangeRequestPanel } from '../features/change-requests/ChangeRequestPanel';

interface HealthState {
  status: 'idle' | 'loading' | 'ok' | 'error';
  message: string;
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

export function App() {
  const [health, setHealth] = useState<HealthState>({
    status: 'idle',
    message: 'Waiting for API check.',
  });

  useEffect(() => {
    let cancelled = false;

    async function loadHealth() {
      setHealth({
        status: 'loading',
        message: 'Checking API health.',
      });

      try {
        const response = await fetch(`${apiBaseUrl}/healthz`);

        if (!response.ok) {
          throw new Error(`Health check failed with status ${response.status}`);
        }

        const payload = (await response.json()) as { status: string };

        if (!cancelled) {
          setHealth({
            status: 'ok',
            message: `API responded with status "${payload.status}".`,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setHealth({
            status: 'error',
            message:
              error instanceof Error ? error.message : 'Unknown health check failure.',
          });
        }
      }
    }

    void loadHealth();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="page-shell">
      <header className="hero">
        <p className="eyebrow">Fulmen MVP</p>
        <h1>Governed multi-agent change preview</h1>
        <p className="subtitle">
          Submit one change-control request, inspect bounded agent reasoning, and see
          the system policy posture before any execution path exists.
        </p>
        <div className={`health health-${health.status}`}>{health.message}</div>
      </header>

      <section className="primary-panel">
        <ChangeRequestPanel />
      </section>

      <section className="grid secondary-grid">
        <ApprovalQueue />
        <AuditPanel />
      </section>
    </main>
  );
}
