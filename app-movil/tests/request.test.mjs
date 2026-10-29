import test from 'node:test';
import assert from 'node:assert/strict';
import { RequestController } from '../src/core/request.ts';

const coordinates = { latitude: 20.654, longitude: -103.55, accuracy: 12, capturedAt: new Date().toISOString() };
const receipt = { id: 'DEMO-id', confirmedAt: new Date().toISOString(), simulated: true };
const pending = { version: 1, id: 'request-id', createdAt: new Date().toISOString(), coordinates, status: 'pending', receipt: null };
function setup(overrides = {}) {
  let disk = null;
  let sends = 0;
  const deps = { read: async () => disk, write: async r => { disk = structuredClone(r); }, locate: async () => coordinates,
    send: async () => { sends++; return receipt; }, id: () => 'request-id', ...overrides };
  return { deps, controller: new RequestController(deps), disk: () => disk, sends: () => sends };
}
const flush = () => new Promise(resolve => setImmediate(resolve));

test('offline: persist first, record GPS, restore after closing, send with same coordinates and ID', async () => {
  const h = setup();
  h.controller.setConnection(false);
  await h.controller.restore();
  await h.controller.create();
  assert.equal(h.disk().status, 'pending');
  assert.deepEqual(h.disk().coordinates, coordinates);
  assert.equal(h.sends(), 0);
  const reopened = new RequestController({ ...h.deps, locate: async () => { throw new Error('GPS must not be recaptured'); } });
  reopened.setConnection(true);
  await reopened.restore();
  assert.equal(reopened.snapshot().phase, 'confirmed');
  assert.equal(h.disk().id, 'request-id');
  assert.deepEqual(h.disk().coordinates, coordinates);
  assert.equal(h.sends(), 1);
});

test('online: duplicate taps create only one request and one send', async () => {
  const h = setup();
  h.controller.setConnection(true);
  await h.controller.restore();
  await Promise.all([h.controller.create(), h.controller.create(), h.controller.create()]);
  assert.equal(h.controller.snapshot().phase, 'confirmed');
  assert.equal(h.sends(), 1);
});

test('denied GPS: request stays saved without sending; explicit retry obtains location', async () => {
  let denied = true;
  const h = setup({ locate: async () => { if (denied) throw new Error('Permiso denegado'); return coordinates; } });
  h.controller.setConnection(true);
  await h.controller.restore();
  await h.controller.create();
  assert.equal(h.disk().coordinates, null);
  assert.equal(h.sends(), 0);
  assert.equal(h.controller.snapshot().error, 'Permiso denegado');
  denied = false;
  await h.controller.resume();
  assert.equal(h.controller.snapshot().phase, 'confirmed');
});

test('storage failure must not claim saved or send', async () => {
  const h = setup({ write: async () => { throw new Error('Disk full'); } });
  h.controller.setConnection(true);
  await h.controller.restore();
  await h.controller.create();
  assert.equal(h.controller.snapshot().request, null);
  assert.equal(h.controller.snapshot().phase, 'idle');
  assert.equal(h.sends(), 0);
  assert.ok(h.controller.snapshot().error);
});

test('unreadable storage blocks new requests, preserving the previous data', async () => {
  const h = setup({ read: async () => { throw new Error('Corrupt data'); } });
  await h.controller.restore();
  await h.controller.create();
  assert.equal(h.controller.snapshot().ready, false);
  assert.equal(h.sends(), 0);
});

test('connection lost during send cannot confirm; reconnect retries the same request', async () => {
  let release;
  let calls = 0;
  const h = setup({ read: async () => pending, send: async () => { calls++; if (calls === 1) await new Promise(r => { release = r; }); return receipt; } });
  h.controller.setConnection(true);
  const restored = h.controller.restore();
  await flush();
  assert.equal(h.controller.snapshot().phase, 'sending');
  h.controller.setConnection(false);
  release();
  await restored;
  assert.equal(h.controller.snapshot().phase, 'pending');
  h.controller.setConnection(true);
  await flush();
  assert.equal(h.controller.snapshot().phase, 'confirmed');
  assert.equal(h.disk().id, pending.id);
});

test('background interrupts confirmation and reopening retries', async () => {
  let release;
  let calls = 0;
  const h = setup({ read: async () => pending, send: async () => { if (++calls === 1) await new Promise(r => { release = r; }); return receipt; } });
  h.controller.setConnection(true);
  const restored = h.controller.restore();
  await flush();
  h.controller.setActive(false);
  release();
  await restored;
  assert.equal(h.controller.snapshot().phase, 'pending');
  h.controller.setActive(true);
  await flush();
  assert.equal(h.controller.snapshot().phase, 'confirmed');
});

test('confirmed request is restored without sending again and can start another demonstration', async () => {
  const h = setup({ read: async () => ({ ...pending, status: 'confirmed', receipt }) });
  h.controller.setConnection(true);
  await h.controller.restore();
  assert.equal(h.sends(), 0);
  assert.equal(h.controller.snapshot().phase, 'confirmed');
  await h.controller.reset();
  assert.equal(h.disk(), null);
  assert.equal(h.controller.snapshot().phase, 'idle');
});

test('unknown internet reachability keeps the request pending', async () => {
  const h = setup();
  await h.controller.restore();
  await h.controller.create();
  assert.equal(h.controller.snapshot().phase, 'pending');
  assert.equal(h.sends(), 0);
});

test('receipt storage failure preserves pending request and reports error', async () => {
  const h = setup({ read: async () => pending, write: async () => { throw new Error('Disk full'); } });
  h.controller.setConnection(true);
  await h.controller.restore();
  assert.equal(h.controller.snapshot().request.status, 'pending');
  assert.equal(h.controller.snapshot().phase, 'pending');
  assert.ok(h.controller.snapshot().error);
});
