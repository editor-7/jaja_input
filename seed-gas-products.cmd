@echo off
cd /d "%~dp0"
echo 도시가스 상품 DB 시드 (기존 상품 전체 삭제 후 상품등록리스트.json 등록)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0seed-gas-products.ps1" %*
if errorlevel 1 pause
