/** Fixture paths for Node tests only — not imported by the Worker. */
export const FIXTURE_PATHS = {
  openai: 'src/citations/adapters/fixtures/openai-2026-08.json',
  gemini: 'src/citations/adapters/fixtures/gemini-2026-08.json',
};

export function verifyFixtures(readJson, parseModelResponse) {
  const errors = [];
  for (const [name, relPath] of Object.entries(FIXTURE_PATHS)) {
    try {
      const fixture = readJson(relPath);
      const result = parseModelResponse(name, fixture);
      if (!result.citations?.length && !result.answerText) {
        errors.push(`${name}: empty parse`);
      }
      if (result.model !== name) {
        errors.push(`${name}: model mismatch`);
      }
    } catch (err) {
      errors.push(`${name}: ${err.message}`);
    }
  }
  return errors;
}
