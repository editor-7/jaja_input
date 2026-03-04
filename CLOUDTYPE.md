# 클라우드타입 배포 가이드 (order_bread 서버)

## 배포 체크리스트

- [ ] 1단계: MongoDB Atlas 클러스터 생성
- [ ] 2단계: Atlas Database Access (사용자 추가)
- [ ] 3단계: Atlas Network Access (0.0.0.0/0 추가)
- [ ] 4단계: 클라우드타입 서비스 추가 (저장소: order_bread, 서브디렉토리: server)
- [ ] 5단계: 클라우드타입 환경 변수 설정 (NODE_ENV, MONGODB_URI, JWT_SECRET)
- [ ] 6단계: 클라우드타입 배포 완료 후 URL 확인
- [ ] 7단계: Vercel → Settings → Environment Variables → VITE_API_URL 추가
- [ ] 8단계: Vercel Redeploy

---

## 1. 사전 준비

- [클라우드타입](https://cloudtype.io/) 가입
- GitHub에 `order_bread` 저장소 푸시 완료
- **MongoDB Atlas** 계정 (로컬 MongoDB 대신 클라우드 DB 사용 권장)

## 2. MongoDB Atlas 설정

1. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)에서 클러스터 생성
2. Database Access → 사용자 추가
3. Network Access → `0.0.0.0/0` 추가 (클라우드타입에서 접속 허용)
4. Connect → 연결 문자열 복사

   예: `mongodb+srv://user:password@cluster0.xxxxx.mongodb.net/order_bread`

## 3. 클라우드타입 대시보드 배포

### 3-1. 새 앱 생성

1. [클라우드타입](https://cloudtype.io/) 로그인
2. **서비스 추가** → **배포할 저장소 선택**
3. `order_bread` 저장소 선택
4. **서브 디렉토리**: `server` 입력 (중요)

### 3-2. 빌드 설정

| 항목 | 값 |
|------|-----|
| Install | `npm ci --production` 또는 `npm install` |
| Start | `npm start` |
| 포트 | `3000` (클라우드타입이 자동 지정) |

### 3-3. 환경 변수

| 이름 | 값 | 필수 |
|------|-----|------|
| `NODE_ENV` | `production` | ✅ |
| `MONGODB_URI` | MongoDB Atlas 연결 문자열 | ✅ |
| `JWT_SECRET` | 랜덤 64자 문자열 | ✅ |

JWT_SECRET 생성:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3-4. 배포

리전 선택 후 **배포하기** 클릭

## 4. 배포 URL 확인

배포 완료 후 `https://xxx.cloudtype.app` 형태의 URL이 발급됩니다.

## 5. Vercel 프론트엔드 연동

배포된 API URL을 Vercel에 환경 변수로 설정:

1. [Vercel](https://vercel.com) → order_bread 프로젝트 → **Settings** → **Environment Variables**
2. **Add** 클릭:
   - **Name**: `VITE_API_URL`
   - **Value**: `https://order-bread-api-xxx.cloudtype.app` (클라우드타입 URL, 끝에 `/` 없이)
3. **Save** 후 **Deployments** → 최신 배포 → **Redeploy** 실행

이후 프론트엔드가 API 요청을 클라우드타입 서버로 보냅니다.

## 6. CLI 배포 (선택)

```bash
# CLI 설치
npm i -g @cloudtype/cli

# 로그인
ctype login

# order_bread 폴더에서 배포 (서브디렉토리는 대시보드에서 server로 설정)
cd order_bread
ctype apply
```

대시보드에서 **서브 디렉토리**를 `server`로 설정해 두어야 합니다.

## 문제 해결

- **MongoDB 연결 실패**: Atlas Network Access에 `0.0.0.0/0` 추가 확인
- **JWT 오류**: `JWT_SECRET` 환경 변수 설정 확인
- **빌드 실패**: 서브 디렉토리를 `server`로 설정했는지 확인
