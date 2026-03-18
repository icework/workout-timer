import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LoginPage } from './index';

describe('LoginPage', () => {
  it('renders a username input and submit button', () => {
    const markup = renderToStaticMarkup(<LoginPage />);

    expect(markup).toContain('name="username"');
    expect(markup).toContain('Continue');
  });
});
