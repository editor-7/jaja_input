require('./config/env');
const express = require('express');
const cors = require('cors');
const config = require('./config/env');
const connectDB = require('./config/db');
const Product = require('./models/Product');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const INITIAL_PRODUCTS = [
  { name: '깜바뉴', desc: '정성스럽게 구운 깜바뉴', category: '클래식', price: 18000, img: '/jpg/08.jpg', size: '1개', unit: 'EA' },
  { name: '바게트', desc: '정성스럽게 구운 바게트', category: '바게트', price: 15000, img: '/jpg/02.jpg', size: '1개', unit: 'EA' },
];

async function start() {
  await connectDB();
  const count = await Product.countDocuments();
  if (count === 0) {
    await Product.insertMany(INITIAL_PRODUCTS);
    console.log('초기 상품 2개 등록 완료');
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
