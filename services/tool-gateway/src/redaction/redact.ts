export function redactSecrets(payload: Record<string, unknown>): Record<string, unknown> {
  const entries = Object.entries(payload).map(([key, value]) => {
    if (key.toLowerCase().includes('secret') || key.toLowerCase().includes('password')) {
      return [key, '[redacted]'];
    }

    return [key, value];
  });

  return Object.fromEntries(entries);
}
