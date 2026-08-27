export async function withFailOpen(request, env, ctx, handler, budgetMs = 50) {
  const passthrough = () => fetch(request);

  try {
    const result = await Promise.race([
      handler(request, env, ctx),
      new Promise((resolve) => setTimeout(() => resolve(null), budgetMs)),
    ]);
    return result ?? passthrough();
  } catch (err) {
    ctx.waitUntil(logError(env, err));
    return passthrough();
  }
}

async function logError(env, err) {
  console.error('[aiv] fail-open passthrough', err?.message ?? err);
}
