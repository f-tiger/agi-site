import { define as d, string, number, requireValue as check, round, json } from './developer-common.mjs';

function parseColor(value) {
  check(/^#[a-f\d]{6}$/i.test(value), 'Use a six-digit #RRGGBB color.');
  return [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16) / 255);
}
const hex = (rgb) =>
  '#' +
  rgb
    .map((x) =>
      Math.round(Math.max(0, Math.min(1, x)) * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('');
const color = string('color', '十六进制颜色', 'Six-digit hex color', '#4178b8', 7, parseColor);
const other = string('other', '第二种颜色', 'Second hex color', '#f39149', 7, parseColor);
const palette = string(
  'palette',
  '颜色 JSON 数组',
  'Hex color array (JSON)',
  '["#4178b8","#f39149","#13293d"]',
  1500,
  (t) => {
    const a = json(t);
    check(Array.isArray(a) && a.length && a.length <= 64, 'Use 1 to 64 colors.');
    return a.map(parseColor);
  },
);
const linear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const gamma = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
function polar(rgb) {
  const [r, g, b] = rgb,
    max = Math.max(...rgb),
    min = Math.min(...rgb),
    delta = max - min;
  const raw = !delta ? 0 : max === r ? (g - b) / delta : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  return { h: (60 * raw + 360) % 360, max, min, delta, l: (min + max) / 2 };
}
function hslToRgb(h, s, l) {
  const a = s * Math.min(l, 1 - l);
  return [0, 8, 4].map((n) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  });
}
function xyz(rgb) {
  const [r, g, b] = rgb.map(linear);
  return [
    0.4124564 * r + 0.3575761 * g + 0.1804375 * b,
    0.2126729 * r + 0.7151522 * g + 0.072175 * b,
    0.0193339 * r + 0.119192 * g + 0.9503041 * b,
  ];
}
function lab(rgb) {
  const coords = xyz(rgb).map((v, i) => {
    const t = v / [0.95047, 1, 1.08883][i];
    return t > (6 / 29) ** 3 ? Math.cbrt(t) : (841 / 108) * t + 4 / 29;
  });
  return [116 * coords[1] - 16, 500 * (coords[0] - coords[1]), 200 * (coords[1] - coords[2])];
}
function oklab(rgb) {
  const [r, g, b] = rgb.map(linear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b),
    m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b),
    s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}
const coordinates = (keys, values) => Object.fromEntries(keys.map((key, i) => [key, round(values[i])]));
const distance = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
const one = (id, zh, en, cn, ds, fn) => d(id, zh, en, cn, ds, [color], fn);
export const tools = [
  one(
    'color-hsl-coordinates',
    'CSS HSL 坐标',
    'CSS HSL coordinates',
    '计算 sRGB 颜色的色相角、饱和度和 HSL 亮度。',
    'Calculate hue in degrees, saturation and HSL lightness from an sRGB color.',
    (rgb) => {
      const p = polar(rgb);
      return {
        h: round(p.h),
        sPercent: round(p.delta ? (100 * p.delta) / (1 - Math.abs(2 * p.l - 1)) : 0),
        lPercent: round(100 * p.l),
      };
    },
  ),
  one(
    'color-hsv-picker',
    'HSV 取色器数值',
    'HSV color picker values',
    '将十六进制颜色转换为取色器的色相、饱和度和明度。',
    'Convert an sRGB swatch into picker hue, saturation and maximum-channel value.',
    (rgb) => {
      const p = polar(rgb);
      return {
        h: round(p.h),
        sPercent: round(p.max ? (100 * p.delta) / p.max : 0),
        vPercent: round(100 * p.max),
      };
    },
  ),
  one(
    'color-process-cmyk',
    '基础 CMYK 分色',
    'Basic CMYK separations',
    '使用理想黑版替代计算 CMYK 百分比，适用于未指定设备配置的估算。',
    'Estimate device-independent CMYK percentages using simple black replacement without an ICC profile.',
    (rgb) => {
      const max = Math.max(...rgb);
      return coordinates(
        ['cyanPct', 'magentaPct', 'yellowPct', 'blackPct'],
        [...rgb.map((c) => (max ? (100 * (max - c)) / max : 0)), 100 * (1 - max)],
      );
    },
  ),
  one(
    'color-xyz-d65',
    'D65 三刺激值',
    'D65 XYZ tristimulus values',
    '线性化 sRGB，并以 Y 为 100 的标度给出 CIE XYZ。',
    'Linearize sRGB and transform to D65 CIE XYZ on a Y = 100 scale.',
    (rgb) =>
      coordinates(
        ['X', 'Y', 'Z'],
        xyz(rgb).map((x) => x * 100),
      ),
  ),
  one(
    'color-lab-d65',
    'D65 Lab 坐标',
    'D65 Lab coordinates',
    '按 D65 参考白计算 CIE L*a*b* 三轴坐标。',
    'Calculate CIE L*a*b* coordinates relative to the D65 reference white.',
    (rgb) => coordinates(['L', 'a', 'b'], lab(rgb)),
  ),
  one(
    'color-oklch',
    'OKLCH 颜色坐标',
    'OKLCH color coordinates',
    '从线性 sRGB 计算 OKLab，再得到 OKLCH 亮度、色度和色相。',
    'Transform linear sRGB into OKLab and report cylindrical lightness, chroma and hue.',
    (rgb) => {
      const [l, a, b] = oklab(rgb),
        c = Math.hypot(a, b);
      return {
        lightness: round(l),
        chroma: round(c),
        hueDeg: c < 1e-7 ? null : round(((Math.atan2(b, a) * 180) / Math.PI + 360) % 360),
      };
    },
  ),
  d(
    'color-linear-gradient',
    '线性光颜色阶梯',
    'Linear-light color ramp',
    '在线性光空间内插两端颜色，生成包含端点的色阶。',
    'Interpolate endpoints in linear light to produce an evenly stepped sRGB ramp.',
    [color, other, number('steps', '颜色数量', 'Color count', 5, 2, 32, true)],
    (a, b, n) => ({
      colors: Array.from({ length: n }, (_, i) =>
        hex(a.map((v, j) => gamma(linear(v) + ((linear(b[j]) - linear(v)) * i) / (n - 1)))),
      ),
    }),
  ),
  one(
    'color-hue-harmonies',
    '色相搭配方案',
    'Generate hue harmonies',
    '固定 HSL 亮度和饱和度生成互补色、三角色和相邻色。',
    'Generate complementary, triadic and analogous colors while preserving HSL saturation and lightness.',
    (rgb) => {
      const p = polar(rgb),
        s = p.delta ? p.delta / (1 - Math.abs(2 * p.l - 1)) : 0,
        at = (deg) => hex(hslToRgb((p.h + deg + 360) % 360, s, p.l));
      return { complement: at(180), triad: [at(0), at(120), at(240)], analogous: [at(-30), at(0), at(30)] };
    },
  ),
  one(
    'choose-monochrome-foreground',
    '选择黑白前景色',
    'Choose black or white foreground',
    '计算纯黑与纯白前景的 WCAG 对比度并选择较高者。',
    'Rank black and white foregrounds by their WCAG contrast against the supplied background.',
    (rgb) => {
      const [r, g, b] = rgb.map(linear),
        y = 0.2126 * r + 0.7152 * g + 0.0722 * b,
        black = (y + 0.05) / 0.05,
        white = 1.05 / (y + 0.05);
      return {
        foreground: black >= white ? '#000000' : '#ffffff',
        blackContrast: round(black),
        whiteContrast: round(white),
      };
    },
  ),
  d(
    'oklab-srgb-gamut',
    'OKLab 色域检查',
    'Check OKLab against sRGB gamut',
    '反变换 OKLab，检查线性 RGB 通道是否超出 sRGB 色域。',
    'Invert OKLab to linear RGB and test whether the coordinates fit within the sRGB gamut.',
    [
      number('lightness', '亮度 L', 'Lightness L', 0.6, 0, 1),
      number('a', '坐标 a', 'Axis a', 0.1, -1, 1),
      number('b', '坐标 b', 'Axis b', 0.08, -1, 1),
    ],
    (l, a, b) => {
      const x = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3,
        y = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3,
        z = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
      const rgb = [
        4.0767416621 * x - 3.3077115913 * y + 0.2309699292 * z,
        -1.2684380046 * x + 2.6097574011 * y - 0.3413193965 * z,
        -0.0041960863 * x - 0.7034186147 * y + 1.707614701 * z,
      ];
      return {
        inGamut: rgb.every((v) => v >= -1e-7 && v <= 1 + 1e-7),
        linearRgb: rgb.map(round),
        clippedHex: hex(rgb.map(gamma)),
      };
    },
  ),
  d(
    'color-delta-e76',
    'CIE76 色差',
    'CIE76 color difference',
    '计算 D65 Lab 空间中两个颜色的欧氏色差。',
    'Measure Euclidean color difference between two D65 CIELAB swatches.',
    [color, other],
    (a, b) => ({ deltaE76: round(distance(lab(a), lab(b))) }),
  ),
  one(
    'color-luminance-grayscale',
    '保亮度灰度色',
    'Luminance-preserving grayscale',
    '用线性通道权重生成保持相对亮度的灰色。',
    'Derive an sRGB neutral gray with the same relative luminance as the source.',
    (rgb) => {
      const [r, g, b] = rgb.map(linear);
      const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      return { grayscale: hex(Array(3).fill(gamma(y))), relativeLuminance: round(y) };
    },
  ),
  d(
    'palette-css-variables',
    '生成颜色变量',
    'Generate CSS palette variables',
    '将经过验证的颜色数组写入按顺序编号的 CSS 自定义属性。',
    'Write a validated palette as sequential CSS custom properties in a root rule.',
    [palette],
    (colors) => ({
      css: ':root {\n' + colors.map((v, i) => '  --swatch-' + (i + 1) + ': ' + hex(v) + ';').join('\n') + '\n}',
    }),
  ),
  d(
    'alpha-over-background',
    '半透明色叠加',
    'Composite an alpha foreground',
    '在编码 sRGB 通道中按给定不透明度将前景覆盖背景。',
    'Composite a foreground over an opaque background using encoded sRGB channels.',
    [color, other, number('opacity', '前景不透明度', 'Foreground opacity', 0.5, 0, 1)],
    (fg, bg, a) => ({ composite: hex(fg.map((c, i) => c * a + bg[i] * (1 - a))) }),
  ),
  one(
    'rgb565-preview',
    'RGB565 量化预览',
    'Preview RGB565 quantization',
    '模拟五六五位显示格式，计算打包值与回读颜色。',
    'Quantize a swatch for a 16-bit RGB565 display and preview the decoded color.',
    (rgb) => {
      const levels = [31, 63, 31],
        q = rgb.map((x, i) => Math.round(x * levels[i]));
      return {
        packedHex: '0x' + ((q[0] << 11) | (q[1] << 5) | q[2]).toString(16).padStart(4, '0'),
        preview: hex(q.map((v, i) => v / levels[i])),
      };
    },
  ),
  one(
    'xterm-fixed-color',
    '终端固定调色板匹配',
    'Match an xterm fixed palette color',
    '在 xterm 固定色立方体与灰阶中按 RGB 距离寻找最近颜色。',
    'Find the nearest fixed xterm cube or grayscale entry by encoded RGB distance, indices 16 to 255.',
    (rgb) => {
      const values = [0, 95, 135, 175, 215, 255],
        candidates = [];
      for (const r of values) for (const g of values) for (const b of values) candidates.push([r, g, b]);
      for (let i = 0; i < 24; i++) candidates.push(Array(3).fill(8 + 10 * i));
      const actual = rgb.map((c) => c * 255),
        index = candidates.reduce(
          (best, c, i) => (distance(c, actual) < distance(candidates[best], actual) ? i : best),
          0,
        );
      return { index: index + 16, matched: hex(candidates[index].map((v) => v / 255)) };
    },
  ),
  d(
    'palette-nearest-swatch',
    '匹配参考色样',
    'Match a reference swatch',
    '在给定调色板中按 D65 Lab 色差排名，返回最近色样。',
    'Rank a supplied palette by D65 CIE76 difference and report the closest swatch.',
    [color, palette],
    (rgb, colors) => {
      const target = lab(rgb);
      const ranked = colors
        .map((c) => ({ hex: hex(c), deltaE: round(distance(lab(c), target)) }))
        .sort((a, b) => a.deltaE - b.deltaE);
      return { best: ranked[0], ranked };
    },
  ),
  one(
    'css-hex-shorthand',
    '精简 CSS 颜色字面量',
    'Shorten a CSS hex literal',
    '检查每个通道的两个数位是否相同，并给出最短无损写法。',
    'Check each channel for repeated nibbles and produce the shortest exact hex literal.',
    (rgb) => {
      const full = hex(rgb),
        short = [1, 3, 5].every((i) => full[i] === full[i + 1]);
      return { css: short ? '#' + [1, 3, 5].map((i) => full[i]).join('') : full, compressible: short };
    },
  ),
  d(
    'palette-gradient-css',
    '生成 CSS 色带',
    'Compose a CSS gradient',
    '将一组颜色均匀排布为固定角度的 CSS 线性渐变。',
    'Arrange palette colors into equidistant CSS gradient stops at a supplied angle.',
    [palette, number('angle', '角度', 'Angle in degrees', 90, 0, 360)],
    (colors, a) => {
      check(colors.length >= 2, 'Supply at least two colors.');
      return {
        css:
          'linear-gradient(' +
          a +
          'deg, ' +
          colors.map((c, i) => hex(c) + ' ' + round((i * 100) / (colors.length - 1)) + '%').join(', ') +
          ')',
      };
    },
  ),
  d(
    'palette-lightness-order',
    '色板明度排序',
    'Order a palette by lightness',
    '按 OKLab 明度排列色样，同时标出明度值。',
    'Sort palette swatches by perceptual OKLab lightness and return their coordinates.',
    [palette],
    (colors) => ({
      swatches: colors
        .map((rgb) => ({ hex: hex(rgb), lightness: round(oklab(rgb)[0]) }))
        .sort((a, b) => a.lightness - b.lightness),
    }),
  ),
];
