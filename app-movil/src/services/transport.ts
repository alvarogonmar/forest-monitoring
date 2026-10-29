import type { HelpRequest } from '../core/request';

// FRONTEND ONLY: no HTTP request is made and no administrator receives this data.
// Replace this adapter with the future API; keep request.id as the idempotency key.
export async function simulatedTransport(request: HelpRequest, signal: AbortSignal): Promise<NonNullable<HelpRequest['receipt']>> {
  if (!request.coordinates) throw new Error('Falta la ubicación del dispositivo.');
  await new Promise<void>((resolve, reject) => {
    const cancel = () => {
      clearTimeout(timer);
      signal.removeEventListener('abort', cancel);
      reject(new Error('Envío interrumpido. La solicitud sigue guardada.'));
    };
    const timer = setTimeout(() => { signal.removeEventListener('abort', cancel); resolve(); }, 2800);
    signal.addEventListener('abort', cancel, { once: true });
    if (signal.aborted) cancel();
  });
  return { id: `DEMO-${request.id}`, confirmedAt: new Date().toISOString(), simulated: true };
}
