/**
 * 로컬 server/.env 의 MONGODB_URI DB vs 운영 상품 API 참조단가 건수 비교
 *
 * 사용 (server 폴더):
 *   node scripts/verifyReferenceProdVsDb.js
 *   PROD_PRODUCTS_URL=https://jaja-input.vercel.app/api/products node scripts/verifyReferenceProdVsDb.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Product = require('../models/Product');

const PROD_URL =
  (process.env.PROD_PRODUCTS_URL || 'https://jaja-input.vercel.app/api/products').trim();

async function countInDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI 가 없습니다. server/.env 를 확인하세요.');
    process.exit(1);
  }
  await mongoose.connect(uri);
  try {
    const total = await Product.countDocuments();
    const ref001 = await Product.countDocuments({ category: '참조단가001' });
    const ref002 = await Product.countDocuments({ category: '참조단가002' });
    const ref003 = await Product.countDocuments({ category: '참조단가003' });
    return { total, ref001, ref002, ref003 };
  } finally {
    await mongoose.disconnect();
  }
}

async function countFromApi() {
  const res = await fetch(PROD_URL, { cache: 'no-store' });
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }
  const arr = Array.isArray(data) ? data : data.data || data.products || [];
  const ref001 = arr.filter((p) => String((p && p.category) || '').trim() === '참조단가001').length;
  const ref002 = arr.filter((p) => String((p && p.category) || '').trim() === '참조단가002').length;
  const ref003 = arr.filter((p) => String((p && p.category) || '').trim() === '참조단가003').length;
  return { status: res.status, total: arr.length, ref001, ref002, ref003 };
}

function maskUri(uri) {
  if (!uri || typeof uri !== 'string') return '(none)';
  return uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
}

async function main() {
  console.log('PROD URL:', PROD_URL);
  console.log('DB URI:', maskUri(process.env.MONGODB_URI));

  let db;
  try {
    db = await countInDb();
  } catch (e) {
    console.error('DB 연결 실패:', e.message);
    process.exit(1);
  }

  let api;
  try {
    api = await countFromApi();
  } catch (e) {
    console.error('운영 API 조회 실패:', e.message);
    process.exit(1);
  }

  console.log('\n[DB .env]', db);
  console.log('[운영 API]', api);

  const mismatch =
    db.ref001 !== api.ref001 ||
    db.ref002 !== api.ref002 ||
    db.ref003 !== api.ref003 ||
    (api.ref001 === 0 &&
      api.ref002 === 0 &&
      api.ref003 === 0 &&
      (db.ref001 > 0 || db.ref002 > 0 || db.ref003 > 0));

  if (mismatch) {
    console.log(
      '\n→ DB와 운영 API 숫자가 다릅니다. Cloudtype 서비스의 MONGODB_URI 가 server/.env 와 같은지 확인 후 재배포하세요.'
    );
    console.log('→ 데이터만 다시 넣으려면: npm run import:reference --prefix server');
    process.exit(2);
  }
  console.log('\nOK: DB와 운영 API 참조단가 건수가 일치합니다.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
