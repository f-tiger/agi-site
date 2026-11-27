import {getTool} from './trade-workbench/engine.mjs';

const actions = ['signup', 'guest_run', 'run', 'example', 'membership_open', 'csv'];
const pathPattern = /^\/trade-workbench\/([a-z0-9-]{1,64})\/([a-z_]+)$/;

export function parseTradeWorkbenchEvent(path) {
  if (path === '/trade-workbench/directory/signup') return {slug:'',action:'signup'};
  const match = pathPattern.exec(path);
  if (!match || !actions.includes(match[2]) || !getTool(match[1])) return null;
  return {slug: match[1], action: match[2]};
}

export const emptyTradeWorkbenchCounts = () => Object.fromEntries(actions.map(action => [action, 0]));
