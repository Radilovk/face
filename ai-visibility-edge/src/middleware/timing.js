export function startTimer() {
  return Date.now();
}

export function elapsedMs(start) {
  return Date.now() - start;
}
