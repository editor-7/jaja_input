require('./config/env');
const express = require('express');
const cors = require('cors');
const config = require('./config/env');
const connectDB = require('./config/db');

const app = express();

function getAllowedOrigins() {
  const defaultDevOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
  if (config.CORS_ORIGINS.length > 0) return config.CORS_ORIGINS;
  // 배포 환경변수 주입이 누락된 경우에도 서비스가 바로 동작하도록:
  // - credentials는 필요 없으므로 false로 두고
  // - origin은 allow-all로 둔다(검증 단계용).
  if (config.NODE_ENV === 'production') return null;
  return defaultDevOrigins;
}

function createCorsOptions(allowedOrigins) {
  if (allowedOrigins === null) {
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
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  };
}

const allowedOrigins = getAllowedOrigins();
if (config.NODE_ENV === 'production' && allowedOrigins.length === 0) {
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
}

// 기본 라우트
app.get('/', (req, res) => {
  res.json({ message: 'Shopping Mall API Server is running!' });
});

// CloudType 헬스체크용
app.get('/health', (req, res) => res.status(200).send('ok'));

// API 라우트
app.use('/api', require('./routes'));

// 서버 시작
start()
  .then(() => {
    app.listen(config.PORT, () => {
      console.log(`Server running on http://localhost:${config.PORT}`);
      console.log(`MongoDB URI: ${config.MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
      if (config.NODE_ENV === 'production') {
        console.log('NODE_ENV: production');
      }
    });
  })
  .catch((err) => {
    console.error('서버 시작 실패:', err);
    process.exit(1);
  });
