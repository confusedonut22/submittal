export function findNextActive(hs, currentIdx = hs.length) {
  for (let i = currentIdx + 1; i < hs.length; i++) {
    if (!hs[i].done) return i;
  }
  for (let i = 0; i <= currentIdx && i < hs.length; i++) {
    if (!hs[i].done) return i;
  }
  return -1;
}
