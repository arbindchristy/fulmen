import type { RunSnapshot } from '../runs/run-record.js';

export function createPendingRun(summary: string): RunSnapshot {
  return {
    status: 'pending',
    summary,
  };
}
