import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

import { createLocalDevCorsMiddleware } from '../src/app/local-dev-cors.js';

describe('@fulmen/api local dev cors middleware', () => {
  it('allows approval inbox headers for localhost preflight requests', () => {
    const middleware = createLocalDevCorsMiddleware('http://localhost:3000');
    const headers = new Map<string, string>();
    const sendStatus = vi.fn();
    const next = vi.fn();

    const request = {
      method: 'OPTIONS',
      header(name: string) {
        return name.toLowerCase() === 'origin' ? 'http://localhost:3000' : undefined;
      },
    } as Request;

    const response = {
      header(name: string, value: string) {
        headers.set(name, value);
        return this;
      },
      sendStatus,
    } as unknown as Response;

    middleware(request, response, next);

    expect(headers.get('Access-Control-Allow-Origin')).toBe(
      'http://localhost:3000',
    );
    expect(headers.get('Access-Control-Allow-Methods')).toBe('GET,POST,OPTIONS');
    expect(headers.get('Access-Control-Allow-Headers')).toBe(
      'content-type,x-fulmen-role',
    );
    expect(sendStatus).toHaveBeenCalledWith(204);
    expect(next).not.toHaveBeenCalled();
  });
});
