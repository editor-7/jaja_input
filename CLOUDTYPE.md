# 클라우드타입 배포 가이드 (order_bread 서버)

## 배포 체크리스트

- [ ] 1단계: MongoDB Atlas 클러스터 생성
- [ ] 2단계: Atlas Database Access (사용자 추가)
- [ ] 3단계: Atlas Network Access (0.0.0.0/0 추가)
- [ ] 4단계: 클라우드타입 서비스 추가 (저장소: order_bread, 서브디렉토리: server)
- [ ] 5단계: 클라우드타입 환경 변수 설정 (NODE_ENV, MONGODB_URI, JWT_SECRET)
- [ ] 6단계: **GitHub Secrets 설정** (4개: CLOUDTYPE_TOKEN, GHP_TOKEN, MONGODB_URI, JWT_SECRET)
- [ ] 7단계: 클라우드타입 배포 완료 후 URL 확인
- [ ] 8단계: `vercel.json`·`client/vercel.json` 의 **`routes`** 목적지(Cloudtype 기본 URL + `/api/$1`)가 실제 배포와 일치하는지 확인 (URL 바뀌면 **두 파일 모두** 수정). **`VITE_API_URL`은 비우거나 삭제** (남아 있으면 브라우저가 Cloudtype으로 직행)
- [ ] 9단계: Cloudtype·GitHub Actions 배포 환경의 **`CORS_ORIGINS`** 에 프론트 도메인 포함 (예: `https://jaja-input-02.vercel.app`)
- [ ] 10단계: Vercel **Redeploy** (가능하면 cache 없이)

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

프로덕션 예: [https://jaja-input-02.vercel.app](https://jaja-input-02.vercel.app)

프론트는 **같은 도메인**의 `/api`만 호출하고, **`vercel.json` / `client/vercel.json` 의 `routes`** 가 클라우드타입으로 **프록시**합니다.  
브라우저가 Cloudtype URL로 **직접** 가면 CORS/OPTIONS 이슈가 나기 쉽습니다.

1. 저장소의 `vercel.json`·`client/vercel.json` 안 **`dest`** URL이 클라우드타입 **기본 URL**(org/…/service 포함) + `/api/$1` 인지 확인하고, 배포 주소가 바뀌면 **두 파일 모두** 같은 값으로 수정합니다.
2. [Vercel](https://vercel.com) → **Environment Variables** → **`VITE_API_URL` 삭제** (또는 값 비움). 빌드에 남아 있으면 요청이 클라우드타입으로 직행합니다.
3. **Deployments** → **Redeploy** (가능하면 cache 없이)

정상이면 브라우저 Network의 요청 URL은 `https://(vercel도메인)/api/users/login` 이고, Vercel이 백엔드로 넘깁니다.

## 6. GitHub Actions 자동 배포

`main` 브랜치 push 시 자동 배포됩니다. **필수**: [GITHUB_SECRETS.md](./GITHUB_SECRETS.md) 참고하여 4개 시크릿 설정.

- `CLOUDTYPE_TOKEN` - CloudType API Key
- `GHP_TOKEN` - GitHub Personal Token
- `MONGODB_URI` - MongoDB 연결 문자열
- `JWT_SECRET` - JWT 서명용 64자 랜덤 문자열

수동 배포: **Actions** → **Deploy to cloudtype** → **Run workflow**

## 7. CLI 배포 (선택)

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
- **GitHub Actions 오류**: [GITHUB_SECRETS.md](./GITHUB_SECRETS.md) 시크릿 4개 모두 설정했는지 확인
