// Test-only guard: no synthetic call may reach public sites or a model provider.
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import dgram from 'node:dgram';
import { syncBuiltinESMExports } from 'node:module';
const denied = () => { throw Error('Network disabled in local MCP package smoke test'); };
globalThis.fetch = denied;
http.request = http.get = https.request = https.get = denied;
net.connect = net.createConnection = net.Socket.prototype.connect = denied;
dgram.createSocket = denied;
syncBuiltinESMExports();
