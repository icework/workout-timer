import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { EmptyState } from './index';

describe('WorkoutLibrary EmptyState', () => {
  it('shows a single clear create-workout action without a decorative plus badge', () => {
    const markup = renderToStaticMarkup(<EmptyState onCreate={() => {}} />);

    expect(markup.match(/<button/g)).toHaveLength(1);
    expect(markup).not.toContain('rounded-full bg-blue-100');
  });
});
