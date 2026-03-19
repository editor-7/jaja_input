require('./config/env');
const express = require('express');
const cors = require('cors');
const config = require('./config/env');
const connectDB = require('./config/db');

const app = express();

const defaultDevOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
const allowedOrigins =
  config.CORS_ORIGINS.length > 0
    ? config.CORS_ORIGINS
    : (config.NODE_ENV === 'production' ? [] : defaultDevOrigins);

if (config.NODE_ENV === 'production' && allowedOrigins.length === 0) {
  console.warn('⚠️ CORS_ORIGINS가 비어 있습니다. 허용할 프론트 도메인을 환경 변수에 설정하세요.');
}

app.use(cors({
  origin(origin, callback) {
    // 서버-서버 호출이나 동일 출처 요청(origin 없음)은 허용
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
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
start().then(() => {
  app.listen(config.PORT, () => {
  console.log(`Server running on http://localhost:${config.PORT}`);
  console.log(`MongoDB URI: ${config.MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
  if (config.NODE_ENV === 'production') {
    console.log('NODE_ENV: production');
  }
  });
}).catch((err) => {
  console.error('서버 시작 실패:', err);
  process.exit(1);
});
