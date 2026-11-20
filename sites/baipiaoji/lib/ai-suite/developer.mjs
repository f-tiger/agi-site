import { tools as documents } from './developer-json.mjs';
import { tools as graphs } from './developer-graphs.mjs';
import { tools as identifiers } from './developer-identifiers.mjs';
import { tools as color } from './developer-color.mjs';
import { tools as dates } from './developer-dates.mjs';
import { tools as codecs } from './developer-codecs.mjs';
import { tools as discrete } from './developer-discrete.mjs';
import { tools as systems } from './developer-systems.mjs';
import { tools as delivery } from './developer-delivery.mjs';

export const tools = [
  ...documents,
  ...graphs,
  ...identifiers,
  ...color,
  ...dates,
  ...codecs,
  ...discrete,
  ...systems,
  ...delivery,
];
