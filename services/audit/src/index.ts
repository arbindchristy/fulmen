import { AuditService } from './events/audit-service.js';

export * from './events/audit-service.js';
export * from './evidence/evidence-store.js';
export * from './retention/retention-policy.js';

export function createAuditService() {
  return new AuditService();
}
