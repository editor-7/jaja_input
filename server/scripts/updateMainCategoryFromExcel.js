/**
 * 엑셀의 비고1(카탈로그)을 DB 상품 mainCategory에 반영
 * - 사용: node scripts/updateMainCategoryFromExcel.js "경로\파일.xlsx"
 * - 엑셀에 품목, 규격, 비고1 열이 있어야 함. 비고1 = 지하관PLP | 지하관PEM | 노출관 | 공통
 * - MongoDB 연결 필요 (서버 .env의 MONGODB_URI)
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const mongoose = require('mongoose');
const config = require('../config/env');
const Product = require('../models/Product');

const MAIN_CATEGORIES = ['지하관PLP', '지하관PEM', '노출관', '공통'];

function normalizeSpec(s) {
  if (s == null || s === '') return '';
  return String(s).replace(/\s+/g, '').trim();
}
function normalizeName(s) {
  if (s == null || s === '') return '';
  return String(s).replace(/\s+/g, ' ').trim();
}

function normalizeMainCategory(v) {
  if (v == null || v === '') return '';
  const s = String(v).trim();
  if (MAIN_CATEGORIES.includes(s)) return s;
  if (/PLP/i.test(s)) return '지하관PLP';
  if (/PEM/i.test(s)) return '지하관PEM';
  if (/노출관|노출/.test(s)) return '노출관';
  if (/공통/.test(s)) return '공통';
  return '';
}

// 상품명에서 규격 제거 후 품목만 (getDisplayItemName 유사)
function getDisplayItemName(product) {
  const name = (product.name || '').replace(/\s*\(자재\)\s*$/, '').replace(/\s*\(인건\)\s*$/, '').trim();
  const spec = (product.spec || '').trim();
  if (!spec) return name;
  const escaped = spec.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return name.replace(new RegExp('\\s*' + escaped + '\\s*$', 'i'), '').trim() || name;
}

function findCol(headerRow, names) {
  if (!Array.isArray(headerRow)) return -1;
  for (const n of names) {
    const key = String(n).trim().replace(/\s/g, '');
    const idx = headerRow.findIndex((c) => String(c || '').trim().replace(/\s/g, '') === key);
    if (idx >= 0) return idx;
  }
  return -1;
}

async function run() {
  const filePath = process.argv[2];
  if (!filePath || !fs.existsSync(filePath)) {
    console.error('사용법: node scripts/updateMainCategoryFromExcel.js "경로\\\\파일.xlsx"');
    console.error('엑셀에 품목, 규격, 비고1 열이 있어야 합니다.');
    process.exit(1);
  }

  const wb = XLSX.readFile(filePath, { cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const headerRow = rows[0] || [];
  const col품목 = findCol(headerRow, ['품목', '품명']);
  const col규격 = findCol(headerRow, ['규격']);
  const col비고1 = findCol(headerRow, ['비고1']);
  const col비고2 = findCol(headerRow, ['비고2', '비고 2']);
  if (col품목 < 0 || col비고1 < 0) {
    console.error('엑셀에 품목(또는 품명), 비고1 열이 필요합니다.');
    process.exit(1);
  }
  const i규격 = col규격 >= 0 ? col규격 : 1;
  const i비고2 = col비고2 >= 0 ? col비고2 : 10;
  if (col비고2 >= 0) console.log('비고2 열 인덱스:', col비고2);

  function is인건만(v) {
    if (v == null || v === '') return false;
    const s = String(v).trim().replace(/\s+/g, ' ');
    if (s === '인건') return true;
    return /인건\s*만/.test(s) || s === '인건만';
  }

  const excelMap = new Map();
  const excelMapFull = new Map();
  const excel노출관Alias = new Map();
  const excelRowsByCat = { 지하관PLP: 0, 지하관PEM: 0, 노출관: 0, 공통: 0 };
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const 품목 = normalizeName(String(row[col품목] ?? ''));
    const 규격 = normalizeSpec(row[i규격] ?? '');
    const 비고1 = normalizeMainCategory(row[col비고1]);
    const 비고2 = col비고2 >= 0 ? row[i비고2] : '';
    const 인건만 = col비고2 >= 0 && is인건만(비고2);
    if (!품목 || !MAIN_CATEGORIES.includes(비고1)) continue;
    if (excelRowsByCat[비고1] !== undefined) excelRowsByCat[비고1]++;
    const val = { mainCategory: 비고1, laborOnly: 인건만 };
    const key = `${품목}|${규격}`.toLowerCase();
    excelMap.set(key, val);
    excelMap.set(`${품목}|`.toLowerCase(), val);
    const full = (품목 + 규격).replace(/\s/g, '').toLowerCase();
    excelMapFull.set(full, val);
    if (비고1 === '노출관') {
      const 품목노출 = 품목.replace(/노출관/g, '노출');
      excel노출관Alias.set(`${품목노출}|${규격}`.toLowerCase(), val);
      excel노출관Alias.set((품목노출 + 규격).replace(/\s/g, '').toLowerCase(), val);
    }
  }
  console.log('엑셀 비고1 행 수:', Object.entries(excelRowsByCat).map(([c, n]) => `${c}=${n}`).join(', '));
  console.log('노출관 매칭용 별칭 키 수:', excel노출관Alias.size);

  function is인건Product(p) {
    const cat = (p.category || '').trim();
    if (cat === '도시가스-인건') return true;
    return /\(인건\)\s*$/.test(p.name || '');
  }

  try {
    await mongoose.connect(config.MONGODB_URI);
    const products = await Product.find().lean();
    let updated = 0;
    let laborOnlyCount = 0;
    const countByCat = { 지하관PLP: 0, 지하관PEM: 0, 노출관: 0, 공통: 0 };
    for (const p of products) {
      const displayName = normalizeName(getDisplayItemName(p));
      const spec = normalizeSpec(p.spec);
      const key = `${displayName}|${spec}`.toLowerCase();
      const keyNoSpec = `${displayName}|`.toLowerCase();
      const fullKey = (displayName + spec).replace(/\s/g, '').toLowerCase();
      let val = excelMap.get(key) || excelMap.get(keyNoSpec) || excelMapFull.get(fullKey) || null;
      if (!val) val = excel노출관Alias.get(key) || excel노출관Alias.get(fullKey) || null;
      if (!val || !val.mainCategory) continue;
      const mainCategory = val.mainCategory;
      if (countByCat[mainCategory] !== undefined) countByCat[mainCategory]++;
      const laborOnly = is인건Product(p) && val.laborOnly;
      if (laborOnly) laborOnlyCount++;
      await Product.updateOne(
        { _id: p._id },
        { $set: { mainCategory, laborOnly: !!laborOnly } }
      );
      updated++;
      if (updated <= 8) console.log('  예:', p.name, '→', mainCategory, laborOnly ? '(인건)' : '');
    }
    console.log('비고1(카탈로그) 반영 완료. 업데이트:', updated, '/', products.length);
    console.log('DB 반영 결과:', Object.entries(countByCat).map(([c, n]) => `${c}=${n}`).join(', '));
    console.log('비고2=인건만 반영( laborOnly ):', laborOnlyCount, '건');
  } catch (err) {
    console.error('오류:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

run();
