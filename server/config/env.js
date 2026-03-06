const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const isProduction = process.env.NODE_ENV === 'production';

const config = {
  PORT: process.env.PORT || 3000,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/order_bread',
  JWT_SECRET: process.env.JWT_SECRET,
  NODE_ENV: process.env.NODE_ENV || 'development',
};

// 프로덕션 배포 시 JWT_SECRET 필수
if (isProduction && !config.JWT_SECRET) {
  console.error('❌ [배포 오류] NODE_ENV=production 환경에서는 JWT_SECRET 환경 변수가 반드시 필요합니다.');
  process.exit(1);
}

// 개발 환경에서 JWT_SECRET 없으면 경고
if (!isProduction && !config.JWT_SECRET) {
  console.warn('⚠️ JWT_SECRET이 설정되지 않았습니다. .env 파일을 확인하고 JWT_SECRET을 설정하세요. (기본값 사용 중)');
}

config.JWT_SECRET = config.JWT_SECRET || 'dev-default-secret-do-not-use-in-production';

module.exports = config;
