export function isValidTenantRow(row) {
  if (!row) return false;
  return (
    typeof row.id === 'string' &&
    typeof row.name === 'string' &&
    typeof row.apex_host === 'string'
  );
}
