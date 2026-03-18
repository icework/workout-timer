import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Dockerfile runtime packaging', () => {
  it('builds frontend assets from source in a builder stage', async () => {
    const dockerfile = await readFile(join(process.cwd(), 'Dockerfile'), 'utf8');

    expect(dockerfile).toContain('FROM node:22-alpine AS builder');
    expect(dockerfile).toContain('RUN npm ci');
    expect(dockerfile).toContain('RUN npm run build');
  });

  it('copies built dist from the builder stage instead of a tracked local dist folder', async () => {
    const dockerfile = await readFile(join(process.cwd(), 'Dockerfile'), 'utf8');

    expect(dockerfile).toContain('COPY --from=builder /app/dist ./dist/');
    expect(dockerfile).toContain('COPY src/ ./src/');
    expect(dockerfile).not.toContain('COPY dist/ ./dist/');
  });
});
