/** Auth status for dashboard (ADMIN_TOKEN configured on Worker). */
export function getAuthStatus(env) {
  return {
    admin_required: Boolean(env.ADMIN_TOKEN),
    hint: env.ADMIN_TOKEN
      ? 'Mutating API calls need Authorization: Bearer <ADMIN_TOKEN>.'
      : 'ADMIN_TOKEN not set — dev mode, mutations open.',
  };
}
