import { define as d, string, number, requireValue as check } from './developer-common.mjs';

const dayMs = 86400000;
function date(text) {
  check(/^\d{4}-\d{2}-\d{2}$/.test(text) && text.slice(0, 4) >= '1600', 'Use YYYY-MM-DD between 1600 and 9999.');
  const dt = new Date(text + 'T00:00:00Z');
  check(Number.isFinite(+dt) && short(dt) === text, 'Invalid Gregorian calendar date.');
  return dt;
}
function short(dt) {
  const iso = dt.toISOString();
  check(!iso.startsWith('+') && !iso.startsWith('-'), 'Result is outside the four-digit year range.');
  return iso.slice(0, 10);
}
const utc = (y, m, d = 1) => new Date(Date.UTC(y, m - 1, d));
const shift = (dt, n) => new Date(+dt + n * dayMs);
const length = (y, m) => utc(y, m + 1, 0).getUTCDate();
const leap = (y) => y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
const dow = (dt) => dt.getUTCDay() || 7;
const pick = string('date', '公历日期', 'Gregorian date', '2024-02-29', 10, date);
const year = number('year', '公历年份', 'Gregorian year', 2024, 1600, 9999, true);
const month = number('month', '月份', 'Month', 2, 1, 12, true);
const weekday = number('weekday', '星期几（周一为 1）', 'ISO weekday (Monday = 1)', 4, 1, 7, true);
const nth = number('occurrence', '第几次', 'Occurrence', 2, 1, 5, true);
const another = string('end', '结束日期（含）', 'End date (inclusive)', '2024-03-05', 10, date);
function ordered(a, b) {
  check(+b >= +a, 'End date must be on or after the start.');
}
const calendar = (id, zh, en, cn, desc, fields, fn) => d('calendar-' + id, zh, en, cn, desc, fields, fn);
export const tools = [
  calendar(
    'ordinal-date',
    '公历序数日期',
    'Gregorian ordinal date',
    '计算某日是一年中的第几天，并输出 ISO 序数日期。',
    'Find the day of year and format the ISO ordinal date.',
    [pick],
    (a) => {
      const y = a.getUTCFullYear(),
        ordinal = 1 + (a - utc(y, 1)) / dayMs;
      return { ordinal, iso: y + '-' + String(ordinal).padStart(3, '0') };
    },
  ),
  calendar(
    'from-ordinal',
    '序数日期转公历',
    'Resolve an ordinal day',
    '按指定年份检查天数范围并还原公历日期。',
    'Resolve a day number within a year, respecting leap-year limits.',
    [year, number('ordinal', '年内日序', 'Ordinal day', 60, 1, 366, true)],
    (y, n) => {
      check(n <= (leap(y) ? 366 : 365), 'Ordinal exceeds the year length.');
      return { date: short(shift(utc(y, 1), n - 1)) };
    },
  ),
  calendar(
    'month-layout',
    '生成月历网格',
    'Build a Monday-first month grid',
    '按星期一至星期日排布当月日期，空白位置用 null 表示。',
    'Arrange a calendar month in Monday-first rows with null padding.',
    [year, month],
    (y, m) => {
      const cells = Array(dow(utc(y, m)) - 1).fill(null);
      for (let i = 1; i <= length(y, m); i++) cells.push(i);
      while (cells.length % 7) cells.push(null);
      return { weeks: Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7)) };
    },
  ),
  calendar(
    'month-end-offset',
    '跨月日期偏移',
    'Shift by calendar months',
    '按月偏移并将超出目标月的日号收缩至月末。',
    'Shift a date by signed calendar months, clamping its day to the target month end.',
    [pick, number('months', '偏移月数', 'Signed month offset', 12, -1200, 1200, true)],
    (a, offset) => {
      const target = utc(a.getUTCFullYear(), a.getUTCMonth() + 1 + offset);
      const limit = length(target.getUTCFullYear(), target.getUTCMonth() + 1);
      const day = Math.min(limit, a.getUTCDate());
      target.setUTCDate(day);
      return { date: short(target), clamped: day !== a.getUTCDate() };
    },
  ),
  calendar(
    'nth-weekday',
    '每月第几个星期几',
    'Find an nth weekday in a month',
    '定位指定月份第 N 次出现的星期几，并报告不存在的情况。',
    'Locate an ordinal weekday within a month and report a missing fifth occurrence.',
    [year, month, weekday, nth],
    (y, m, w, n) => {
      const i = 1 + ((7 + w - dow(utc(y, m))) % 7) + (n - 1) * 7;
      return { date: i <= length(y, m) ? short(utc(y, m, i)) : null };
    },
  ),
  calendar(
    'last-weekday',
    '每月最后一个指定星期几',
    'Find the last weekday of a kind',
    '从月底反推某个星期几的最后一次出现日期。',
    'Find the last occurrence of a chosen ISO weekday by counting back from month end.',
    [year, month, weekday],
    (y, m, w) => {
      const last = utc(y, m, length(y, m));
      return { date: short(shift(last, -((dow(last) - w + 7) % 7))) };
    },
  ),
  calendar(
    'weekday-histogram',
    '日期区间星期分布',
    'Weekday distribution of a date range',
    '在含首尾日期区间内统计周一到周日各出现几次。',
    'Count occurrences of each ISO weekday in an inclusive range.',
    [pick, another],
    (a, b) => {
      ordered(a, b);
      const span = (b - a) / dayMs + 1,
        counts = Array(7).fill(Math.floor(span / 7));
      for (let i = 0; i < span % 7; i++) counts[(dow(a) - 1 + i) % 7]++;
      return { mondayThroughSunday: counts };
    },
  ),
  calendar(
    'western-easter',
    '计算西方复活节日期',
    'Calculate Gregorian Easter',
    '用公历教会历算法求指定年份西方复活节星期日。',
    'Apply Gregorian ecclesiastical computus to find Western Easter Sunday.',
    [year],
    (y) => {
      const a = y % 19,
        b = Math.floor(y / 100),
        c = y % 100,
        h = (19 * a + b - Math.floor(b / 4) - Math.floor((b - Math.floor((b + 8) / 25) + 1) / 3) + 15) % 30,
        l = (32 + 2 * (b % 4) + 2 * Math.floor(c / 4) - h - (c % 4)) % 7,
        x = h + l - 7 * Math.floor((a + 11 * h + 22 * l) / 451) + 114;
      return { easter: short(utc(y, Math.floor(x / 31), (x % 31) + 1)) };
    },
  ),
  calendar(
    'julian-day-number',
    '公历转儒略日序号',
    'Gregorian Julian day number',
    '返回该公历日期在 UTC 正午对应的整数儒略日。',
    'Return the integer Julian day number at UTC noon on the supplied Gregorian date.',
    [pick],
    (a) => ({ julianDayNumber: Math.floor(+a / dayMs) + 2440588 }),
  ),
  calendar(
    'mjd-at-midnight',
    '修正儒略日转公历',
    'Resolve a modified Julian day',
    '将 UTC 午夜的整数修正儒略日转换为公历日期。',
    'Resolve an integer Modified Julian Date at midnight UTC to a Gregorian date.',
    [number('mjd', '午夜 MJD', 'MJD at midnight', 60000, -94400, 2973000, true)],
    (n) => ({ date: short(new Date((n - 40587) * dayMs)) }),
  ),
  calendar(
    'quarter-bounds',
    '财政季度边界',
    'Fiscal quarter bounds',
    '按指定财年起始月份计算所在季度的首末日期。',
    'Determine quarter start and end using a configurable fiscal start month.',
    [pick, number('firstMonth', '财年起始月', 'Fiscal start month', 4, 1, 12, true)],
    (a, f) => {
      const y = a.getUTCFullYear(),
        m = a.getUTCMonth() + 1,
        elapsed = (m - f + 12) % 12,
        start = utc(y, m - (elapsed % 3)),
        finish = utc(start.getUTCFullYear(), start.getUTCMonth() + 4, 0);
      return { quarter: 1 + Math.floor(elapsed / 3), start: short(start), end: short(finish) };
    },
  ),
  calendar(
    'decade-bounds',
    '十年区间边界',
    'Find decade boundaries',
    '按以零结尾的起始年份求十年的首日和末日。',
    'Return the first and last day of the zero-based calendar decade containing a date.',
    [pick],
    (a) => {
      const first = Math.floor(a.getUTCFullYear() / 10) * 10;
      return { first: short(utc(first, 1)), last: short(utc(first + 9, 12, 31)) };
    },
  ),
  calendar(
    'month-slices',
    '按月拆分日期区间',
    'Split an interval by month',
    '将包含首末日期的区间拆成逐月片段，最多跨越 120 个月。',
    'Split an inclusive date interval into calendar-month slices over at most 120 months.',
    [pick, another],
    (a, b) => {
      ordered(a, b);
      const slices = [];
      let p = a;
      while (+p <= +b) {
        check(slices.length < 120, 'Use a range spanning at most 120 months.');
        const hi = new Date(Math.min(+b, +utc(p.getUTCFullYear(), p.getUTCMonth() + 2, 0)));
        slices.push({ from: short(p), to: short(hi), days: (hi - p) / dayMs + 1 });
        p = shift(hi, 1);
      }
      return { slices };
    },
  ),
  calendar(
    'date-series',
    '生成固定天数间隔日期',
    'Generate a day-stride date series',
    '从起始日开始按固定天数间隔生成有限的日期列表。',
    'Generate a bounded series of dates separated by a fixed day stride.',
    [
      pick,
      number('stride', '间隔天数', 'Day stride', 14, 1, 366, true),
      number('count', '日期数量', 'Occurrence count', 4, 1, 120, true),
    ],
    (a, n, k) => ({ dates: Array.from({ length: k }, (_, i) => short(shift(a, i * n))) }),
  ),
  calendar(
    'iso-week-to-monday',
    '从 ISO 周编号定位周一',
    'Resolve an ISO week to Monday',
    '验证指定年份中的 ISO 周编号并推算周一日期。',
    'Validate an ISO week number for its week-year and return its Monday.',
    [year, number('week', 'ISO 周数', 'ISO week number', 9, 1, 53, true)],
    (y, n) => {
      const anchor = utc(y, 1, 4),
        monday = shift(anchor, 1 - dow(anchor) + (n - 1) * 7);
      check(shift(monday, 3).getUTCFullYear() === y, 'ISO week does not exist in this year.');
      return { monday: short(monday) };
    },
  ),
  calendar(
    'anniversary',
    '下次周年纪念日',
    'Resolve a next anniversary',
    '按月日查找基准日期当天或之后的周年日，平年将闰日调整到二月末。',
    'Find the next anniversary on or after a reference date, observing February 29 on February 28 in common years.',
    [pick, another],
    (a, b) => {
      ordered(a, b);
      const m = a.getUTCMonth() + 1,
        occurs = (y) => utc(y, m, Math.min(a.getUTCDate(), length(y, m)));
      let y = b.getUTCFullYear();
      if (occurs(y) < b) y++;
      return { anniversary: short(occurs(y)), years: y - a.getUTCFullYear() };
    },
  ),
  calendar(
    'date-midpoint',
    '两个日期的中点',
    'Find a date midpoint',
    '计算区间时间中点，并返回 UTC 日期时间以保留半天精度。',
    'Calculate the temporal midpoint between two UTC midnights, preserving half days.',
    [pick, another],
    (a, b) => {
      ordered(a, b);
      return { utc: new Date((+a + +b) / 2).toISOString() };
    },
  ),
  calendar(
    'common-leap-list',
    '列出区间闰年',
    'List Gregorian leap years',
    '按四年、百年和四百年规则列出一段年份内的闰年。',
    'Apply the Gregorian 4-, 100- and 400-year rules to list leap years in a bounded period.',
    [year, number('span', '连续年数', 'Number of years', 12, 1, 400, true)],
    (y, n) => {
      check(y + n <= 10000, 'Year range ends after 9999.');
      return { years: Array.from({ length: n }, (_, i) => y + i).filter(leap) };
    },
  ),
  calendar(
    'rfc3339-local-date',
    '带偏移日期的 UTC 日界',
    'UTC day of an offset midnight',
    '把本地午夜及明确的分钟偏移换算为 UTC 时刻和跨日方向。',
    'Convert local midnight at a given minute offset to UTC and report the UTC day shift.',
    [pick, number('offset', 'UTC 偏移分钟数', 'UTC offset minutes', 330, -840, 840, true)],
    (a, m) => ({ utc: new Date(+a - m * 60000).toISOString(), dayShift: Math.floor(-m / 1440) || 0 }),
  ),
  calendar(
    'recurring-weekday-mask',
    '展开每周重复日期',
    'Expand a weekly weekday mask',
    '在有界日期区间内按所选星期几展开实际日期。',
    'Expand chosen ISO weekdays into matching dates in an inclusive range of up to one year.',
    [pick, another, string('weekdays', '星期数字，以逗号分隔', 'Comma-separated ISO weekdays', '1,3,5', 24)],
    (a, b, s) => {
      ordered(a, b);
      check(
        (b - a) / dayMs <= 366 && /^[1-7](?:\s*,\s*[1-7])*$/.test(s),
        'Use up to 367 dates and ISO weekdays from 1 to 7.',
      );
      const days = new Set(s.split(',').map(Number)),
        dates = [];
      for (let dt = a; dt <= b; dt = shift(dt, 1)) if (days.has(dow(dt))) dates.push(short(dt));
      return { dates };
    },
  ),
];
