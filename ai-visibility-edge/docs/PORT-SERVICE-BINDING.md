# port Worker — adapter for ai-visibility-edge Service Binding

When `biocode-bg.com` routes through **ai-visibility-edge**, requests to **port** arrive via Service Binding with:

| Header | Example |
|--------|---------|
| `X-Forwarded-Host` | `www.biocode-bg.com` |
| `X-AIV-Host` | `www.biocode-bg.com` |
| `X-AIV-Internal` | `1` |

**Do not rely on `Host`** for tenant routing on internal calls — it would loop through Cloudflare public routing.

## Minimal port adapter (add near top of fetch handler)

```javascript
function resolveTenantHost(request) {
  if (request.headers.get('X-AIV-Internal') === '1') {
    return (
      request.headers.get('X-Forwarded-Host') ||
      request.headers.get('X-AIV-Host') ||
      new URL(request.url).hostname
    );
  }
  return new URL(request.url).hostname;
}

export default {
  async fetch(request, env, ctx) {
    const tenantHost = resolveTenantHost(request);
    // use tenantHost instead of new URL(request.url).hostname for routing
  },
};
```

Deploy **port** after this change, then deploy **ai-visibility-edge** with `[[services]] binding = "PORT"`.
