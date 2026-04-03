# 도시가스 상품 전체를 MongoDB에 넣습니다 (상품등록리스트.json → DB).
# 기존 상품은 모두 삭제 후 다시 넣습니다 (--replace).
#
# 방법 1) Atlas 주소를 한 번만 넘겨 실행 (비밀번호 노출 주의 — 터미널 기록에 남을 수 있음)
#   .\seed-gas-products.ps1 -MongoUri "mongodb+srv://user:pass@cluster.mongodb.net/order_bread"
#
# 방법 2) server\.env 에 MONGODB_URI 를 실제 Atlas 로 넣은 뒤
#   .\seed-gas-products.ps1
#
# 방법 3) npm (루트에서)
#   npm run seed:gas
#   npm run seed:gas -- --MongoUri="mongodb+srv://..."

param(
  [string]$MongoUri = ""
)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$server = Join-Path $root "server"
$list = Join-Path $server "data\상품등록리스트.json"

if (-not (Test-Path $server)) {
  Write-Host "server 폴더를 찾을 수 없습니다: $server" -ForegroundColor Red
  exit 1
}
if (-not (Test-Path $list)) {
  Write-Host "상품등록리스트.json 이 없습니다: $list" -ForegroundColor Red
  exit 1
}

$envExample = Join-Path $server ".env.example"
$envFile = Join-Path $server ".env"

if ($MongoUri -ne "") {
  $env:MONGODB_URI = $MongoUri
  Write-Host "MONGODB_URI 를 인자로 사용합니다 (쉘 환경 변수)." -ForegroundColor Cyan
} elseif (-not (Test-Path $envFile)) {
  if (Test-Path $envExample) {
    Copy-Item $envExample $envFile
  }
  Write-Host ""
  Write-Host "========================================" -ForegroundColor Yellow
  Write-Host " server\.env 가 없어 .env.example 을 복사했습니다." -ForegroundColor Yellow
  Write-Host " 다음을 하세요:" -ForegroundColor Yellow
  Write-Host "  1) server\.env 열기" -ForegroundColor Yellow
  Write-Host "  2) MONGODB_URI 를 Cloudtype/Atlas 에 쓰는 연결 문자열로 수정" -ForegroundColor Yellow
  Write-Host "  3) 이 스크립트 다시 실행: .\seed-gas-products.ps1" -ForegroundColor Yellow
  Write-Host " 또는 한 줄로:" -ForegroundColor Yellow
  Write-Host "  .\seed-gas-products.ps1 -MongoUri `"mongodb+srv://...`"" -ForegroundColor Yellow
  Write-Host "========================================" -ForegroundColor Yellow
  exit 1
}

Push-Location $server
try {
  if (-not (Test-Path "node_modules")) {
    Write-Host "npm install 실행 중..." -ForegroundColor Cyan
    npm install
  }
  Write-Host "도시가스 상품 시드 실행 (기존 상품 삭제 후 등록)..." -ForegroundColor Cyan
  npm run seed-list:replace
  Write-Host "완료. 브라우저에서 상품 목록을 새로고침 하세요." -ForegroundColor Green
} finally {
  Pop-Location
}
