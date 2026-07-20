import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    const stat = statSync(full);
    return stat.isDirectory() ? files(full) : [full];
  });
}

describe('automatic document extraction removal', () => {
  it('does not keep automatic extraction code paths in src', () => {
    const combined = files(path.resolve('src')).map((file) => readFileSync(file, 'utf8')).join('\n');
    expect(combined).not.toMatch(new RegExp(['GOOGLE_APPLICATION', 'CREDENTIALS'].join('_') + '|' + ['extractIdentity', 'Documents'].join('')));
  });
});
