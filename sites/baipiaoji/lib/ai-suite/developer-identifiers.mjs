import { define, string, requireValue as check, round } from './developer-common.mjs';

const clean = (s) => s.replace(/[ -]/g, '').toUpperCase();
function matches(s, regex) {
  check(regex.test(s), 'Identifier has an invalid length or character.');
  return s;
}
const gtinDigit = (body) =>
  String((10 - ([...body].reverse().reduce((sum, n, i) => sum + Number(n) * (i % 2 ? 1 : 3), 0) % 10)) % 10);
function mod97(text) {
  return [...text].reduce(
    (rem, c) =>
      [...(c >= 'A' && c <= 'Z' ? String(c.charCodeAt(0) - 55) : c)].reduce(
        (r, d) => (r * 10 + Number(d)) % 97,
        rem,
      ),
    0,
  );
}
function luhn(s) {
  return (
    [...s].reverse().reduce((sum, c, i) => {
      const v = Number(c) * (i % 2 ? 2 : 1);
      return sum + (v > 9 ? v - 9 : v);
    }, 0) %
      10 ===
    0
  );
}
function berArc(value) {
  const parts = [Number(value & 127n)];
  value >>= 7n;
  while (value) {
    parts.push(128 + Number(value & 127n));
    value >>= 7n;
  }
  return parts.reverse();
}
const d = (id, zh, en, cn, desc, example, fn) =>
  define(id, zh, en, cn, desc, [string('value', '输入值', 'Input value', example, 240)], fn);
export const tools = [
  d(
    'isbn10-to-isbn13',
    '旧书号转 ISBN-13',
    'Convert ISBN-10 to ISBN-13',
    '验证十位书号的校验位，再生成带 978 前缀的十三位书号。',
    'Verify the ISBN-10 check digit and calculate its equivalent 978 ISBN-13.',
    '0-306-40615-2',
    (text) => {
      const s = matches(clean(text), /^\d{9}[\dX]$/);
      check(
        [...s].reduce((v, n, i) => v + (10 - i) * (n === 'X' ? 10 : Number(n)), 0) % 11 === 0,
        'Invalid ISBN-10 checksum.',
      );
      const body = '978' + s.slice(0, 9);
      return { isbn13: body + gtinDigit(body) };
    },
  ),
  d(
    'gtin-normalize',
    'GTIN 商品标识标准化',
    'Normalize a GTIN',
    '验证 GTIN-8、12、13 或 14 的校验位，并补为十四位标识。',
    'Validate an 8-, 12-, 13- or 14-digit GS1 trade identifier and normalize it to GTIN-14.',
    '4006381333931',
    (text) => {
      const s = matches(clean(text), /^(?:\d{8}|\d{12,14})$/);
      check(gtinDigit(s.slice(0, -1)) === s.at(-1), 'Bad GTIN checksum.');
      return { gtin14: s.padStart(14, '0') };
    },
  ),
  d(
    'issn-check-digit',
    '期刊号校验位',
    'Calculate an ISSN check digit',
    '从七位期刊序号计算 ISSN 的模十一校验位。',
    'Calculate the modulo-11 check character for a seven-digit serial identifier.',
    '0378595',
    (text) => {
      const s = matches(clean(text), /^\d{7}$/);
      const n = (11 - ([...s].reduce((v, c, i) => v + Number(c) * (8 - i), 0) % 11)) % 11;
      return { issn: s.slice(0, 4) + '-' + s.slice(4) + (n === 10 ? 'X' : n) };
    },
  ),
  d(
    'orcid-validate',
    '核对 ORCID 研究者标识',
    'Check an ORCID identifier',
    '验证研究者标识使用的 MOD 11-2 校验位。',
    'Validate the MOD 11-2 check character of an ORCID researcher identifier.',
    '0000-0002-1825-0097',
    (text) => {
      const s = matches(clean(text), /^\d{15}[\dX]$/),
        n = (12 - [...s.slice(0, -1)].reduce((v, c) => ((v + Number(c)) * 2) % 11, 0)) % 11;
      return { valid: s.at(-1) === (n === 10 ? 'X' : String(n)), canonical: s.match(/.{4}/g).join('-') };
    },
  ),
  d(
    'isin-checksum',
    '核对证券 ISIN',
    'Check an ISIN checksum',
    '展开字母并核对十二位证券标识的 Luhn 校验。',
    'Expand letters and verify the Luhn checksum in a 12-character securities identifier.',
    'US0378331005',
    (text) => {
      const s = matches(clean(text), /^[A-Z]{2}[A-Z0-9]{9}\d$/);
      return {
        countryPrefix: s.slice(0, 2),
        valid: luhn(s.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55))),
      };
    },
  ),
  d(
    'iban-mod97',
    'IBAN 模 97 校验',
    'Check the IBAN mod-97 remainder',
    '移动国家码与校验位并验证模 97 余数，检查范围仅含格式与校验和。',
    'Rearrange the IBAN and check its mod-97 remainder, covering syntax and checksum only.',
    'GB82 WEST 1234 5698 7654 32',
    (text) => {
      const s = matches(text.replace(/\s/g, '').toUpperCase(), /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/);
      const remainder = mod97(s.slice(4) + s.slice(0, 4));
      return { country: s.slice(0, 2), remainder, checksumValid: remainder === 1 };
    },
  ),
  d(
    'lei-checksum',
    '法人标识编码校验',
    'Verify an LEI checksum',
    '检查二十位法人标识的字符格式及 MOD 97-10 校验和。',
    'Verify the character format and MOD 97-10 checksum of a 20-character legal entity identifier.',
    '5493001KJTIIGC8Y1R12',
    (text) => {
      const s = matches(clean(text), /^[A-Z0-9]{18}\d{2}$/);
      return { issuerPrefix: s.slice(0, 4), checksumValid: mod97(s) === 1 };
    },
  ),
  d(
    'vin-north-america-check',
    '北美 VIN 校验位',
    'Verify a North American VIN check digit',
    '按北美 VIN 的字符转换与位置权重核对第九位。',
    'Use North American VIN transliteration and position weights to verify the ninth character.',
    '1M8GDM9AXKP042788',
    (text) => {
      const vin = matches(clean(text), /^[A-HJ-NPR-Z0-9]{17}$/);
      const letters = 'ABCDEFGHJKLMNPRSTUVWXYZ',
        values = '12345678123457923456789',
        weights = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
      const n =
        [...vin].reduce(
          (sum, c, i) => sum + Number(/\d/.test(c) ? c : values[letters.indexOf(c)]) * weights[i],
          0,
        ) % 11;
      const expected = n === 10 ? 'X' : String(n);
      return { expected, valid: vin[8] === expected };
    },
  ),
  d(
    'ulid-components',
    '解析 ULID 时间部分',
    'Decode a ULID timestamp',
    '提取 Crockford Base32 编码中的毫秒时间和随机字段。',
    'Extract the millisecond timestamp and encoded randomness from a Crockford Base32 ULID.',
    '01ARZ3NDEKTSV4RRFFQ69G5FAV',
    (text) => {
      const s = matches(text.toUpperCase(), /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/),
        alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
      const ms = [...s.slice(0, 10)].reduce((v, c) => v * 32 + alphabet.indexOf(c), 0);
      return { milliseconds: ms, utc: new Date(ms).toISOString(), randomPart: s.slice(10) };
    },
  ),
  d(
    'objectid-components',
    '解析 BSON ObjectId',
    'Decode a BSON ObjectId',
    '将 24 位十六进制 ObjectId 拆为 UTC 秒、进程随机段和计数器。',
    'Split a 24-hex BSON ObjectId into UTC time, process-random bytes and counter.',
    '507f1f77bcf86cd799439011',
    (text) => {
      const s = matches(text.toLowerCase(), /^[0-9a-f]{24}$/);
      return {
        utc: new Date(parseInt(s.slice(0, 8), 16) * 1000).toISOString(),
        processRandom: s.slice(8, 18),
        counter: parseInt(s.slice(18), 16),
      };
    },
  ),
  d(
    'discord-snowflake-parts',
    '解析 Discord Snowflake',
    'Decode a Discord snowflake',
    '按 Discord 纪元和位布局提取时间、工作进程和序号。',
    'Decode the Discord epoch timestamp, worker, process and increment fields of a snowflake.',
    '175928847299117063',
    (text) => {
      const n = BigInt(matches(text, /^\d{1,20}$/));
      check(n < 1n << 64n, 'Snowflake exceeds 64 bits.');
      return {
        utc: new Date(Number(n >> 22n) + 1420070400000).toISOString(),
        worker: Number((n >> 17n) & 31n),
        process: Number((n >> 12n) & 31n),
        increment: Number(n & 4095n),
      };
    },
  ),
  d(
    'bic-structure',
    '拆解 BIC 机构码',
    'Parse BIC identifier structure',
    '检查八位或十一位代码格式，并分离机构、国家、位置和分支。',
    'Check eight- or eleven-character syntax and separate institution, country, location and branch fields.',
    'DEUTDEFF500',
    (text) => {
      const s = matches(clean(text), /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}(?:[A-Z0-9]{3})?$/);
      return {
        institution: s.slice(0, 4),
        country: s.slice(4, 6),
        location: s.slice(6, 8),
        branch: s.slice(8) || 'XXX',
      };
    },
  ),
  d(
    'container-code-check',
    '集装箱箱号校验位',
    'Calculate an ISO 6346 check digit',
    '用箱主码、设备类别和序号计算集装箱校验位。',
    'Calculate a freight container check digit from the owner prefix, category and six-digit serial.',
    'CSQU305438',
    (text) => {
      const s = matches(clean(text), /^[A-Z]{3}[UJZ]\d{6}$/);
      let sum = 0;
      for (const [i, c] of [...s].entries()) {
        const n = /\d/.test(c) ? Number(c) : c.charCodeAt(0) - 55;
        sum += (/\d/.test(c) ? n : n + Math.floor((n - 1) / 10)) * 2 ** i;
      }
      return { container: s + ((sum % 11) % 10) };
    },
  ),
  d(
    'cas-registry-check',
    'CAS 登记号校验',
    'Verify a CAS registry number',
    '按位加权检查带分段的 CAS 登记号末位。',
    'Check the weighted final digit of a hyphenated CAS Registry Number.',
    '64-17-5',
    (text) => {
      const s = matches(text, /^\d{2,7}-\d{2}-\d$/).replaceAll('-', '');
      const digit = [...s.slice(0, -1)].reverse().reduce((v, c, i) => v + Number(c) * (i + 1), 0) % 10;
      return { expected: digit, valid: Number(s.at(-1)) === digit };
    },
  ),
  d(
    'imei-check-digit',
    '计算 IMEI 校验位',
    'Calculate an IMEI check digit',
    '从十四位设备号主体生成完整 IMEI。',
    'Calculate the Luhn check digit of a fourteen-digit device identifier body.',
    '49015420323751',
    (text) => {
      const s = matches(text, /^\d{14}$/);
      const digit = Array.from({ length: 10 }, (_, i) => i).find((i) => luhn(s + i));
      return { imei: s + digit };
    },
  ),
  d(
    'nmea-sentence-checksum',
    '计算 NMEA 句子校验和',
    'Compute an NMEA sentence checksum',
    '对逗号分隔的 ASCII 载荷计算逐字节异或并生成完整句子。',
    'XOR the ASCII payload bytes and assemble a checksummed NMEA sentence.',
    'GPTXT,01,01,02,READY',
    (text) => {
      matches(text, /^[\x20-\x7e]+$/);
      check(!text.includes('*') && !text.includes('$'), 'Enter only the sentence body.');
      const sum = [...text]
        .reduce((v, c) => v ^ c.charCodeAt(0), 0)
        .toString(16)
        .toUpperCase()
        .padStart(2, '0');
      return { checksum: sum, sentence: '$' + text + '*' + sum };
    },
  ),
  d(
    'midi-note-frequency',
    'MIDI 音符频率',
    'Resolve a MIDI note frequency',
    '以 A4 为 440 Hz，在十二平均律中计算 MIDI 音高的名称和频率。',
    'Convert a MIDI pitch into its note name and frequency at A4 = 440 Hz.',
    '69',
    (text) => {
      const n = Number(matches(text, /^\d{1,3}$/));
      check(n <= 127, 'MIDI pitch must be between 0 and 127.');
      return {
        note:
          ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][n % 12] + (Math.floor(n / 12) - 1),
        hz: round(440 * 2 ** ((n - 69) / 12)),
      };
    },
  ),
  d(
    'oid-ber-content',
    'OID 编码为 BER 内容字节',
    'Encode OID BER content octets',
    '将点分 ASN.1 对象标识符编码为 BER 的值字节。',
    'Encode a dotted ASN.1 object identifier into BER value octets, excluding tag and length.',
    '1.2.840.113549',
    (text) => {
      matches(text, /^(?:0|[1-9]\d{0,16})(?:\.(?:0|[1-9]\d{0,16})){1,23}$/);
      const a = text.split('.').map(BigInt);
      check(a[0] <= 2n && (a[0] === 2n || a[1] <= 39n), 'Invalid initial OID arcs.');
      const bytes = [40n * a[0] + a[1], ...a.slice(2)].flatMap(berArc);
      return { hex: bytes.map((n) => n.toString(16).padStart(2, '0')).join(' ') };
    },
  ),
  d(
    'modified-eui64',
    '生成 Modified EUI-64',
    'Build a modified EUI-64 identifier',
    '从六字节 MAC 插入 FFFE 并翻转通用位，输出接口标识符。',
    'Insert FFFE and invert the universal bit of a six-octet MAC to form an IPv6 interface ID.',
    '00:25:96:12:34:56',
    (text) => {
      const s = matches(text.toLowerCase(), /^(?:[\da-f]{2}:){5}[\da-f]{2}$/).split(':');
      s[0] = (parseInt(s[0], 16) ^ 2).toString(16).padStart(2, '0');
      s.splice(3, 0, 'ff', 'fe');
      return { interfaceId: s.join('').match(/.{4}/g).join(':') };
    },
  ),
  d(
    'cusip-check-digit',
    '计算 CUSIP 校验位',
    'Calculate a CUSIP check digit',
    '对八位证券标识主体计算交替权重校验位。',
    'Derive the alternating-weight check digit from an eight-character CUSIP body.',
    '03783310',
    (text) => {
      const s = matches(clean(text), /^[A-Z0-9*@#]{8}$/);
      const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ*@#';
      const sum = [...s].reduce((v, c, i) => {
        const n = chars.indexOf(c) * (i % 2 ? 2 : 1);
        return v + Math.floor(n / 10) + (n % 10);
      }, 0);
      return { cusip: s + ((10 - (sum % 10)) % 10) };
    },
  ),
];
