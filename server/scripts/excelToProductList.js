/**
 * 도시가스 자재비/인건비 엑셀 → 상품등록리스트 변환 (로컬 실험용)
 * 사용: node scripts/excelToProductList.js [엑셀파일경로]
 *    경로 생략 시 jaja_input_01.xlsx 후보에서 찾음. 경로 지정 시 전체물량 등 비고1 포함 엑셀 사용 가능.
 * 출력: data/상품등록리스트.json
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const OUT_DIR = path.join(__dirname, '..', 'data');
const OUT_FILE = path.join(OUT_DIR, '상품등록리스트.json');
// 엑셀 경로 후보: node_jaja/jaja_input_01.xlsx 또는 jaja_input/jaja_input_01.xlsx
const EXCEL_CANDIDATES = [
  path.join(__dirname, '..', '..', '..', 'jaja_input_01.xlsx'),
  path.join(__dirname, '..', '..', 'jaja_input_01.xlsx'),
];

const MAIN_CATEGORIES = ['지하관PLP', '지하관PEM', '노출관', '공통'];

// 규격 공백 제거 (예: "6 3 A" → "63A")
function normalizeSpec(s) {
  if (s == null || s === '') return '';
  return String(s).replace(/\s+/g, '').trim();
}

// 비고1(카탈로그) 값 정규화: 지하관PLP|지하관PEM|노출관|공통
function normalizeMainCategory(v) {
  if (v == null || v === '') return '';
  const s = String(v).trim();
  if (MAIN_CATEGORIES.includes(s)) return s;
  if (/^지하관\s*PE$/i.test(s) || /^PE$/i.test(s)) return '지하관PEM';
  if (/^지하관\s*PLP$/i.test(s) || /PLP/i.test(s)) return '지하관PLP';
  if (/^지하관\s*PEM$/i.test(s) || /PEM/i.test(s)) return '지하관PEM';
  if (/PE/i.test(s)) return '지하관PEM';
  if (/노출관|노출/.test(s)) return '노출관';
  if (/공통/.test(s)) return '공통';
  return '';
}

function toNum(v) {
  if (v === '' || v == null) return NaN;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
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

function run() {
  const argPath = process.argv[2];
  const EXCEL_PATH = argPath && fs.existsSync(argPath)
    ? argPath
    : EXCEL_CANDIDATES.find((p) => fs.existsSync(p));
  if (!EXCEL_PATH) {
    console.error('사용: node scripts/excelToProductList.js [엑셀파일경로]');
    console.error('엑셀 파일을 찾을 수 없습니다.');
    process.exit(1);
  }

  const wb = XLSX.readFile(EXCEL_PATH);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  const row0 = rows[0] || [];
  const row1 = rows[1] || [];
  const hasHeaderInRow0 = findCol(row0, ['품목', '품명', '규격']) >= 0;

  // 비고1 열
  let col비고1 = findCol(row0, ['비고1']);
  if (col비고1 < 0) col비고1 = findCol(row1, ['비고1']);
  if (col비고1 < 0) col비고1 = 9;

  // 품목/품명, 규격, 단위, 재료비단가, 노무비단가 — 헤더로 찾거나 기본 인덱스
  const col품명 = hasHeaderInRow0 ? findCol(row0, ['품목', '품명']) : -1;
  const col규격 = hasHeaderInRow0 ? findCol(row0, ['규격']) : -1;
  const col단위 = hasHeaderInRow0 ? findCol(row0, ['단위']) : -1;
  const col재료비 = hasHeaderInRow0 ? findCol(row0, ['자재비단가', '재료비단가']) : -1;
  const col노무비 = hasHeaderInRow0 ? findCol(row0, ['인건비단가', '노무비단가']) : -1;

  const dataStart = hasHeaderInRow0 ? 1 : 3;
  const i품명 = col품명 >= 0 ? col품명 : 0;
  const i규격 = col규격 >= 0 ? col규격 : 1;
  const i단위 = col단위 >= 0 ? col단위 : 2;
  const i재료비 = col재료비 >= 0 ? col재료비 : 4;
  const i노무비 = col노무비 >= 0 ? col노무비 : 6;

  const products = [];
  let skuJ = 1;
  let skuIN = 1;

  for (let i = dataStart; i < rows.length; i++) {
    const row = rows[i];
    const 품명 = row[i품명] != null ? String(row[i품명]).trim() : '';
    const 규격 = normalizeSpec(row[i규격]);
    const 단위 = (row[i단위] != null ? String(row[i단위]).trim() : '') || 'EA';
    const 재료비단가 = toNum(row[i재료비]);
    const 노무비단가 = toNum(row[i노무비]);
    const 비고1 = normalizeMainCategory(row[col비고1]);
    const mainCategory = MAIN_CATEGORIES.includes(비고1) ? 비고1 : '';

    if (!품명) continue;

    const nameBase = 규격 ? `${품명} ${규격}` : 품명;

    // 자재비 단가가 있으면 상품 1개 → SKU GAS-J-0001 순서
    if (Number.isFinite(재료비단가) && 재료비단가 > 0) {
      const sku = `GAS-J-${String(skuJ++).padStart(4, '0')}`;
      const prod = {
        sku,
        name: `${nameBase} (자재)`,
        desc: `도시가스 자재비 - ${품명} ${규격}`.trim(),
        spec: 규격,
        category: '도시가스-자재',
        price: Math.round(재료비단가),
        img: '',
        size: 단위,
        unit: 단위 === 'Ｍ' ? 'M' : 단위 || 'EA',
      };
      if (mainCategory) prod.mainCategory = mainCategory;
      products.push(prod);
    }

    // 노무비 단가가 있으면 상품 1개 → SKU GAS-IN-0001 순서
    if (Number.isFinite(노무비단가) && 노무비단가 > 0) {
      const sku = `GAS-IN-${String(skuIN++).padStart(4, '0')}`;
      const prod = {
        sku,
        name: `${nameBase} (인건)`,
        desc: `도시가스 인건비 - ${품명} ${규격}`.trim(),
        spec: 규격,
        category: '도시가스-인건',
        price: Math.round(노무비단가),
        img: '',
        size: 단위,
        unit: 단위 === 'Ｍ' ? 'M' : 단위 || 'EA',
      };
      if (mainCategory) prod.mainCategory = mainCategory;
      products.push(prod);
    }
  }

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(products, null, 2), 'utf8');
  console.log('상품등록리스트 작성 완료:', OUT_FILE);
  console.log('총 상품 수:', products.length);
}

run();
