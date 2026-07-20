import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';

beforeAll(() => {
  process.env.NODE_ENV = 'production';
  process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/test';
  process.env.JWT_SECRET = 'x'.repeat(40);
  process.env.JWT_ISSUER = 'movemgmt-core-ms';
  process.env.JWT_AUDIENCE = 'movemgmt-fe';
  process.env.CORS_ORIGIN = 'https://moveon.medinagroup.it';
  process.env.STORAGE_ROOT_PATH = '/tmp/movemgmt-test-storage';
  process.env.CARGOS_CONFIG_SECRET = 'y'.repeat(40);
});

describe('CORS', () => {
  it('accepts the production frontend origin on preflight', async () => {
    const { createApp } = await import('../../src/app');
    const res = await request(createApp()).options('/health/live').set('Origin', 'https://moveon.medinagroup.it').set('Access-Control-Request-Method', 'GET');
    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('https://moveon.medinagroup.it');
  });

  it('rejects an unauthorized origin', async () => {
    const { createApp } = await import('../../src/app');
    const res = await request(createApp()).options('/health/live').set('Origin', 'https://evil.example').set('Access-Control-Request-Method', 'GET');
    expect(res.status).toBe(403);
  });
});
