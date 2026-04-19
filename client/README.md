# Shopping Mall Client

Vite + React 프론트엔드 프로젝트

## 프로젝트 구조

```
client/
├── public/           # 정적 파일
├── src/
│   ├── assets/      # 이미지, 폰트 등
│   ├── components/  # 재사용 컴포넌트
│   ├── hooks/       # 커스텀 훅
│   ├── pages/       # 페이지 컴포넌트
│   ├── services/    # API 호출
│   ├── utils/       # 유틸 함수
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── index.html
├── vite.config.js
├── jsconfig.json
└── package.json
```

## 시작하기

### 의존성 설치

```bash
cd client
npm install
```

### 개발 서버 실행

```bash
npm run dev
```

개발 서버는 `http://localhost:3000` 에서 실행됩니다.

### 빌드

```bash
npm run build
```

### Vercel 배포 시

- GitHub 저장소 **루트**를 프로젝트로 연결하고, **Root Directory**는 비워 두는 것이 `루트 vercel.json` 설정과 맞습니다.
- Cloudinary는 **`client/.env.production`** 에 `VITE_CLOUDINARY_*` 가 들어 있으면, 대시보드에 환경 변수를 따로 넣지 않아도 빌드에 포함됩니다. (값을 바꾸면 이 파일을 수정해 푸시)
- API는 루트 `vercel.json` 의 `/api` 리라이트로 Cloudtype을 바라봅니다.

### 프리뷰 (빌드 결과 확인)

```bash
npm run preview
```

## Path Alias

`@/` 는 `src/` 폴더를 가리킵니다.

```jsx
import HomePage from '@/pages/HomePage'
import Button from '@/components/Button'
```

## API Proxy

`/api` 요청은 `http://localhost:5000` (백엔드 서버)로 프록시됩니다.
