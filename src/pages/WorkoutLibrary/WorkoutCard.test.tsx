import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { WorkoutCard } from './index';

describe('WorkoutLibrary WorkoutCard', () => {
  it('renders a dedicated control to open workout details from the card', () => {
    const markup = renderToStaticMarkup(
      <WorkoutCard
        workout={{
          id: 'workout-1',
          title: 'Test',
          description: 'Sample',
          blocks: [],
          estimatedDurationSec: 180,
          createdAt: new Date('2026-03-17T00:00:00Z'),
          updatedAt: new Date('2026-03-17T00:00:00Z'),
          isDeleted: false,
        }}
        onOpen={() => {}}
        onStart={() => {}}
        onEdit={() => {}}
        onDelete={() => {}}
        onDuplicate={() => {}}
      />
    );

    expect(markup).toContain('aria-label="Open Test details"');
  });
});
