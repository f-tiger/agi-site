import {tools as grounding} from './ai-eval-grounding.mjs';
import {tools as quality} from './ai-eval-quality.mjs';
import {tools as delivery} from './ai-eval-delivery.mjs';

export const tools = [...grounding, ...quality, ...delivery];
