// Hands a fixed set of cards to explorer.html via the URL, so a worked
// example on Concepts can drop straight into the real, editable tool
// already loaded with equivalent cards. Plain JSON in a query param --
// no base64, URLSearchParams already handles encoding, and these specs
// are small (a handful of card configs, a ~70-cell array or two).

export function buildSeedUrl(cards, mode = '1d') {
  const params = new URLSearchParams();
  params.set('seed', JSON.stringify({ mode, cards }));
  return 'explorer.html?' + params.toString();
}

export function readSeedFromLocation() {
  if (typeof window === 'undefined') return null;
  const raw = new URLSearchParams(window.location.search).get('seed');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.cards) || !parsed.cards.length) return null;
    return parsed;
  } catch {
    return null;
  }
}
