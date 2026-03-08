/**
 * 도시가스 자재비/인건비 엑셀 → 상품등록리스트 변환 (로컬 실험용)
 * 사용: node scripts/excelToProductList.js
 * 입력: jaja_input_01.xlsx (프로젝트 상위 폴더)
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

// 규격 공백 제거 (예: "6 3 A" → "63A")
function normalizeSpec(s) {
  if (s == null || s === '') return '';
  return String(s).replace(/\s+/g, '').trim();
}

function toNum(v) {
  if (v === '' || v == null) return NaN;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function run() {
  const EXCEL_PATH = EXCEL_CANDIDATES.find((p) => fs.existsSync(p));
  if (!EXCEL_PATH) {
    console.error('엑셀 파일을 찾을 수 없습니다. 다음 중 한 곳에 두세요:', EXCEL_CANDIDATES);
    process.exit(1);
  }

  const wb = XLSX.readFile(EXCEL_PATH);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  const products = [];
  let skuSeq = 1;
  const seen = new Set(); // 품명+규격 중복 방지

  // 첫 3행은 헤더/소제목이므로 4행(인덱스 3)부터
  for (let i = 3; i < rows.length; i++) {
    const row = rows[i];
    const 품명 = row[0] != null ? String(row[0]).trim() : '';
    const 규격 = normalizeSpec(row[1]);
    const 단위 = (row[2] != null ? String(row[2]).trim() : '') || 'EA';
    const 재료비단가 = toNum(row[4]);
    const 노무비단가 = toNum(row[6]);

    if (!품명) continue;

    const nameBase = 규격 ? `${품명} ${규격}` : 품명;
    const key = nameBase;

    // 자재비 단가가 있으면 상품 1개 (도시가스-자재)
    if (Number.isFinite(재료비단가) && 재료비단가 > 0) {
      const sku = `GAS-${String(skuSeq++).padStart(4, '0')}`;
      products.push({
        sku,
        name: `${nameBase} (자재)`,
        desc: `도시가스 자재비 - ${품명} ${규격}`.trim(),
        spec: 규격,
        category: '도시가스-자재',
        price: Math.round(재료비단가),
        img: '',
        size: 단위,
        unit: 단위 === 'Ｍ' ? 'M' : 단위 || 'EA',
      });
    }

    // 노무비 단가가 있으면 상품 1개 (도시가스-인건)
    if (Number.isFinite(노무비단가) && 노무비단가 > 0) {
      const sku = `GAS-${String(skuSeq++).padStart(4, '0')}`;
      products.push({
        sku,
        name: `${nameBase} (인건)`,
        desc: `도시가스 인건비 - ${품명} ${규격}`.trim(),
        spec: 규격,
        category: '도시가스-인건',
        price: Math.round(노무비단가),
        img: '',
        size: 단위,
        unit: 단위 === 'Ｍ' ? 'M' : 단위 || 'EA',
      });
    }
  }

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(products, null, 2), 'utf8');
  console.log('상품등록리스트 작성 완료:', OUT_FILE);
  console.log('총 상품 수:', products.length);
}

run();
