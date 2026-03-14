export interface RunSnapshot {
  status: 'pending' | 'planning' | 'awaiting_approval' | 'executing' | 'completed' | 'failed';
  summary: string;
}
