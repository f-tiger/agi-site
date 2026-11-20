import {
  define as d,
  string,
  number,
  requireValue as check,
  json,
  record,
  sortText,
  round,
} from './developer-common.mjs';

const versionPattern = /^(0|[1-9]\d{0,7})\.(0|[1-9]\d{0,7})\.(0|[1-9]\d{0,7})$/;
function parseVersion(v) {
  check(
    typeof v === 'string' && versionPattern.test(v),
    'Use three stable numeric version components, each at most eight digits.',
  );
  return v.split('.').map(Number);
}
const version = string('version', '稳定版本 x.y.z', 'Stable version x.y.z', '1.4.7', 32, parseVersion);
const doc = (key, zh, en, sample) => string(key, zh, en, JSON.stringify(sample), 6000, json);
function list(value) {
  check(Array.isArray(value) && value.length <= 100, 'Use a JSON array of up to 100 entries.');
  return value;
}
function object(value) {
  check(record(value), 'Expected a JSON object.');
  return value;
}
const name = (x) => typeof x === 'string' && x.length > 0 && x.length <= 120;
const numberIn = (v, min, max) => Number.isFinite(v) && v >= min && v <= max;
function sortVersion(a, b) {
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}
const manifest = doc('manifest', 'package.json 对象', 'Package manifest (JSON)', {
  name: 'sample',
  dependencies: { alpha: '^1.2.0', beta: '2.0.0' },
  devDependencies: { alpha: '1.5.0' },
  exports: { '.': './index.js', './utils': { import: './utils.mjs', require: './utils.cjs' } },
});
const cases = doc('tests', '测试结果 JSON 数组', 'Test results (JSON)', [
  { name: 'setup', status: 'pass', seconds: 1.1 },
  { name: 'publish', status: 'fail', seconds: 0.5 },
]);
function readCases(a) {
  return list(a).map((t) => {
    check(
      record(t) && name(t.name) && ['pass', 'fail', 'skip'].includes(t.status) && numberIn(t.seconds, 0, 86400),
      'Each test needs a name, pass/fail/skip status and seconds from 0 to 86400.',
    );
    return t;
  });
}
const xml = (s) =>
  String(s)
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ud800-\udfff\ufffe\uffff]/gu, '\uFFFD')
    .replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]);
function releases(text) {
  return text
    .split(/\r?\n/)
    .map((v) => v.trim())
    .filter(Boolean);
}
const commits = string(
  'commits',
  '提交主题，每行一个',
  'Commit subjects, one per line',
  'feat(api): add status\nfix: handle empty report\ndocs: update guide',
  4000,
  releases,
);
function conventional(s) {
  const m = /^([a-z]+)(?:\(([^()\r\n]+)\))?(!)?:\s+(.+)$/.exec(s);
  return m ? { type: m[1], scope: m[2] || null, breaking: Boolean(m[3]), description: m[4] } : null;
}
const release = (id, zh, en, cn, desc, fields, fn) => d('delivery-' + id, zh, en, cn, desc, fields, fn);
export const tools = [
  release(
    'semver-bump',
    '计算稳定版本升级',
    'Bump a stable SemVer',
    '按 major、minor 或 patch 计算下一个稳定版本并重置较低位。',
    'Increment a stable major, minor or patch version and reset lower components.',
    [version, string('level', '升级级别', 'Bump level', 'minor', 8)],
    (v, level) => {
      const i = ['major', 'minor', 'patch'].indexOf(level);
      check(i >= 0, 'Choose major, minor or patch.');
      return { next: v.map((x, j) => (j === i ? x + 1 : j > i ? 0 : x)).join('.') };
    },
  ),
  release(
    'semver-range',
    '筛选兼容稳定版本',
    'Select compatible stable versions',
    '在稳定版本列表中按完整固定版本、^ 或 ~ 规则筛选并排序。',
    'Filter and rank stable versions using one exact, caret or tilde x.y.z constraint.',
    [
      string('range', '版本约束', 'Version constraint', '^0.4.2', 40),
      doc('versions', '候选版本', 'Candidate versions', ['0.4.2', '0.4.9', '0.5.0']),
    ],
    (range, raw) => {
      const m = /^([~^]?)(.+)$/.exec(range);
      check(m, 'Empty constraint.');
      const base = parseVersion(m[2]),
        mode = m[1];
      const next = [...base];
      const k = mode === '~' ? 1 : base[0] ? 0 : base[1] ? 1 : 2;
      next[k]++;
      next.fill(0, k + 1);
      const allowed = list(raw)
        .map(parseVersion)
        .filter((v) =>
          mode ? sortVersion(v, base) >= 0 && sortVersion(v, next) < 0 : sortVersion(v, base) === 0,
        )
        .sort((a, b) => sortVersion(b, a))
        .map((v) => v.join('.'));
      return { highest: allowed[0] || null, matching: allowed };
    },
  ),
  release(
    'calendar-version',
    '按月生成 CalVer',
    'Build a monthly CalVer',
    '按 YYYY.MM.序号约定加入明确月份和本月发布序号。',
    'Build a YYYY.MM.sequence release version from a calendar month and monthly release counter.',
    [
      number('year', '年份', 'Year', 2026, 2000, 9999, true),
      number('month', '月份', 'Month', 11, 1, 12, true),
      number('sequence', '月内发布序号', 'Monthly sequence', 3, 1, 99999, true),
    ],
    (y, m, n) => ({ version: y + '.' + String(m).padStart(2, '0') + '.' + n }),
  ),
  release(
    'conventional-changelog',
    '提交主题生成分类变更记录',
    'Group conventional changelog entries',
    '按 Conventional Commits 主题类型整理说明，并列出未识别的行。',
    'Group Conventional Commit subjects by type and keep unmatched lines for manual review.',
    [commits],
    (lines) => {
      const buckets = new Map(),
        unmatched = [];
      for (const s of lines) {
        const c = conventional(s);
        if (!c) {
          unmatched.push(s);
          continue;
        }
        if (!buckets.has(c.type)) buckets.set(c.type, []);
        buckets.get(c.type).push({ scope: c.scope, description: c.description, breaking: c.breaking });
      }
      return { sections: Object.fromEntries(buckets), unmatched };
    },
  ),
  release(
    'commit-bump-signal',
    '由提交主题判定升级级别',
    'Infer a release bump from commit subjects',
    '按破坏标记、feat 和 fix 或 perf 的优先级推算发布级别。',
    'Choose a bump from subject-line breaking markers, features, fixes and performance changes.',
    [commits],
    (lines) => {
      const entries = lines.map(conventional).filter(Boolean),
        k = entries.some((c) => c.breaking)
          ? 'major'
          : entries.some((c) => c.type === 'feat')
            ? 'minor'
            : entries.some((c) => ['fix', 'perf'].includes(c.type))
              ? 'patch'
              : null;
      return { subjectBasedBump: k, recognized: entries.length };
    },
  ),
  release(
    'dependency-scope-conflicts',
    '检查依赖范围冲突',
    'Find dependency scope conflicts',
    '在常见 npm 依赖区段中查找同包名的不同版本声明。',
    'Find differing specs for the same package across common npm dependency sections.',
    [manifest],
    (data) => {
      object(data);
      const byName = new Map();
      for (const scope of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'])
        for (const [n, spec] of Object.entries(object(data[scope] ?? {}))) {
          check(typeof spec === 'string', 'Each dependency specification must be a string.');
          if (!byName.has(n)) byName.set(n, []);
          byName.get(n).push({ scope, spec });
        }
      return {
        conflicts: [...byName]
          .filter(([, list]) => new Set(list.map((x) => x.spec)).size > 1)
          .map(([name, entries]) => ({ name, entries })),
      };
    },
  ),
  release(
    'package-exports',
    '列出 npm 导出目标',
    'List npm package export targets',
    '遍历 package.json 的 exports 条件与回退数组，保留原路径。',
    'Walk the exports conditions and fallback arrays of a package manifest, preserving each declaration path.',
    [manifest],
    (data) => {
      object(data);
      const targets = [];
      function visit(v, path) {
        if (typeof v === 'string' || v === null) {
          targets.push({ path, target: v });
          return;
        }
        check(record(v) || Array.isArray(v), 'Unexpected exports target type.');
        for (const [k, x] of Object.entries(v)) visit(x, [...path, k]);
      }
      if (Object.hasOwn(data, 'exports')) visit(data.exports, []);
      return { targets };
    },
  ),
  release(
    'package-name-shape',
    '检查 npm 新包名常用格式',
    'Check common npm package name syntax',
    '检查小写 ASCII 新包名的长度、作用域、前缀和保留名称。',
    'Check common lowercase ASCII new-package syntax, including scope, reserved names and length.',
    [string('name', '候选包名', 'Package name', '@team/report-kit', 250)],
    (s) => {
      const shape = /^(?:@[a-z0-9-][a-z0-9._-]*\/)?[a-z0-9-][a-z0-9._-]*$/.test(s),
        reserved = ['node_modules', 'favicon.ico'].includes(s);
      return {
        syntaxValid: s.length <= 214 && shape && !reserved,
        scope: s.startsWith('@') ? s.split('/')[0] : null,
      };
    },
  ),
  release(
    'license-notices',
    '汇总组件许可声明',
    'Group component license notices',
    '按提供的许可表达式分组组件与版本，标记缺失声明。',
    'Group supplied component versions by license expression and mark missing declarations.',
    [
      doc('components', '组件元数据 JSON 数组', 'Component metadata (JSON)', [
        { name: 'kit', version: '1.0.0', license: 'MIT' },
        { name: 'docs', version: '2.0.0' },
      ]),
    ],
    (arr) => {
      const groups = new Map(),
        undeclared = [];
      for (const c of list(arr)) {
        check(record(c) && name(c.name) && name(c.version), 'Each component needs a name and version.');
        const label = c.name + '@' + c.version;
        if (!c.license) {
          undeclared.push(label);
          continue;
        }
        check(name(c.license), 'Use a short license expression.');
        if (!groups.has(c.license)) groups.set(c.license, []);
        groups.get(c.license).push(label);
      }
      return { byLicense: Object.fromEntries(groups), undeclared };
    },
  ),
  release(
    'test-shards',
    '按耗时拆分测试分片',
    'Balance test shards by runtime',
    '将历史耗时最长的测试依次分配给当前最空闲的分片。',
    'Assign longest historical test runtimes first to the currently least-loaded shard.',
    [cases, number('shards', '分片数', 'Shard count', 2, 1, 30, true)],
    (cases, k) => {
      const bins = Array.from({ length: k }, () => ({ tests: [], seconds: 0 }));
      for (const t of readCases(cases).sort((a, b) => b.seconds - a.seconds)) {
        const dest = bins.reduce((best, c) => (c.seconds < best.seconds ? c : best));
        dest.tests.push(t.name);
        dest.seconds += t.seconds;
      }
      return { shards: bins.map((b) => ({ ...b, seconds: round(b.seconds) })) };
    },
  ),
  release(
    'fail-fast-order',
    '按失败概率安排测试',
    'Order fail-fast tests',
    '以概率除以耗时排序，估算遇到首次失败时提前终止的预期运行时间。',
    'Rank independent tests by failure probability per second and estimate time with stop-on-first-failure.',
    [
      doc('tests', '测试概率和耗时', 'Test probabilities and runtimes', [
        { name: 'lint', seconds: 2, failChance: 0.1 },
        { name: 'build', seconds: 30, failChance: 0.5 },
      ]),
    ],
    (raw) => {
      const arr = list(raw);
      check(
        arr.every(
          (t) =>
            record(t) && name(t.name) && numberIn(t.seconds, 0.000001, 86400) && numberIn(t.failChance, 0, 1),
        ),
        'Enter name, positive seconds and failChance between 0 and 1.',
      );
      arr.sort((a, b) => b.failChance / b.seconds - a.failChance / a.seconds);
      let pass = 1,
        time = 0;
      for (const t of arr) {
        time += pass * t.seconds;
        pass *= 1 - t.failChance;
      }
      return { order: arr.map((t) => t.name), expectedSeconds: round(time) };
    },
  ),
  release(
    'test-history',
    '测试不稳定历史',
    'Summarize test outcome history',
    '从顺序执行记录中统计通过、失败和状态翻转。',
    'Count passes, failures and state transitions in an ordered sequence of test outcomes.',
    [string('history', '顺序状态 P 或 F', 'Ordered outcomes P or F', 'P P F P F', 2000)],
    (s) => {
      const chars = [...s.replace(/\s/g, '').toUpperCase()];
      check(chars.length > 0 && chars.every((c) => c === 'P' || c === 'F'), 'Supply a sequence of P and F.');
      const failures = chars.filter((x) => x === 'F').length;
      return {
        runs: chars.length,
        passes: chars.length - failures,
        failures,
        transitions: chars.slice(1).filter((c, i) => c !== chars[i]).length,
        mixed: failures > 0 && failures < chars.length,
      };
    },
  ),
  release(
    'junit-xml',
    '生成 JUnit XML 报告',
    'Generate a JUnit XML report',
    '把测试名称、状态和耗时映射到带有转义处理的 JUnit 测试套件。',
    'Render test names, outcomes and durations into an escaped JUnit XML suite.',
    [cases],
    (raw) => {
      const tests = readCases(raw);
      const rows = tests.map(
        (t) =>
          '<testcase name="' +
          xml(t.name) +
          '" time="' +
          t.seconds +
          '">' +
          (t.status === 'fail' ? '<failure/>' : t.status === 'skip' ? '<skipped/>' : '') +
          '</testcase>',
      );
      return {
        xml:
          '<testsuite tests="' +
          tests.length +
          '" failures="' +
          tests.filter((t) => t.status === 'fail').length +
          '" skipped="' +
          tests.filter((t) => t.status === 'skip').length +
          '">\n' +
          rows.join('\n') +
          '\n</testsuite>',
      };
    },
  ),
  release(
    'tap-report',
    '生成 TAP 测试报告',
    'Generate a TAP test report',
    '将测试状态编码为 TAP 第十三版计划、结果和跳过标记。',
    'Encode test outcomes into a TAP version 13 plan, results and skip directives.',
    [cases],
    (raw) => {
      const tests = readCases(raw);
      return {
        tap: [
          'TAP version 13',
          ...tests.map(
            (t, i) =>
              (t.status === 'fail' ? 'not ok ' : 'ok ') +
              (i + 1) +
              ' - ' +
              t.name.replace(/[\r\n#\\]/g, ' ') +
              (t.status === 'skip' ? ' # SKIP' : ''),
          ),
          '1..' + tests.length,
        ].join('\n'),
      };
    },
  ),
  release(
    'coverage-misses',
    '合并未覆盖行号',
    'Group uncovered line numbers',
    '将行覆盖计数中为零的行合并为相邻范围。',
    'Combine consecutive zero-hit lines from a numbered coverage map into ranges.',
    [doc('hits', '行号到执行次数映射', 'Line-number to hit-count map', { 4: 0, 5: 0, 6: 3, 8: 0 })],
    (raw) => {
      const pairs = Object.entries(object(raw));
      check(
        pairs.every(([k, v]) => /^([1-9]\d{0,8})$/.test(k) && Number.isSafeInteger(v) && v >= 0),
        'Use positive line numbers and nonnegative integer hit counts.',
      );
      const missed = pairs
          .filter(([, v]) => v === 0)
          .map(([k]) => Number(k))
          .sort((a, b) => a - b),
        ranges = [];
      for (const line of missed) {
        if (ranges.at(-1)?.end === line - 1) ranges.at(-1).end = line;
        else ranges.push({ start: line, end: line });
      }
      return { missed: missed.length, ranges };
    },
  ),
  release(
    'weighted-coverage',
    '汇总测试覆盖率',
    'Combine test coverage counts',
    '按真实分母合并各模块命中数与总数并计算覆盖率。',
    'Pool per-module hit and total counts before computing one weighted coverage fraction.',
    [
      doc('modules', '模块覆盖计数数组', 'Module coverage counts', [
        { hit: 90, total: 100 },
        { hit: 2, total: 5 },
      ]),
    ],
    (raw) => {
      let hit = 0,
        total = 0;
      for (const m of list(raw)) {
        check(
          record(m) &&
            Number.isInteger(m.hit) &&
            Number.isInteger(m.total) &&
            numberIn(m.hit, 0, m.total) &&
            m.total <= 1e9,
          'Use integer hit and total counts with hit no greater than total.',
        );
        hit += m.hit;
        total += m.total;
      }
      return { hit, total, fraction: total ? round(hit / total) : null };
    },
  ),
  release(
    'artifact-matrix',
    '检查二进制发布矩阵',
    'Check binary release matrix coverage',
    '对照操作系统和架构的笛卡尔积找出缺少的构建产物。',
    'Find missing binaries against the Cartesian product of requested operating systems and architectures.',
    [
      doc('platforms', '操作系统数组', 'Operating systems', ['linux', 'macos']),
      doc('arches', '架构数组', 'Architectures', ['arm64', 'x64']),
      doc('built', '已构建目标数组', 'Built targets', [{ platform: 'linux', arch: 'x64' }]),
    ],
    (systems, arches, done) => {
      const ps = [...new Set(list(systems))],
        as = [...new Set(list(arches))],
        bins = list(done);
      check(
        ps.length <= 20 &&
          as.length <= 20 &&
          ps.every(name) &&
          as.every(name) &&
          bins.every((b) => record(b) && name(b.platform) && name(b.arch)),
        'Use up to 20 named platforms and architectures, and target records.',
      );
      const existing = new Set(bins.map((b) => JSON.stringify([b.platform, b.arch])));
      return {
        missing: ps.flatMap((platform) =>
          as
            .filter((arch) => !existing.has(JSON.stringify([platform, arch])))
            .map((arch) => ({ platform, arch })),
        ),
        expected: ps.length * as.length,
      };
    },
  ),
  release(
    'git-hash-prefix',
    '无冲突 Git 缩写',
    'Find unambiguous Git abbreviations',
    '在提供的完整对象哈希集合中计算每个对象的唯一短前缀。',
    'Find a unique short prefix for each supplied full Git object ID within that input set.',
    [
      doc('hashes', '完整 Git 哈希数组', 'Full Git object IDs', [
        'abcdef0123456789abcdef0123456789abcdef01',
        'abcdef1123456789abcdef0123456789abcdef01',
      ]),
      number('minimum', '最短前缀位数', 'Minimum prefix length', 4, 1, 40, true),
    ],
    (raw, min) => {
      const hashes = list(raw);
      check(
        hashes.every((h) => typeof h === 'string' && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(h)),
        'Use 40- or 64-character hex object IDs.',
      );
      const unique = [...new Set(hashes.map((h) => h.toLowerCase()))];
      check(new Set(unique.map((h) => h.length)).size <= 1, 'Use one object ID format in the input set.');
      return {
        abbreviations: unique.map((hash) => {
          let i = min;
          while (i < hash.length && unique.some((h) => h !== hash && h.startsWith(hash.slice(0, i)))) i++;
          return { hash, prefix: hash.slice(0, i) };
        }),
      };
    },
  ),
  release(
    'api-symbol-change',
    '对比 API 导出签名',
    'Compare API export signatures',
    '对比两份符号到签名的映射，找出新增、移除与签名变更。',
    'Compare two symbol-to-signature manifests and list added, removed and changed public exports.',
    [
      doc('before', '旧符号映射', 'Earlier symbol map', { render: '(input) => string', load: '() => void' }),
      doc('after', '新符号映射', 'Later symbol map', {
        render: '(input, options) => string',
        save: '() => void',
      }),
    ],
    (a, b) => {
      object(a);
      object(b);
      check(
        [...Object.values(a), ...Object.values(b)].every((v) => typeof v === 'string'),
        'Each signature must be a string.',
      );
      const keys = Object.keys(a);
      return {
        removed: keys.filter((k) => !Object.hasOwn(b, k)).sort(sortText),
        added: Object.keys(b)
          .filter((k) => !Object.hasOwn(a, k))
          .sort(sortText),
        changed: keys
          .filter((k) => Object.hasOwn(b, k) && a[k] !== b[k])
          .map((symbol) => ({ symbol, before: a[symbol], after: b[symbol] })),
      };
    },
  ),
  release(
    'release-gates',
    '检查发布门禁记录',
    'Evaluate release gate records',
    '根据必需门禁列表核对通过、失败和缺失状态，返回可发布判定。',
    'Compare required gate names to pass/fail/pending observations and report release readiness.',
    [
      doc('required', '必需检查数组', 'Required gates', ['unit', 'build', 'smoke']),
      doc('observed', '检查状态映射', 'Observed gate statuses', {
        unit: 'pass',
        build: 'pass',
        smoke: 'pending',
      }),
    ],
    (raw, states) => {
      const names = [...new Set(list(raw))];
      object(states);
      check(
        names.length &&
          names.every(name) &&
          Object.values(states).every((x) => ['pass', 'fail', 'pending'].includes(x)),
        'Use required gate names and pass, fail or pending states.',
      );
      const blockers = names
        .filter((k) => !Object.hasOwn(states, k) || states[k] !== 'pass')
        .map((gate) => ({ gate, state: Object.hasOwn(states, gate) ? states[gate] : 'missing' }));
      return { ready: !blockers.length, blockers };
    },
  ),
];
