const mongoose = require('mongoose');
const config = require('../config/env');
const Product = require('../models/Product');

const INITIAL_PRODUCTS = [
  { name: 'PEM 관 63A (자재)', desc: '도시가스 자재비 - PEM 관 63A', category: '도시가스-자재', price: 3155, img: '', size: 'M', unit: 'M' },
  { name: 'PEM 관 63A (인건)', desc: '도시가스 인건비 - PEM 관 63A', category: '도시가스-인건', price: 6769, img: '', size: 'M', unit: 'M' },
];

async function seed() {
  try {
    await mongoose.connect(config.MONGODB_URI);
    const count = await Product.countDocuments();
    if (count === 0) {
      await Product.insertMany(INITIAL_PRODUCTS);
      console.log('초기 도시가스 자재 상품 2개 등록 완료');
    }
  } catch (err) {
    console.error('Seed 오류:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

seed();
