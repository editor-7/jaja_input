/**
 * DB 등록 상품 → 엑셀 파일로 내보내기
 * 사용: node scripts/exportProductsToExcel.js
 * 출력: server/data/상품목록_내보내기.xlsx
 */

const path = require('path');
const mongoose = require('mongoose');
const XLSX = require('xlsx');
const config = require('../config/env');
const Product = require('../models/Product');

const OUT_DIR = path.join(__dirname, '..', 'data');
const OUT_FILE = path.join(OUT_DIR, '상품목록_내보내기.xlsx');

async function run() {
  try {
    await mongoose.connect(config.MONGODB_URI);
    const products = await Product.find().lean().sort({ sku: 1, _id: 1 });

    if (products.length === 0) {
      console.log('등록된 상품이 없습니다.');
      await mongoose.disconnect();
      process.exit(0);
    }

    function displayItemName(p) {
      const name = p.name || '';
      const base = name.replace(/\s*\(자재\)\s*$/, '').replace(/\s*\(인건\)\s*$/, '').trim();
      const spec = (p.spec || '').trim();
      if (!spec) return base;
      const escaped = spec.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return base.replace(new RegExp('\\s*' + escaped + '\\s*$'), '').trim() || base;
    }
    function remarkDisplay(p) {
      const cat = p.category || '';
      if (cat === '도시가스-자재') return '자재';
      if (cat === '도시가스-인건') return '인건';
      if (cat) return cat.replace(/^도시가스-/, '');
      return '';
    }

    // 헤더 + 데이터 행 (이미지 형식: 품목=품명만, 비고=자재/인건만)
    const headers = ['품목', '규격', '단위', '단가', '비고'];
    const rows = [headers];
    for (const p of products) {
      rows.push([
        displayItemName(p),
        p.spec || '',
        p.unit || p.size || '',
        p.price != null ? p.price : '',
        remarkDisplay(p),
      ]);
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);

    // 컬럼 너비
    ws['!cols'] = [
      { wch: 40 },
      { wch: 12 },
      { wch: 8 },
      { wch: 12 },
      { wch: 18 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, '상품목록');
    const fs = require('fs');
    if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
    XLSX.writeFile(wb, OUT_FILE);

    console.log('엑셀 저장 완료:', OUT_FILE);
    console.log('총', products.length, '건');
  } catch (err) {
    console.error('오류:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

run();
