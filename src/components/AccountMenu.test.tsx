import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AccountMenu } from './AccountMenu';

describe('AccountMenu', () => {
  it('shows the signed-in username in the header trigger', () => {
    const markup = renderToStaticMarkup(
      <AccountMenu username="alice" onLogout={() => {}} />
    );

    expect(markup).toContain('alice');
    expect(markup).toContain('Account menu');
  });
});
