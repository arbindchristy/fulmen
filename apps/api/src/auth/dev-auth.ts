import type { RequestHandler } from 'express';

export interface DevAuthContext {
  userId: string;
  tenantId: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      auth: DevAuthContext;
    }
  }
}

export function createDevAuthMiddleware(defaults: DevAuthContext): RequestHandler {
  return (request, _response, next) => {
    request.auth = {
      userId: request.header('x-fulmen-user-id') ?? defaults.userId,
      tenantId: request.header('x-fulmen-tenant-id') ?? defaults.tenantId,
      role: request.header('x-fulmen-role') ?? defaults.role,
    };

    next();
  };
}
