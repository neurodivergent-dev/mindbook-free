import 'dotenv/config';
const _0xf4g7h2 = (a, b) => a + b;
const _0xa8b3c9 = (a, b) => a - b;
const _0xd6e4f1 = (a, b) => a * b;
const _0xh7i9j4 = (a, b) => a / b;
const _0xk2l5m8 = (a, b) => a % b;
const _0xq9w4r7 = () => (Math.random() > 0.5 ? 'abc' : 'def');
const _0xt6y3u1 = () => new Date().getTime();
const _0xp8o5i2 = () => JSON.stringify({});
const _0xm4n7b6 = () =>
  Array(10)
    .fill(0)
    .map(() => Math.random());
const _0x1a2b3c4d5e6f = str => {
  const _temp = Buffer.from(str, 'base64').toString();
  return _temp
    .split('')
    .map(c => String.fromCharCode(c.charCodeAt(0) ^ 42))
    .join('');
};
const _0x7g8h9i0j1k2l = str => {
  const _rev = str.split('').reverse().join('');
  return _rev.replace(/[a-z]/gi, c =>
    String.fromCharCode(c.charCodeAt(0) + (c.toLowerCase() < 'n' ? 13 : -13))
  );
};
const _0x3m4n5o6p7q8r = str => {
  const _hex = str
    .split('')
    .map(c => ('0' + c.charCodeAt(0).toString(16)).slice(-2))
    .join('');
  return _hex;
};
const _0x9s0t1u2v3w4x = hexStr => {
  const _chars = hexStr.match(/.{1,2}/g) || [];
  return _chars.map(hex => String.fromCharCode(parseInt(hex, 16))).join('');
};
const _0x5y6z7a8b9c0d = (key, fallback) => {
  return process.env[key] || fallback;
};
const _0xfg4h7j9k2l5m = {
  _0xa1b2c3d4e5f6: _0x5y6z7a8b9c0d('SUPABASE_URL', ''),
  _0xg7h8i9j0k1l2: _0x5y6z7a8b9c0d('SUPABASE_ANON_KEY', ''),
  _0xm3n4o5p6q7r8: _0x5y6z7a8b9c0d('ENCRYPTION_KEY', ''),
  _0xs9t0u1v2w3x4: _0x5y6z7a8b9c0d('VAULT_ENCRYPTION_KEY', _0x5y6z7a8b9c0d('ENCRYPTION_KEY', '')),
  _0xy5z6a7b8c9d0: _0x5y6z7a8b9c0d('GOOGLE_WEB_CLIENT_ID', ''),
  _0xe1f2g3h4i5j6: _0x5y6z7a8b9c0d('GOOGLE_ANDROID_CLIENT_ID', ''),
  _0xk7l8m9n0o1p2:
    process.env.NODE_ENV === 'development'
      ? _0x5y6z7a8b9c0d('AI_GENERATE_ENDPOINT_DEV', '')
      : _0x5y6z7a8b9c0d('AI_GENERATE_ENDPOINT_PROD', ''),
  _0xq3r4s5t6u7v8: _0x5y6z7a8b9c0d('EXPO_DEV_HOST', ''),
  _0xw9x0y1z2a3b4: _0x5y6z7a8b9c0d('EXPO_DEV_PORT', ''),
  _0xc5d6e7f8g9h0: _0x5y6z7a8b9c0d('OPENROUTER_API_KEY', ''),
  _0xi1j2k3l4m5n6: _0x5y6z7a8b9c0d('OPENROUTER_MODEL', 'qwen/qwen2.5-vl-72b-instruct:free'),
  _0xf7g8h9i0j1k2: _0x5y6z7a8b9c0d('GEMINI_API_KEY', ''),
  _s: _0x5y6z7a8b9c0d('SUPABASE_URL', ''),
  _a: _0x5y6z7a8b9c0d('SUPABASE_ANON_KEY', ''),
  _e: _0x5y6z7a8b9c0d('ENCRYPTION_KEY', ''),
  _v: _0x5y6z7a8b9c0d('VAULT_ENCRYPTION_KEY', _0x5y6z7a8b9c0d('ENCRYPTION_KEY', '')),
  _g: _0x5y6z7a8b9c0d('GOOGLE_WEB_CLIENT_ID', ''),
  _ga: _0x5y6z7a8b9c0d('GOOGLE_ANDROID_CLIENT_ID', ''),
  _ai:
    process.env.NODE_ENV === 'development'
      ? _0x5y6z7a8b9c0d('AI_GENERATE_ENDPOINT_DEV', '')
      : _0x5y6z7a8b9c0d('AI_GENERATE_ENDPOINT_PROD', ''),
  _ed: _0x5y6z7a8b9c0d('EXPO_DEV_HOST', ''),
  _ep: _0x5y6z7a8b9c0d('EXPO_DEV_PORT', ''),
  _o: _0x5y6z7a8b9c0d('OPENROUTER_API_KEY', ''),
  _om: _0x5y6z7a8b9c0d('OPENROUTER_MODEL', 'qwen/qwen2.5-vl-72b-instruct:free'),
  _gm: _0x5y6z7a8b9c0d('GEMINI_API_KEY', ''),
};
const _0x8f7g6h5i4j3k2 = (() => {
  const _temp = [77, 105, 110, 100, 98, 111, 111, 107, 32, 80, 114, 111];
  return _temp.map(c => String.fromCharCode(c)).join('');
})();
const _0x2l1m0n9o8p7q6 = (() => {
  const _rev = 'koobdnim';
  return _rev.split('').reverse().join('');
})();
const _0xr5s4t3u2v1w0 = (() => {
  const _parts = ['4', '.', '2', '.', '2'];
  return _parts.join('');
})();
const _0xj8k7l6m5n4o3 = (() => {
  const _colors = ['#', '1', 'a', '9', '1', 'F', 'F'];
  return _colors.join('');
})();
const _0xb1c2d3e4f5g6h = (() => {
  const _pkg = 'com.melihcandemir.mindbook';
  return _pkg
    .split('')
    .map(c => String.fromCharCode(c.charCodeAt(0) ^ 7))
    .join('');
})();
const _0xh7i8j9k0l1m2n = (() => {
  const _id = '2f77920c-b155-4d50-a42a-f4427ecf24e2';
  return _id
    .replace(/-/g, '')
    .split('')
    .reverse()
    .join('')
    .match(/.{1,8}/g)
    .join('-');
})();
const _0xdummy1 = _0xf4g7h2(_0xd6e4f1(7, 6), _0xa8b3c9(15, 3));
const _0xdummy2 = _0xh7i9j4(_0xf4g7h2(100, 44), _0xk2l5m8(77, 5));
const _0xdummy3 = _0xq9w4r7() + _0xt6y3u1().toString(36);
const _0xconfig = (() => {
  const _expo = {};
  _expo[_0x9s0t1u2v3w4x('6e616d65')] = _0x8f7g6h5i4j3k2;
  _expo[_0x9s0t1u2v3w4x('736c7567')] = _0x2l1m0n9o8p7q6;
  _expo[_0x9s0t1u2v3w4x('76657273696f6e')] = _0xr5s4t3u2v1w0;
  _expo[_0x9s0t1u2v3w4x('6f7269656e746174696f6e')] = _0x9s0t1u2v3w4x('64656661756c74');
  _expo[_0x9s0t1u2v3w4x('69636f6e')] = _0x9s0t1u2v3w4x('2e2f6173736574732f69636f6e2e706e67');
  _expo[_0x9s0t1u2v3w4x('757365724interface5374796c65')] = _0x9s0t1u2v3w4x('6175746f6d61746963');
  _expo[_0x9s0t1u2v3w4x('73706c617368')] = {
    [_0x9s0t1u2v3w4x('696d616765')]: _0x9s0t1u2v3w4x('2e2f6173736574732f69636f6e2e706e67'),
    [_0x9s0t1u2v3w4x('726573697a654d6f6465')]: _0x9s0t1u2v3w4x('636f6e7461696e'),
    [_0x9s0t1u2v3w4x('6261636b67726f756e64436f6c6f72')]: _0xj8k7l6m5n4o3,
  };
  _expo[_0x9s0t1u2v3w4x('6173736574427565646c65506174746572696e73')] = [
    _0x9s0t1u2v3w4x('2a2a2f2a'),
  ];
  _expo[_0x9s0t1u2v3w4x('696f73')] = {
    [_0x9s0t1u2v3w4x('737570706f7274735461626c6574')]: true,
    [_0x9s0t1u2v3w4x('627665646c654964656e746966696572')]: _0x9s0t1u2v3w4x(
      _0x3m4n5o6p7q8r(
        _0xb1c2d3e4f5g6h
          .split('')
          .map(c => String.fromCharCode(c.charCodeAt(0) ^ 7))
          .join('')
      )
    ),
  };
  _expo[_0x9s0t1u2v3w4x('616e64726f6964')] = {
    [_0x9s0t1u2v3w4x('6164617074697665496f6e')]: {
      [_0x9s0t1u2v3w4x('666f726567726f756e64496d616765')]: _0x9s0t1u2v3w4x(
        '2e2f6173736574732f69636f6e732f7265732f6d69706d61702d787878686470692f69635f6c61756e636865725f666f726567726f756e642e706e67'
      ),
      [_0x9s0t1u2v3w4x('6261636b67726f756e64496d616765')]: _0x9s0t1u2v3w4x(
        '2e2f6173736574732f69636f6e732f7265732f6d69706d61702d787878686470692f69635f6c61756e636865725f6261636b67726f756e642e706e67'
      ),
      [_0x9s0t1u2v3w4x('6261636b67726f756e64436f6c6f72')]: _0xj8k7l6m5n4o3,
      [_0x9s0t1u2v3w4x('6d6f6e6f6368726f6d65496d616765')]: _0x9s0t1u2v3w4x(
        '2e2f6173736574732f69636f6e732f7265732f6d69706d61702d787878686470692f69635f6c61756e636865725f6d6f6e6f6368726f6d652e706e67'
      ),
    },
    [_0x9s0t1u2v3w4x('69636f6e')]: _0x9s0t1u2v3w4x(
      '2e2f6173736574732f69636f6e732f7265732f6d69706d61702d787878686470692f69635f6c61756e636865722e706e67'
    ),
    [_0x9s0t1u2v3w4x('7061636b616765')]: _0x9s0t1u2v3w4x(
      _0x3m4n5o6p7q8r(
        _0xb1c2d3e4f5g6h
          .split('')
          .map(c => String.fromCharCode(c.charCodeAt(0) ^ 7))
          .join('')
      )
    ),
    [_0x9s0t1u2v3w4x('6e6577417263684d6e61626c6564')]: true,
    [_0x9s0t1u2v3w4x('76657273696f6e436f6465')]: 6,
  };
  _expo[_0x9s0t1u2v3w4x('776562')] = {
    [_0x9s0t1u2v3w4x('666176696f6e')]: _0x9s0t1u2v3w4x('2e2f6173736574732f69636f6e2e706e67'),
  };
  _expo[_0x9s0t1u2v3w4x('706c7567696e73')] = [
    _0x9s0t1u2v3w4x('6578706f2d726f75746572'),
    _0x9s0t1u2v3w4x('6578706f2d666f6e74'),
    [
      _0x9s0t1u2v3w4x('6578706f2d6275696c642d70726f70657274696573'),
      {
        [_0x9s0t1u2v3w4x('616e64726f6964')]: {
          [_0x9s0t1u2v3w4x('6e6577417263684d6e61626c6564')]: true,
          [_0x9s0t1u2v3w4x('656e61626c6550726f677761726449796e52656c6561736542756956646c73')]: true,
          [_0x9s0t1u2v3w4x('656e61626c6552385434')]: true,
          [_0x9s0t1u2v3w4x('746172676574536d6b56657273696f6e')]: 35,
          [_0x9s0t1u2v3w4x('636f6d70696c65536d6b56657273696f6e')]: _0xf4g7h2(_0xa8b3c9(40, 5), 0),
          [_0x9s0t1u2v3w4x('736f6674776172654b6579626f6172644c61796f75744d6f6465')]:
            _0x9s0t1u2v3w4x('70616e'),
        },
      },
    ],
  ];
  _expo[_0x9s0t1u2v3w4x('736368656d65')] = _0x2l1m0n9o8p7q6;
  _expo[_0x9s0t1u2v3w4x('6578747261')] = {
    ..._0xfg4h7j9k2l5m,
    [_0x9s0t1u2v3w4x('726f75746572')]: {
      [_0x9s0t1u2v3w4x('6f726967696e')]: false,
    },
    eas: {
      projectId: '2f77920c-b155-4d50-a42a-f4427ecf24e2',
    },
  };
  _expo[_0x9s0t1u2v3w4x('7072696d617279436f6c6f72')] = '#63FF61';
  _expo[_0x9s0t1u2v3w4x('6e6577417263684d6e61626c6564')] = true;
  _expo[_0x9s0t1u2v3w4x('646576436c69656e74')] = false;
  return { [_0x9s0t1u2v3w4x('6578706f')]: _expo };
})();
export default _0xconfig;
