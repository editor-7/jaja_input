# GitHub Secrets 설정 (CloudType 자동 배포용)

`main` 브랜치에 push 시 CloudType으로 자동 배포되려면 아래 **4개** 시크릿을 설정해야 합니다. (프로젝트 `gas0044/todo-backend` 고정)

## 설정 위치

GitHub 저장소 → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

---

## 필수 시크릿 목록

| 시크릿 이름 | 설명 | 발급 방법 |
|------------|------|----------|
| `CLOUDTYPE_TOKEN` | CloudType API Key | [CloudType API Key 발급](https://docs.cloudtype.io/guide/references/apikey) |
| `GHP_TOKEN` | GitHub Personal Token | [GitHub 토큰 발급](https://github.com/settings/tokens) - 권한: `admin:public_key`, `repo` |
| `MONGODB_URI` | MongoDB Atlas 연결 문자열 | Atlas Connect → 연결 문자열 복사 |
| `JWT_SECRET` | JWT 서명용 시크릿 | 아래 명령으로 생성 |

### JWT_SECRET 생성

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

---

## GHP_TOKEN 권한

- `admin:public_key` - Deploy Key 등록용
- `repo` - 저장소 접근용

---

## 확인

시크릿 설정 후 `main` 브랜치에 push 하거나, **Actions** 탭에서 **Deploy to cloudtype** 워크플로를 수동 실행해 보세요.
