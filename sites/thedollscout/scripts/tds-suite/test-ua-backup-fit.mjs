import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateFit, estimateRuntime } from '../../collector-assets/ua-backup/backup-fit.mjs';

// Complete connector/polarity details are synthetic test fixtures.
const router = { volts: 12, amps: 1, connector: '5.5x2.1', polarity: 'center-positive' };
const onu = { volts: 9, amps: 0.6, connector: '5.5x2.5', polarity: 'center-positive' };
const routerPort = { volts: 12, amps: 1.5, connectors: ['5.5x2.1'], polarity: 'center-positive' };
const onuPort = { volts: 9, amps: 2, connectors: ['5.5x2.5'], polarity: 'center-positive' };
const ups = { maxWatts: 18, wattHours: 36, ports: [routerPort, onuPort] };

test('checks both physical ports and supports matching devices in either order', () => {
  assert.deepEqual(evaluateFit([router, onu], ups), { status: 'match', reasons: [] });
  assert.deepEqual(evaluateFit([onu, router], ups), { status: 'match', reasons: [] });
  assert.equal(evaluateFit([router, onu], { ...ups, maxWatts: 17.4 }).status, 'match');
});

test('tries alternatives before assigning the only port that fits the other device', () => {
  const secondRouter = { ...router, connector: '5.5x2.5' };
  const ports = [{ ...routerPort, connectors: ['5.5x2.1', '5.5x2.5'] }, routerPort];
  assert.equal(evaluateFit([router, secondRouter], { ...ups, maxWatts: 24, ports }).status, 'match');
});

test('does not treat a splitter or one multi-connector port as two physical ports', () => {
  const twoRouters = [router, { ...router, amps: 0.5 }];
  assert.deepEqual(evaluateFit(twoRouters, ups), { status: 'incompatible', reasons: ['distinct-ports'] });
});

test('rejects independent total, per-port, voltage, connector and polarity mismatches', () => {
  assert.deepEqual(evaluateFit([{ ...router, amps: 2 }, onu], ups), {
    status: 'incompatible', reasons: ['total-power']
  });
  const perPort = { ...ups, maxWatts: 60 };
  for (const [device, reason] of [
    [{ ...router, amps: 2 }, 'port-current'],
    [{ ...router, volts: 15 }, 'voltage'],
    [{ ...router, connector: '3.5x1.35' }, 'connector'],
    [{ ...router, polarity: 'center-negative' }, 'polarity']
  ]) {
    assert.deepEqual(evaluateFit([device, onu], perPort), { status: 'incompatible', reasons: [reason] });
  }
});

test('holds recommendation when device or UPS evidence is missing', () => {
  assert.deepEqual(evaluateFit([{ ...router, connector: null }, onu], ups), {
    status: 'unconfirmed', reasons: ['missing-connection-spec']
  });
  assert.deepEqual(evaluateFit([router, onu], { ...ups, ports: [routerPort, { ...onuPort, polarity: '' }] }), {
    status: 'unconfirmed', reasons: ['missing-connection-spec']
  });
  assert.deepEqual(evaluateFit([{ ...router, amps: '' }, onu], ups), {
    status: 'unconfirmed', reasons: ['missing-device-rating']
  });
  assert.deepEqual(evaluateFit([router, onu], { ...ups, maxWatts: null }), {
    status: 'unconfirmed', reasons: ['missing-ups-rating']
  });
  assert.equal(evaluateFit([router, onu], null).status, 'unconfirmed');
});

test('a documented power conflict takes precedence over missing connection details', () => {
  assert.deepEqual(evaluateFit([{ ...router, amps: 2, connector: null, polarity: null }, onu], ups), {
    status: 'incompatible', reasons: ['total-power']
  });
  assert.deepEqual(evaluateFit([{ ...router, amps: 2 }, onu], {
    ...ups, maxWatts: 60, ports: [{ ...routerPort, polarity: null }, onuPort]
  }), { status: 'incompatible', reasons: ['port-current'] });
});

test('runtime needs measured combined watts, battery Wh and a usable load', () => {
  assert.deepEqual(estimateRuntime(ups, 6), { minHours: 3.9, maxHours: 5.1 });
  for (const watts of [undefined, 0, -6, '6', NaN, Infinity, 19]) {
    assert.equal(estimateRuntime(ups, watts), null);
  }
  assert.equal(estimateRuntime({ ...ups, wattHours: null }, 6), null);
});

test('an explicit user cable check resolves an unknown, but never overrides a published mismatch', () => {
  const router = { volts: 12, amps: 1 };
  const onu = { volts: 9, amps: 0.6 };
  const ups = {
    maxWatts: 18,
    ports: [{ volts: 12, amps: 1.5 }, { volts: 9, amps: 2 }],
  };
  assert.equal(evaluateFit([router, onu], ups).status, 'unconfirmed');
  assert.equal(evaluateFit([router, onu], ups, { connectionsVerified: true }).status, 'match');
  assert.equal(evaluateFit([router, {...onu, volts: 12}], ups, { connectionsVerified: true }).status, 'incompatible');
  const ratedUps = {
    ...ups,
    ports: [{ ...ups.ports[0], connectors: ['5.5x2.5'] }, ups.ports[1]],
  };
  assert.equal(evaluateFit([{...router, connector:'5.5x2.1'}, onu], ratedUps, { connectionsVerified: true }).status, 'incompatible');
});
