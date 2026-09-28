import assert from 'node:assert/strict';
import {membershipTotals} from './membership_totals.mjs';
const row={admin:{ok:true,paid_orders:0,paid_members:0,active_members:0,unexpired_pending:0}};
assert.equal(membershipTotals([row]).paid_orders,0);
assert.equal(membershipTotals([row,{admin:{ok:false}}]).paid_orders,null);
assert.equal(membershipTotals([]).paid_orders,null);
assert.equal(membershipTotals([{admin:{...row.admin,paid_orders:2}},{admin:{...row.admin,paid_orders:3}}]).paid_orders,5);
console.log('PASS missing membership statistics remain unknown; observed zero remains zero');
