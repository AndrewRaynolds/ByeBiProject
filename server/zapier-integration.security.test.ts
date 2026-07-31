import { describe, expect, it } from 'vitest';
import { parseZapierWebhookUrl } from './zapier-integration';

describe('Zapier webhook URL validation', () => {
  it('accepts only HTTPS Zapier hook URLs', () => {
    expect(
      parseZapierWebhookUrl('https://hooks.zapier.com/hooks/catch/123/abc/'),
    ).toBe('https://hooks.zapier.com/hooks/catch/123/abc/');
  });

  it.each([
    'http://hooks.zapier.com/hooks/catch/123/abc/',
    'https://localhost/internal',
    'https://hooks.zapier.com.attacker.example/internal',
    'https://user:password@hooks.zapier.com/hooks/catch/123/abc/',
  ])('rejects unsafe webhook target %s', (url) => {
    expect(parseZapierWebhookUrl(url)).toBeNull();
  });
});
