/**
 * Vercel 전용 (Root Directory 가 `client` 일 때 이 파일이 배포됨).
 * 루트의 `api/[...path].js` 와 동일 — 수정 시 둘 다 맞출 것.
 *
 * /api/* → BACKEND_URL (클라우드타입 기본 URL 전체, org/…/service 포함)
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
