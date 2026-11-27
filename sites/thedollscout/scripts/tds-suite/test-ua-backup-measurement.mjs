import assert from 'node:assert/strict';
import test from 'node:test';
import {businessEvent} from '../../../../tools/fleet-analytics/business.mjs';

const host = 'thedollscout.com';
const paths = [
  '/ua/internet-bez-svitla',
  '/ua/dbzh/archer-c6-xz000-g3',
  '/ua/dbzh/archer-ax23-xz000-g7',
  '/ua/dbzh/archer-ax55-xz000-g3'
];
const names = ['tds_ua_backup_result', 'tds_ua_backup_shop'];

test('Ukrainian backup power tracks only the two fixed GA4 actions on its pages', () => {
  for (const pathname of paths) {
    for (const name of names) {
      assert.deepEqual(businessEvent(host, pathname, {name}), {
        name, tool_id: 'tds-ua-router-backup', repeat: true
      });
      assert.equal(businessEvent('getecoback.com', pathname, {name}), null);
      assert.equal(businessEvent(host, `${pathname}?qa=1`, {name}), null);
      assert.equal(businessEvent(host, `${pathname}/`, {name}), null);
      for (const field of ['model', 'address', 'load', 'url', 'result']) {
        assert.equal(businessEvent(host, pathname, {name, [field]: 'private'}), null);
      }
    }
    for (const name of ['tds_ua_backup_example', 'tds_ua_backup_purchase']) {
      assert.equal(businessEvent(host, pathname, {name}), null);
    }
  }
  for (const pathname of ['/', '/uk/', '/ua/', '/ua/dbzh/unlisted']) {
    for (const name of names) assert.equal(businessEvent(host, pathname, {name}), null);
  }
});
