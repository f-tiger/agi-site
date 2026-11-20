import { define as d, string, number, requireValue as check } from './developer-common.mjs';

function fromHex(value) {
  const text = value.replace(/\s/g, '');
  check(/^(?:[\da-fA-F]{2})*$/.test(text), 'Enter whole hexadecimal bytes.');
  return Uint8Array.from(text.match(/../g) || [], (v) => parseInt(v, 16));
}
const byteText = (b) => Array.from(b, (v) => v.toString(16).padStart(2, '0')).join(' ');
const bytes = string('bytes', '十六进制字节', 'Hexadecimal bytes', '43 61 66 c3 a9 21', 3000, fromHex);
const text = string('text', 'Unicode 文本', 'Unicode text', 'Cafe 123', 1500);
const digits = string('digits', '十进制数字串', 'Decimal digit string', '00123456', 200, (t) => {
  check(/^\d+$/.test(t), 'Enter decimal digits.');
  return t;
});
const integer = string('integer', '十进制整数', 'Decimal integer', '300', 25, (t) => {
  check(/^-?(?:0|[1-9]\d{0,19})$/.test(t), 'Enter an integer of up to 20 decimal digits.');
  return BigInt(t);
});
const bits = number('bits', '位宽', 'Bit width', 16, 1, 64, true);
const U64 = (1n << 64n) - 1n;
function uleb(n) {
  const output = [];
  do {
    let a = Number(n & 127n);
    n >>= 7n;
    if (n) a |= 128;
    output.push(a);
  } while (n);
  return output;
}
function packBase32(data) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let value = 0,
    count = 0,
    out = '';
  for (const b of data) {
    value = (value << 8) | b;
    count += 8;
    while (count >= 5) {
      count -= 5;
      out += alphabet[(value >> count) & 31];
    }
  }
  if (count) out += alphabet[(value << (5 - count)) & 31];
  return out.padEnd(Math.ceil(out.length / 8) * 8, '=');
}
function encode58(data) {
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let x = 0n;
  for (const b of data) x = x * 256n + BigInt(b);
  let out = '';
  while (x) {
    out = alphabet[Number(x % 58n)] + out;
    x /= 58n;
  }
  let zero = 0;
  while (zero < data.length && data[zero] === 0) zero++;
  return '1'.repeat(zero) + out;
}
function ascii85(data) {
  let out = '';
  for (let i = 0; i < data.length; i += 4) {
    const block = Array.from(data.slice(i, i + 4)),
      size = block.length;
    while (block.length < 4) block.push(0);
    let n = block.reduce((acc, b) => 256 * acc + b, 0);
    if (n === 0 && size === 4) {
      out += 'z';
      continue;
    }
    const group = Array(5);
    for (let j = 4; j >= 0; j--) {
      group[j] = String.fromCharCode(33 + (n % 85));
      n = Math.floor(n / 85);
    }
    out += group.slice(0, size + 1).join('');
  }
  return out;
}
export const tools = [
  d(
    'rfc4648-base32',
    'RFC 4648 Base32 编码',
    'Encode RFC 4648 Base32',
    '将二进制字节编码为含等号填充的大写 Base32。',
    'Encode hex bytes as uppercase RFC 4648 Base32 with standard padding.',
    [bytes],
    (b) => ({ base32: packBase32(b) }),
  ),
  d(
    'base58-byte-encoding',
    'Base58 字节编码',
    'Encode Base58 bytes',
    '以 Bitcoin 字母表编码字节串，并保留前导零。',
    'Encode bytes using the Bitcoin Base58 alphabet while preserving leading zero octets.',
    [bytes],
    (b) => ({ base58: encode58(b) }),
  ),
  d(
    'adobe-ascii85',
    'Adobe Ascii85 编码',
    'Encode Adobe Ascii85',
    '以四字节分组编码二进制内容，支持零组简写和尾组截断。',
    'Encode four-octet groups as Adobe Ascii85 with zero compression and a shortened trailing group.',
    [bytes],
    (b) => ({ ascii85: '<~' + ascii85(b) + '~>' }),
  ),
  d(
    'utf16-code-units',
    '查看 UTF-16 码元',
    'Inspect UTF-16 code units',
    '显示文本中的 UTF-16 码元序列及其位置。',
    'Display the hexadecimal UTF-16 code units and their offsets in the supplied string.',
    [text],
    (v) => ({
      units: Array.from({ length: v.length }, (_, offset) => ({
        offset,
        hex: v.charCodeAt(offset).toString(16).toUpperCase().padStart(4, '0'),
      })),
    }),
  ),
  d(
    'utf8-byte-offsets',
    '字符到 UTF-8 字节位置',
    'Map Unicode to UTF-8 byte offsets',
    '按 Unicode 码点标注 UTF-8 字节起点和 UTF-16 位置。',
    'Map each Unicode code point to its starting UTF-8 byte and UTF-16 unit offsets.',
    [text],
    (v) => {
      const mapping = [];
      let byte = 0,
        unit = 0;
      const encoder = new TextEncoder();
      for (const c of v) {
        mapping.push({ char: c, byte, unit });
        byte += encoder.encode(c).length;
        unit += c.length;
      }
      return { mapping, bytes: byte };
    },
  ),
  d(
    'decode-utf8-strict',
    '严格解码 UTF-8',
    'Strictly decode UTF-8',
    '检查十六进制字节是否为合法 UTF-8，再输出原文。',
    'Reject malformed UTF-8 byte sequences and recover the original Unicode string.',
    [bytes],
    (b) => ({ text: new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(b) }),
  ),
  d(
    'unsigned-leb128',
    '无符号 LEB128 编码',
    'Encode unsigned LEB128',
    '将无符号 64 位整数转换为低位在先的变长字节。',
    'Encode an unsigned 64-bit integer as little-endian base-128 bytes.',
    [integer],
    (n) => {
      check(n >= 0n && n <= U64, 'Use an unsigned 64-bit integer.');
      return { hex: byteText(uleb(n)) };
    },
  ),
  d(
    'protobuf-zigzag',
    'Protobuf ZigZag 编码',
    'Encode Protobuf ZigZag',
    '将有符号 64 位整数映射为无符号 ZigZag 数并输出其 varint。',
    'Map a signed 64-bit integer to ZigZag and produce its unsigned varint representation.',
    [integer],
    (n) => {
      check(n >= -(1n << 63n) && n < 1n << 63n, 'Use a signed 64-bit integer.');
      const z = n >= 0n ? n * 2n : -2n * n - 1n;
      return { zigzag: String(z), hex: byteText(uleb(z)) };
    },
  ),
  d(
    'packed-bcd',
    'BCD 压缩数字',
    'Pack decimal BCD',
    '将十进制数字对压入半字节，奇数位数在左侧补零。',
    'Pack pairs of decimal digits into BCD nibbles with a leading zero for odd lengths.',
    [digits],
    (v) => ({ hex: (v.length % 2 ? '0' + v : v).match(/../g).join(' '), digits: v.length }),
  ),
  d(
    'binary-gray-code',
    '二进制转格雷码',
    'Binary-reflected Gray code',
    '通过相邻位异或生成给定位宽的反射格雷码。',
    'Generate a reflected Gray code by XORing adjacent bits of a nonnegative integer.',
    [integer, bits],
    (n, w) => {
      check(n >= 0n && n < 1n << BigInt(w), 'Integer does not fit the width.');
      return { gray: (n ^ (n >> 1n)).toString(2).padStart(w, '0') };
    },
  ),
  d(
    'twos-complement-word',
    '有符号补码字',
    'Build a two’s complement word',
    '验证有符号整数范围，输出目标位宽的二进制和无符号数值。',
    'Validate the signed range and display the target-width binary word and unsigned value.',
    [integer, bits],
    (n, w) => {
      const max = 1n << BigInt(w - 1);
      check(n >= -max && n < max, 'Value exceeds the signed range for this width.');
      const word = BigInt.asUintN(w, n);
      return { binary: word.toString(2).padStart(w, '0'), unsigned: word.toString() };
    },
  ),
  d(
    'ieee754-binary32',
    '拆解 IEEE 754 单精度',
    'Inspect an IEEE 754 binary32',
    '以单精度舍入输入并显示符号位、指数域、尾数字段和字节。',
    'Round to binary32 and show its sign, stored exponent, fraction and big-endian bytes.',
    [number('value', '数值', 'Number', 0.15625, -1e30, 1e30)],
    (n) => {
      const dv = new DataView(new ArrayBuffer(4));
      dv.setFloat32(0, n);
      const w = dv.getUint32(0);
      return {
        rounded: dv.getFloat32(0),
        sign: w >>> 31,
        exponent: (w >>> 23) & 255,
        fraction: w & 0x7fffff,
        hex: byteText(new Uint8Array(dv.buffer)),
      };
    },
  ),
  d(
    'word-endian-swap',
    '按字反转端序',
    'Swap byte order by word',
    '将输入按二、四或八字节切分并反转每个字的字节顺序。',
    'Reverse bytes within each 2-, 4- or 8-octet word of aligned input.',
    [bytes, number('width', '每字字节数', 'Bytes per word', 2, 2, 8, true)],
    (b, w) => {
      check([2, 4, 8].includes(w) && b.length % w === 0, 'Choose 2, 4 or 8 bytes and provide aligned input.');
      const out = [];
      for (let i = 0; i < b.length; i += w) out.push(...b.slice(i, i + w).reverse());
      return { hex: byteText(out) };
    },
  ),
  d(
    'byte-popcount',
    '字节位计数',
    'Count set bits in bytes',
    '逐字节计算置位数和整段数据中 1 的总数。',
    'Count set bits per byte and across the entire binary payload.',
    [bytes],
    (b) => {
      const counts = Array.from(b, (n) => n.toString(2).replaceAll('0', '').length);
      return { counts, total: counts.reduce((v, n) => v + n, 0) };
    },
  ),
  d(
    'bitfield-extract',
    '解出无符号位段',
    'Extract an unsigned bit field',
    '从最低位编号为零的无符号 64 位字中读取选定位段。',
    'Extract a field from a 64-bit unsigned word using a zero-based least-significant-bit offset.',
    [integer, number('offset', '起始位', 'Bit offset', 2, 0, 63, true), bits],
    (n, o, w) => {
      check(n >= 0n && n <= U64 && o + w <= 64, 'Field must fit inside a 64-bit unsigned word.');
      const field = (n >> BigInt(o)) & ((1n << BigInt(w)) - 1n);
      return { decimal: String(field), binary: field.toString(2).padStart(w, '0') };
    },
  ),
  d(
    'rle-byte-runs',
    '字节游程分组',
    'Run-length groups for bytes',
    '将连续相同的字节分组为值与重复次数。',
    'Group consecutive identical octets into value and repetition count pairs.',
    [bytes],
    (b) => {
      const runs = [];
      for (const n of b) {
        if (runs.at(-1)?.value === n) runs.at(-1).count++;
        else runs.push({ value: n, count: 1 });
      }
      return { runs };
    },
  ),
  d(
    'fletcher16',
    '计算 Fletcher-16',
    'Compute Fletcher-16',
    '对字节序列累计两个模 255 的和，并生成 16 位值。',
    'Compute the two modulo-255 running sums and assemble a Fletcher-16 checksum.',
    [bytes],
    (b) => {
      let x = 0,
        y = 0;
      for (const n of b) {
        x = (x + n) % 255;
        y = (y + x) % 255;
      }
      return { checksum: ((y << 8) | x).toString(16).padStart(4, '0') };
    },
  ),
  d(
    'adler32',
    '计算 Adler-32',
    'Compute Adler-32',
    '按模 65521 用初始值一计算输入字节的校验和。',
    'Compute the Adler-32 payload checksum with modulus 65521 and initial value one.',
    [bytes],
    (b) => {
      let a = 1,
        c = 0;
      for (const n of b) {
        a = (a + n) % 65521;
        c = (c + a) % 65521;
      }
      return { checksum: (c * 65536 + a).toString(16).padStart(8, '0') };
    },
  ),
  d(
    'cobs-frame',
    'COBS 零字节分帧',
    'Frame bytes using COBS',
    '无损移除编码载荷中的零字节，并在末尾添加零分隔符。',
    'Encode consistent-overhead byte stuffing and append the terminating zero delimiter.',
    [bytes],
    (b) => {
      const encoded = [0];
      let position = 0,
        code = 1;
      for (const n of b) {
        if (!n) {
          encoded[position] = code;
          position = encoded.length;
          encoded.push(0);
          code = 1;
        } else {
          encoded.push(n);
          if (++code === 255) {
            encoded[position] = code;
            position = encoded.length;
            encoded.push(0);
            code = 1;
          }
        }
      }
      encoded[position] = code;
      encoded.push(0);
      return { frame: byteText(encoded) };
    },
  ),
  d(
    'slip-frame',
    'SLIP 串口分帧',
    'Frame bytes using SLIP',
    '转义 END 与 ESC 字节并用两个 END 界定串口帧。',
    'Escape the SLIP END and ESC bytes and surround the serial frame with END delimiters.',
    [bytes],
    (b) => ({
      frame: byteText([
        192,
        ...Array.from(b).flatMap((n) => (n === 192 ? [219, 220] : n === 219 ? [219, 221] : [n])),
        192,
      ]),
    }),
  ),
];
