import { useEffect, useState } from 'react';

import type { AuditEvent } from '@fulmen/contracts';

import { Panel } from '../../components/Panel';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

interface AuditPanelProps {
  entityId: string | null;
}

type AuditLoadState = 'idle' | 'loading' | 'ready' | 'error';

export function AuditPanel({ entityId }: AuditPanelProps) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loadState, setLoadState] = useState<AuditLoadState>('idle');
  const [message, setMessage] = useState('Waiting for evidence cycle activity.');

  useEffect(() => {
    let cancelled = false;

    async function loadEvents() {
      setLoadState('loading');
      setMessage('Loading audit events.');

      try {
        const params = new URLSearchParams();
        params.set('limit', '20');

        if (entityId) {
          params.set('entityId', entityId);
        }

        const response = await fetch(
          `${apiBaseUrl}/api/v1/audit-events?${params.toString()}`,
        );

        if (!response.ok) {
          throw new Error(`Audit feed failed with status ${response.status}.`);
        }

        const data = (await response.json()) as AuditEvent[];

        if (!cancelled) {
          setEvents(data);
          setLoadState('ready');
          setMessage(
            data.length > 0
              ? 'Append-only event trail for the active evidence cycle.'
              : 'No audit events recorded yet.',
          );
        }
      } catch (error) {
        if (!cancelled) {
          setLoadState('error');
          setMessage(
            error instanceof Error ? error.message : 'Unknown audit feed failure.',
          );
        }
      }
    }

    void loadEvents();

    return () => {
      cancelled = true;
    };
  }, [entityId]);

  return (
    <Panel title="Audit timeline">
      <p className="panel-intro">{message}</p>
      <div className={`approval-status approval-state-${loadState}`}>
        {loadState === 'ready'
          ? `${events.length} event${events.length === 1 ? '' : 's'} loaded`
          : loadState === 'loading'
            ? 'Refreshing audit feed'
            : loadState === 'error'
              ? 'Audit feed unavailable'
              : 'Audit feed idle'}
      </div>

      <div className="audit-timeline">
        {events.map((event) => (
          <article className="audit-card" key={event.id}>
            <div className="audit-header">
              <strong>{formatEventType(event.eventType)}</strong>
              <small>{new Date(event.occurredAt).toLocaleString()}</small>
            </div>
            <p>
              <strong>{event.actorType}</strong> {event.actorId}
            </p>
            <p className="audit-entity">
              {event.entityType} / {event.entityId}
            </p>
            <pre>{JSON.stringify(event.payload, null, 2)}</pre>
          </article>
        ))}
      </div>
    </Panel>
  );
}

function formatEventType(value: string): string {
  return value.replace(/[._]/g, ' ');
}
