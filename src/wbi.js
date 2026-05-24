const MIXIN_KEY_ENC_TAB = [
  46, 47, 18, 2, 53, 8, 23, 32,
  15, 50, 10, 31, 58, 3, 45, 35,
  27, 43, 5, 49, 33, 9, 42, 19,
  29, 28, 14, 39, 12, 38, 41, 13,
  37, 48, 7, 16, 24, 55, 40, 61,
  26, 17, 0, 1, 60, 51, 30, 4,
  22, 25, 54, 21, 56, 59, 6, 63,
  57, 62, 11, 36, 20, 34, 44, 52
];

export function getMixinKey(imgKey, subKey) {
  const raw = `${imgKey}${subKey}`;
  return MIXIN_KEY_ENC_TAB.map((index) => raw[index]).join("").slice(0, 32);
}

export async function signWbiParams(params, imgKey, subKey, timestamp = Math.floor(Date.now() / 1000)) {
  const signed = {
    ...params,
    wts: timestamp
  };
  const query = Object.keys(signed)
    .sort()
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(String(signed[key]))}`)
    .join("&");
  const digest = await md5(`${query}${getMixinKey(imgKey, subKey)}`);
  return {
    ...signed,
    w_rid: digest
  };
}

async function md5(input) {
  return md5Hex(input);
}

function md5Hex(input) {
  const bytes = utf8Bytes(input);
  const originalBitLength = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) {
    bytes.push(0);
  }
  const lowBits = originalBitLength >>> 0;
  const highBits = Math.floor(originalBitLength / 2 ** 32) >>> 0;
  for (let i = 0; i < 8; i += 1) {
    const word = i < 4 ? lowBits : highBits;
    bytes.push((word >>> (8 * (i % 4))) & 0xff);
  }

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  const s = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21
  ];
  const k = Array.from({ length: 64 }, (_, index) =>
    Math.floor(Math.abs(Math.sin(index + 1)) * 2 ** 32)
  );

  for (let offset = 0; offset < bytes.length; offset += 64) {
    const m = [];
    for (let i = 0; i < 16; i += 1) {
      m[i] =
        bytes[offset + i * 4] |
        (bytes[offset + i * 4 + 1] << 8) |
        (bytes[offset + i * 4 + 2] << 16) |
        (bytes[offset + i * 4 + 3] << 24);
    }

    let a = a0;
    let b = b0;
    let c = c0;
    let d = d0;

    for (let i = 0; i < 64; i += 1) {
      let f;
      let g;

      if (i < 16) {
        f = (b & c) | (~b & d);
        g = i;
      } else if (i < 32) {
        f = (d & b) | (~d & c);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        f = b ^ c ^ d;
        g = (3 * i + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = (7 * i) % 16;
      }

      const nextD = c;
      c = b;
      b = add32(b, leftRotate(add32(add32(a, f), add32(k[i], m[g])), s[i]));
      a = d;
      d = nextD;
    }

    a0 = add32(a0, a);
    b0 = add32(b0, b);
    c0 = add32(c0, c);
    d0 = add32(d0, d);
  }

  return [a0, b0, c0, d0].map(wordToHexLe).join("");
}

function utf8Bytes(input) {
  return Array.from(new TextEncoder().encode(input));
}

function add32(a, b) {
  return (a + b) >>> 0;
}

function leftRotate(value, shift) {
  return ((value << shift) | (value >>> (32 - shift))) >>> 0;
}

function wordToHexLe(word) {
  let output = "";
  for (let i = 0; i < 4; i += 1) {
    output += ((word >>> (8 * i)) & 0xff).toString(16).padStart(2, "0");
  }
  return output;
}
