import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';

beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/test';
  process.env.JWT_SECRET = 'x'.repeat(40);
  process.env.JWT_ISSUER = 'movemgmt-core-ms';
  process.env.JWT_AUDIENCE = 'movemgmt-fe';
  process.env.CORS_ORIGIN = 'http://localhost:5173';
  process.env.STORAGE_ROOT_PATH = '/tmp/movemgmt-test-storage';
  process.env.CARGOS_CONFIG_SECRET = 'y'.repeat(40);
});

describe('health', () => {
  it('/health/live returns ok without DB checks', async () => {
    const { createApp } = await import('../../src/app');
    const res = await request(createApp()).get('/health/live');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
