// Guards the two field sanitisers in tools/analytics-worker/index.js.
//
// Why this test exists: from 2026-08-08 to 2026-09-08 the reader-supplied search query
// went through the STRUCTURAL sanitiser, whose regex deletes spaces and (being ASCII
// \w) every CJK character. site_search rows were written with an empty label, so the
// demand loop recorded THAT someone asked without recording WHAT they asked. Nothing
// failed, nothing errored, and the table looked plausible. A test is the only thing
// that catches that class of bug.
import { __test } from './analytics-worker/index.js';
const { clean, cleanText, LABEL_MAX } = __test;

let bad = 0;
const eq = (got, want, what) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) {
    bad++;
    console.log('FAIL ' + what);
    console.log('  got  ' + JSON.stringify(got));
    console.log('  want ' + JSON.stringify(want));
  } else console.log('ok   ' + what);
};

// The real 2026-09-05 rows: both of these stored '' before the fix.
eq(cleanText('巴菲特', LABEL_MAX), '巴菲特', 'CJK query survives');
eq(cleanText('AI 就业风险', LABEL_MAX), 'AI 就业风险', 'mixed CJK + ASCII survives');
eq(cleanText('are we close to agi', LABEL_MAX), 'are we close to agi', 'spaces survive');
eq(cleanText('AGI 2027', LABEL_MAX), 'AGI 2027', 'the home_suggest chip label survives');
eq(cleanText('when will agi arrive?', LABEL_MAX), 'when will agi arrive?', 'punctuation survives');

// Hygiene: the ops dashboard prints top labels back out, so markup must not survive.
eq(cleanText('<script>alert(1)</script>', LABEL_MAX), 'script alert(1) /script', 'angle brackets stripped');
eq(cleanText('a"b\'c`d\\e', LABEL_MAX), 'a b c d e', 'quotes and backslash stripped');
eq(cleanText('a b\tc\nd', LABEL_MAX), 'a b c d', 'control characters collapse to spaces');
eq(cleanText('   ', LABEL_MAX), null, 'whitespace-only is null, not an empty row');
eq(cleanText('', LABEL_MAX), null, 'empty is null');
eq(cleanText(undefined, LABEL_MAX), null, 'missing is null');
eq(cleanText('x'.repeat(200), LABEL_MAX).length, LABEL_MAX, 'capped at LABEL_MAX');
eq(LABEL_MAX, 80, 'cap matches the documented 80-char contract');

// The structural sanitiser must stay strict — these are our own identifiers.
eq(clean('site_search', 40), 'site_search', 'event name passes');
eq(clean('from:/zh/invest', 80), 'from:/zh/invest', 'internal-nav label passes');
eq(clean('drop table events', 40), 'droptableevents', 'structural fields still strip spaces');

console.log(bad ? '\n' + bad + ' FAILED' : '\nall sanitiser tests pass');
process.exit(bad ? 1 : 0);
