const positiveNumber = value => Number.isFinite(value) && value > 0;
const knownConnector = value => typeof value === 'string' && /^\d+(?:\.\d+)?x\d+(?:\.\d+)?$/.test(value);
const knownPolarity = value => value === 'center-positive' || value === 'center-negative';
const unique = items => [...new Set(items)];

function exceeds(value, limit) {
  return value - limit > 1e-9;
}

function checkPort(device, port, connectionsVerified) {
  const blocked = [];
  const missing = [];

  if (!positiveNumber(device?.volts) || !positiveNumber(device?.amps)) {
    missing.push('missing-device-rating');
  }
  if (!positiveNumber(port?.volts) || !positiveNumber(port?.amps)) {
    missing.push('missing-ups-rating');
  }
  if (positiveNumber(device?.volts) && positiveNumber(port?.volts) && device.volts !== port.volts) {
    return { blocked: ['voltage'], missing };
  }
  if (positiveNumber(device?.amps) && positiveNumber(port?.amps) && exceeds(device.amps, port.amps)) {
    blocked.push('port-current');
  }

  const statedConnectors = Array.isArray(port?.connectors) ? port.connectors.filter(knownConnector) : [];
  if (!knownConnector(device?.connector) || !statedConnectors.length) {
    if (!connectionsVerified) missing.push('missing-connection-spec');
  } else if (!statedConnectors.includes(device.connector)) {
    blocked.push('connector');
  }
  if (!knownPolarity(device?.polarity) || !knownPolarity(port?.polarity)) {
    if (!connectionsVerified) missing.push('missing-connection-spec');
  } else if (device.polarity !== port.polarity) {
    blocked.push('polarity');
  }
  return { blocked, missing };
}

// Ports are distinct physical DC sockets. Each entry describes the socket and
// documented compatible cables, including polarity at the device end.
// Only a user's explicit check for this kit and UPS can fill missing
// connection specifications. Published contradictions still block a match.
export function evaluateFit(devices, ups, { connectionsVerified = false } = {}) {
  if (!Array.isArray(devices) || devices.length !== 2) {
    return { status: 'unconfirmed', reasons: ['missing-device-rating'] };
  }

  const combinedWatts = devices.reduce((watts, device) => {
    if (!positiveNumber(device?.volts) || !positiveNumber(device?.amps)) return watts;
    return watts + device.volts * device.amps;
  }, 0);
  if (positiveNumber(ups?.maxWatts) && exceeds(combinedWatts, ups.maxWatts)) {
    return { status: 'incompatible', reasons: ['total-power'] };
  }
  if (!Array.isArray(ups?.ports) || !ups.ports.length) {
    return { status: 'unconfirmed', reasons: ['missing-ups-rating'] };
  }

  const portChecks = devices.map(device => ups.ports.map(port => checkPort(device, port, connectionsVerified === true)));
  const available = portChecks.map(checks => checks.flatMap((check, index) => check.blocked.length ? [] : [index]));
  if (available.some(matchingPorts => !matchingPorts.length)) {
    const reasons = portChecks.flatMap((checks, deviceIndex) => {
      if (available[deviceIndex].length) return [];
      const blocked = unique(checks.flatMap(check => check.blocked));
      // Surface the limits on same-voltage ports, when there are any.
      return blocked.length > 1 ? blocked.filter(reason => reason !== 'voltage') : blocked;
    });
    return { status: 'incompatible', reasons: unique(reasons) };
  }

  const overallMissing = positiveNumber(ups.maxWatts) ? [] : ['missing-ups-rating'];
  let closestReasons = null;
  for (const routerPort of available[0]) {
    for (const onuPort of available[1]) {
      if (routerPort === onuPort) continue;
      const missing = unique([
        ...overallMissing,
        ...portChecks[0][routerPort].missing,
        ...portChecks[1][onuPort].missing
      ]);
      if (!missing.length) return { status: 'match', reasons: [] };
      if (closestReasons === null || missing.length < closestReasons.length) {
        closestReasons = missing;
      }
    }
  }
  return closestReasons === null
    ? { status: 'incompatible', reasons: ['distinct-ports'] }
    : { status: 'unconfirmed', reasons: closestReasons };
}

// The caller supplies measured combined load, not the adapter nameplate limit.
// The effective battery fraction is a scenario assumption, not a measurement.
export function estimateRuntime(ups, measuredWatts) {
  if (!positiveNumber(ups?.wattHours) || !positiveNumber(measuredWatts)) return null;
  if (positiveNumber(ups.maxWatts) && exceeds(measuredWatts, ups.maxWatts)) return null;

  const minHours = ups.wattHours * 0.65 / measuredWatts;
  const maxHours = ups.wattHours * 0.85 / measuredWatts;
  if (!Number.isFinite(maxHours)) return null;
  return {
    minHours: Number(minHours.toFixed(1)),
    maxHours: Number(maxHours.toFixed(1))
  };
}
