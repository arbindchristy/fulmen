import express from 'express';

import { createAuditService, LocalEvidenceStore } from '@fulmen/audit';
import { createGuardAgent } from '@fulmen/guard-agent';
import { createOrchestrator } from '@fulmen/orchestrator';
import { createPolicyDecisionService } from '@fulmen/policy-engine';
import { createToolGateway } from '@fulmen/tool-gateway';

import { createDevAuthMiddleware } from '../auth/dev-auth.js';
import type { AppEnv } from '../config/env.js';
import { createHealthRouter } from '../health/health-router.js';
import { createRoutes } from '../routes/index.js';
import { createWorkflowsRouter } from '../workflows/workflows-router.js';
import { createLocalDevCorsMiddleware } from './local-dev-cors.js';

export function createApp(env: AppEnv) {
  const app = express();
  const auditService = createAuditService();
  const guardAgent = createGuardAgent();
  const policyDecisionService = createPolicyDecisionService();
  const toolGateway = createToolGateway();

  const evidenceStore = new LocalEvidenceStore({
    rootPath: env.evidenceDir,
  });

  const orchestrator = createOrchestrator({
    auditService,
    guardAgent,
    policyDecisionService,
    toolGateway,
  });

  app.disable('x-powered-by');
  app.use(express.json());

  if (env.environment === 'development') {
    app.use(createLocalDevCorsMiddleware(env.webOrigin));
  }

  app.use(
    createDevAuthMiddleware({
      role: env.defaultRole,
      tenantId: env.defaultTenantId,
      userId: env.defaultUserId,
    }),
  );

  app.use(createHealthRouter(env));
  app.use(
    createRoutes({
      auditService,
      guardAgent,
      orchestrator,
    }),
  );
  app.use(createWorkflowsRouter(orchestrator));

  app.get('/', (_request, response) => {
    response.json({
      name: 'fulmen-api',
      status: 'bootstrapped',
      evidenceRoot: evidenceStore.getRootPath(),
    });
  });

  return app;
}
