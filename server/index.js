require('./config/env');
const express = require('express');
const cors = require('cors');
const config = require('./config/env');
const connectDB = require('./config/db');

const app = express();

// 프리플라이트(OPTIONS)에서 CORS 헤더가 누락되면 브라우저가 계속 막힙니다.
// cors() 미들웨어와 별개로, OPTIONS 요청은 여기서 확실히 처리합니다.
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    // production에서도 브라우저 CORS가 완전히 풀리도록 origin을 그대로 echo back한다.
    // (배포환경 변수가 누락/불일치해도 즉시 복구 가능)
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  // preflight에서 요청한 헤더를 그대로 허용
  const reqHeaders = req.headers['access-control-request-headers'];
  res.setHeader(
    'Access-Control-Allow-Headers',
    reqHeaders ? String(reqHeaders) : 'Content-Type, Authorization'
  );
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  return next();
});

/** 로컬 개발: Vite가 3000 대신 3001 등으로 뜨는 경우도 허용 */
function isLocalDevOrigin(origin) {
  if (!origin || typeof origin !== 'string') return false;
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin.trim());
}

function getAllowedOrigins() {
  const defaultDevOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
  ];
  if (config.NODE_ENV === 'production') {
    if (config.CORS_ORIGINS.length > 0) return config.CORS_ORIGINS;
    // 배포 환경변수 주입이 누락된 경우에도 서비스가 바로 동작하도록:
    // - credentials는 필요 없으므로 false로 두고
    // - origin은 allow-all로 둔다(검증 단계용).
    return null;
  }
  // development: .env에 배포용 도메인만 있어도 로컬 Vite는 항상 허용
  return [...new Set([...defaultDevOrigins, ...config.CORS_ORIGINS])];
}

function createCorsOptions(allowedOrigins) {
  if (allowedOrigins === null) {
    return {
      origin: true,
      credentials: false,
    };
  }
  if (config.NODE_ENV === 'production') {
    return {
      origin: true,
      credentials: false,
    };
  }
  return {
    origin(origin, callback) {
      // 서버-서버 호출이나 동일 출처 요청(origin 없음)은 허용
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (config.NODE_ENV !== 'production' && isLocalDevOrigin(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  };
}

const allowedOrigins = getAllowedOrigins();
if (config.NODE_ENV === 'production' && config.CORS_ORIGINS.length === 0) {
  console.warn('⚠️ CORS_ORIGINS가 비어 있습니다. 허용할 프론트 도메인을 환경 변수에 설정하세요.');
}

// Express 라우터는 OPTIONS에 대해 405를 줄 수 있으므로,
// CORS middleware를 OPTIONS에도 명시적으로 적용한다.
const corsMiddleware = cors(createCorsOptions(allowedOrigins));
app.use(corsMiddleware);
app.options('*', corsMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

async function start() {
  await connectDB();
  try {
    const mongoose = require('mongoose');
    const Product = require('./models/Product');
    const dbName = mongoose.connection.db?.databaseName || '';
    const total = await Product.countDocuments();
    const ref001 = await Product.countDocuments({ category: '참조단가001' })
    const ref002 = await Product.countDocuments({ category: '참조단가002' })
    const ref003 = await Product.countDocuments({ category: '참조단가003' })
    const ref004 = await Product.countDocuments({ category: '참조단가004' })
    const ref005 = await Product.countDocuments({ category: '참조단가005' })
    const ref006 = await Product.countDocuments({ category: '참조단가006' })
    console.log(
      `[상품 DB] database=${dbName} total=${total} 참조단가001=${ref001} 참조단가002=${ref002} 참조단가003=${ref003} 참조단가004=${ref004} 참조단가005=${ref005} 참조단가006=${ref006}`
    )
  } catch (e) {
    console.warn('[상품 DB] 부트 통계 실패:', e.message)
  }
}

// 기본 라우트
app.get('/', (req, res) => {
  res.json({ message: 'Shopping Mall API Server is running!' });
});

// CloudType 헬스체크용
app.get('/health', (req, res) => res.status(200).send('ok'));

// API 라우트
app.use('/api', require('./routes'));
// Cloudtype 경로 프록시가 prefix를 유지해 전달하는 경우 대응
app.use('/:org/:project/:stage/:service/api', require('./routes'));

// 서버 시작
start()
  .then(() => {
    const server = app.listen(config.PORT, () => {
      console.log(`Server running on http://localhost:${config.PORT}`);
      console.log(`MongoDB URI: ${config.MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
      if (config.NODE_ENV === 'production') {
        console.log('NODE_ENV: production');
      }
    });
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(
          `❌ 포트 ${config.PORT}이(가) 이미 사용 중입니다. 이전에 띄운 node/nodemon(\`npm run dev\` 등)을 종료하거나, server/.env에서 PORT를 다른 값(예: 5001)으로 바꾸세요.`,
        );
        console.error(`   확인: netstat -ano | findstr :${config.PORT}`);
        process.exit(1);
        return;
      }
      throw err;
    });
  })
  .catch((err) => {
    console.error('서버 시작 실패:', err);
    process.exit(1);
  });
