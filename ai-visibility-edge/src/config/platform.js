/** Worker admin/API host — not a customer tenant apex. */
export function isPlatformHost(hostname) {
  const host = String(hostname ?? '').toLowerCase();
  if (!host || host === 'localhost' || host === '127.0.0.1') return true;
  return host.endsWith('.workers.dev');
}
