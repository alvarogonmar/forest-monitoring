// The durable request is authoritative, including after reopening or a deep link.
export function getRequestRoute(state) {
  if (!state.ready) return null;
  if (!state.request) return '/';
  if (state.request.status === 'confirmed') return '/confirmada';
  if (state.phase === 'sending') return '/enviando';
  return '/pendiente';
}
