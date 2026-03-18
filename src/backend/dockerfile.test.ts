import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Dockerfile runtime packaging', () => {
  it('copies src runtime modules needed by server.js', async () => {
    const dockerfile = await readFile(join(process.cwd(), 'Dockerfile'), 'utf8');

    expect(dockerfile).toContain('COPY src/ ./src/');
  });
});
