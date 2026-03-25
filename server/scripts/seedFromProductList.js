/**
 * 상품등록리스트.json → MongoDB 로컬 시드 (배포 안 함, 실험용)
 * 사용: node scripts/seedFromProductList.js
 * 먼저 node scripts/excelToProductList.js 로 JSON 생성 후 실행
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const config = require('../config/env');
const Product = require('../models/Product');

const LIST_PATH = path.join(__dirname, '..', 'data', '상품등록리스트.json');

async function seed() {
  if (!fs.existsSync(LIST_PATH)) {
    console.error('상품등록리스트가 없습니다. 먼저 실행: node scripts/excelToProductList.js');
    process.exit(1);
  }

  const list = JSON.parse(fs.readFileSync(LIST_PATH, 'utf8'));
  if (!Array.isArray(list) || list.length === 0) {
    console.error('상품 목록이 비어 있습니다.');
    process.exit(1);
  }

  try {
    await mongoose.connect(config.MONGODB_URI);
    const existing = await Product.countDocuments();
    if (existing > 0) {
      console.log('기존 상품 수:', existing);
			console.log('이미 상품이 존재합니다. (기본값: 시딩 건너뜀)');
			console.log('정말로 덮어쓰려면:');
			console.log('  node scripts/seedFromProductList.js --replace');
      const doReplace = process.argv.includes('--replace');
			if (!doReplace) {
				await mongoose.disconnect();
				return;
			}
      await Product.deleteMany({});
      console.log('기존 상품 삭제 후 재등록합니다.');
    }
    await Product.insertMany(list);
    console.log('상품등록리스트 시드 완료:', list.length, '개');
  } catch (err) {
    console.error('Seed 오류:', err.message);
    if (err.code === 11000) console.error('SKU 중복이 있을 수 있습니다. 엑셀 변환 스크립트를 다시 실행해 보세요.');
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

seed();
