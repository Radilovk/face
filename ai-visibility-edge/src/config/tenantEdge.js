import biocode from '../../config/tenants/biocode-bg.com.json' with { type: 'json' };
import daotslabna from '../../config/tenants/daotslabna.com.json' with { type: 'json' };

/** Git-managed tenant edge config — bundled on deploy (aiv-deploy). */
const BY_HOST = {
  'biocode-bg.com': biocode,
  'www.biocode-bg.com': biocode,
  'daotslabna.com': daotslabna,
  'www.daotslabna.com': daotslabna,
};

export function getTenantEdgeConfig(hostname) {
  const host = String(hostname ?? '').toLowerCase();
  return BY_HOST[host] ?? null;
}

export function isEdgeEnabled(hostname) {
  const cfg = getTenantEdgeConfig(hostname);
  return Boolean(cfg?.edge?.enabled);
}
