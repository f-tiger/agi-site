import { DACH_METER_TOOL, runDachMeterTool } from './regional-dach-meter.mjs';
import { UK_LAUNDRY_TOOL, runUkLaundryTool } from './regional-uk-laundry.mjs';
import { HOME_TOOLS, runHomeTool } from './home-purchase.mjs';
import { WORKFLOW_TOOLS, runWorkflowTool } from './collector-workflows.mjs';
import { matchesInputSchema } from './input-schema.mjs';
import { TDS_HOME_TOOL_COUNT } from './service.mjs';

export const TDS_TOOL_LANGUAGES = Object.freeze(['en', 'de', 'zh']);
const toolsByName = new Map();
const slugs = new Set();

function registerGroup(definitions, execute) {
  return definitions.map(definition => {
    if (!/^tds_[a-z0-9_]{2,59}$/.test(definition.name) ||
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(definition.slug) || definition.slug.length > 64 ||
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(definition.category) ||
        toolsByName.has(definition.name) || slugs.has(definition.slug)) {
      throw new Error('Invalid or duplicate public TDS tool identity');
    }
    slugs.add(definition.slug);
    toolsByName.set(definition.name, { definition, execute });
    return definition;
  });
}

export const REGIONAL_TDS_TOOLS = Object.freeze([DACH_METER_TOOL, UK_LAUNDRY_TOOL]);

export const TDS_TOOLS = Object.freeze([
  ...registerGroup(WORKFLOW_TOOLS, runWorkflowTool),
  ...registerGroup(HOME_TOOLS, runHomeTool),
  ...registerGroup([DACH_METER_TOOL], (_name, args, locale) => runDachMeterTool(args, locale)),
  ...registerGroup([UK_LAUNDRY_TOOL], (_name, args, locale) => runUkLaundryTool(args, locale)),
]);
if (TDS_TOOLS.length !== TDS_HOME_TOOL_COUNT) throw new Error('Invalid TDS tool count');

export function lookupTdsTool(name) {
  return toolsByName.get(name)?.definition ?? null;
}

export function runTdsTool(name, args, locale = 'en') {
  const entry = toolsByName.get(name);
  if (!entry) throw new RangeError('Unknown TDS tool');
  if (!matchesInputSchema(args, entry.definition.inputSchema)) throw new TypeError('Invalid TDS tool arguments');
  return entry.execute(name, args, TDS_TOOL_LANGUAGES.includes(locale) ? locale : 'en');
}
