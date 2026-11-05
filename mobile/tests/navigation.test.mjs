import test from 'node:test';
import assert from 'node:assert/strict';
import { getRequestRoute } from '../src/navigation/requestRoute.js';
import { RequestController } from '../src/core/request.js';

test('waits for storage restoration before choosing a route', () => {
  assert.equal(getRequestRoute({ ready: false, request: null, phase: 'idle' }), null);
});

test('start and saving use the initial route', () => {
  for (const phase of ['idle', 'saving']) {
    assert.equal(getRequestRoute({ ready: true, request: null, phase }), '/');
  }
});

test('saved request routes to pending while locating, offline or after interrupted sending', () => {
  for (const phase of ['locating', 'pending']) {
    assert.equal(getRequestRoute({ ready: true, request: { status: 'pending' }, phase }), '/pendiente');
  }
  assert.equal(getRequestRoute({ ready: true, request: { status: 'pending' }, phase: 'sending' }), '/enviando');
});

test('a durable confirmation routes to confirmed even if the previous screen was sending', () => {
  assert.equal(getRequestRoute({ ready: true, request: { status: 'confirmed' }, phase: 'sending' }), '/confirmada');
});

test('the same controller drives the complete route sequence and sends once', async () => {
  let disk = null;
  let releaseSend;
  let sends = 0;
  const controller = new RequestController({
    read: async () => disk,
    write: async value => { disk = structuredClone(value); },
    id: () => 'navigation-test',
    locate: async () => ({ latitude: 20.65, longitude: -103.55, accuracy: 10, capturedAt: new Date().toISOString() }),
    send: async () => {
      sends++;
      await new Promise(resolve => { releaseSend = resolve; });
      return { id: 'demo', confirmedAt: new Date().toISOString(), simulated: true };
    },
  });
  const route = () => getRequestRoute(controller.snapshot());
  await controller.restore();
  assert.equal(route(), '/');
  controller.setConnection(false);
  await controller.create();
  assert.equal(route(), '/pendiente');
  controller.setConnection(true);
  assert.equal(route(), '/enviando');
  releaseSend();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(route(), '/confirmada');
  assert.equal(sends, 1);
  assert.equal(disk.id, 'navigation-test');
  await controller.reset();
  assert.equal(route(), '/');
});
