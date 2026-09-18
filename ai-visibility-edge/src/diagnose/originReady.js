/**
 * Detect externally optimized sites (pilot Worker / Level 5 on origin).
 * Suppresses false AIV Edge recommendations when client data plane is already agent-native.
 */

export function isOriginAgentNativeReady(probe) {
  if (!probe) return false;
  const s = probe.signals ?? {};
  const checks = [
    s.ai_catalog_ok,
    s.llms_txt_ok,
    s.api_catalog_ok,
    s.auth_md_ok,
    s.content_signal_ok,
    !s.gptbot_blocked,
    (probe.jsonld_blocks ?? 0) > 0,
  ];
  const passed = checks.filter(Boolean).length;
  return passed >= 6;
}

export function shouldSuppressAivEdgeFindings(probe, tenant) {
  if (Boolean(tenant?.is_pilot)) return true;
  return isOriginAgentNativeReady(probe);
}

export function agentNativeScore(probe) {
  if (!probe?.signals) return 0;
  const s = probe.signals;
  return (
    (s.ai_catalog_ok ? 1 : 0) +
    (s.auth_md_ok ? 1 : 0) +
    (s.api_catalog_ok ? 1 : 0) +
    (s.llms_txt_ok ? 1 : 0) +
    (s.content_signal_ok ? 1 : 0) +
    (s.agentmap_ok ? 1 : 0) +
    (!s.gptbot_blocked ? 1 : 0)
  );
}
