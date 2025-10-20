import { redactSensitive, toJsonWithLimit } from '@cnc-quote/shared';

describe('AuditService helpers', () => {
  it('redacts sensitive keys recursively', () => {
    const payload = {
      authToken: 'secret-token',
      nested: {
        password: 'P@ssw0rd',
        keep: 'value',
      },
      items: [
        { apiKey: 'abc123', note: 'ok' },
        'plain',
      ],
    };

    const result = redactSensitive(payload) as any;

    expect(result.authToken).toBe('[redacted]');
    expect(result.nested.password).toBe('[redacted]');
    expect(result.nested.keep).toBe('value');
    expect(result.items[0].apiKey).toBe('[redacted]');
    expect(result.items[0].note).toBe('ok');
    expect(result.items[1]).toBe('plain');
  });

  it('truncates payloads larger than JSON limit', () => {
    const huge = {
      values: Array.from({ length: 5000 }, () => 'x'.repeat(100)),
    };
    const result = toJsonWithLimit(huge);
    expect(result).toEqual({ truncated: true });
  });

  it('preserves serializable payloads under limit', () => {
    const payload = { name: 'test', amount: 42 };
    const result = toJsonWithLimit(payload);
    expect(result).toEqual(payload);
  });
});
