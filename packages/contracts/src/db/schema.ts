export const schemaTables = [
  'tenants',
  'users',
  'roles',
  'user_roles',
  'agent_definitions',
  'workflow_templates',
  'change_requests',
  'change_request_targets',
  'runs',
  'step_executions',
  'policy_bundles',
  'policy_decisions',
  'approval_requests',
  'approval_decisions',
  'tool_connectors',
  'tool_requests',
  'audit_events',
  'evidence_artifacts',
] as const;

export type SchemaTable = (typeof schemaTables)[number];
