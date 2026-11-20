import statements from './operations/statements.mjs';
import treasury from './operations/treasury.mjs';
import subscriptions from './operations/subscriptions.mjs';
import inventory from './operations/inventory.mjs';
import fulfillment from './operations/fulfillment.mjs';
import workforce from './operations/workforce.mjs';
import projects from './operations/projects.mjs';
import commerce from './operations/commerce.mjs';
import marketing from './operations/marketing.mjs';

export const tools = [
  ...statements,
  ...treasury,
  ...subscriptions,
  ...inventory,
  ...fulfillment,
  ...workforce,
  ...projects,
  ...commerce,
  ...marketing,
];
