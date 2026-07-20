import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';

describe('env configuration contract', () => {
  it('uses isolated storage variables in tests', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'movemgmt-env-'));
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/test';
    process.env.JWT_SECRET = 'x'.repeat(40);
    process.env.JWT_ISSUER = 'test-issuer';
    process.env.JWT_AUDIENCE = 'test-audience';
    process.env.STORAGE_ROOT_PATH = root;
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.STORAGE_ROOT_PATH).toBe(root);
    rmSync(root, { recursive: true, force: true });
  });
});
