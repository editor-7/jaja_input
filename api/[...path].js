/**
 * Vercel 전용: /api/* → BACKEND_URL (클라우드타입 등)으로 프록시.
 * 프론트는 VITE_API_URL 없이 /api 를 쓰면 동일 출처라 OPTIONS 프리플라이트가 사라지고,
 * catch-all 로 index.html 이 떨어지며 나는 preflight 404/CORS 오류를 피할 수 있습니다.
 *
 * Vercel → Settings → Environment Variables:
 *   BACKEND_URL = https://xxx.cloudtype.app  (끝 슬래시 없음)
 */
const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
]);

function cleanRequestHeaders(headers) {
  const out = {};
  for (const [k, v] of Object.entries(headers)) {
    const lower = k.toLowerCase();
    if (HOP_BY_HOP.has(lower) || lower === 'host') continue;
    if (v === undefined) continue;
    out[k] = Array.isArray(v) ? v.join(', ') : v;
  }
  return out;
}

module.exports = async (req, res) => {
  const backend = process.env.BACKEND_URL || process.env.VITE_API_URL;
  if (!backend) {
    return res.status(503).json({
      message:
        'Vercel 환경 변수 BACKEND_URL(클라우드타입 API 기본 URL)을 설정한 뒤 재배포하세요.',
    });
  }

  const base = String(backend).replace(/\/$/, '');
  const raw = req.url || '/';
  // Vercel 환경에 따라 req.url 이 /api/... 또는 /users/... 형태일 수 있음
  const path =
    raw.startsWith('/api')
      ? raw
      : `/api${raw.startsWith('/') ? '' : '/'}${raw}`;
  const targetUrl = `${base}${path}`;

  const init = {
    method: req.method,
    headers: cleanRequestHeaders(req.headers),
    redirect: 'manual',
  };

  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    if (chunks.length) init.body = Buffer.concat(chunks);
  }

  let r;
  try {
    r = await fetch(targetUrl, init);
  } catch (e) {
    return res.status(502).json({
      message: '백엔드에 연결할 수 없습니다.',
      detail: String(e && e.message ? e.message : e),
    });
  }

  res.statusCode = r.status;
  r.headers.forEach((value, key) => {
    if (HOP_BY_HOP.has(key.toLowerCase())) return;
    try {
      if (key.toLowerCase() === 'set-cookie') {
        res.appendHeader(key, value);
      } else {
        res.setHeader(key, value);
      }
    } catch (_) {}
  });

  const buf = Buffer.from(await r.arrayBuffer());
  return res.end(buf);
};
