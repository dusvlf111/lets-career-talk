# 렛츠커리어 톡방

오픈채팅방 대신 쓰는 기수별 전용 톡방입니다. Next.js 15 + Turso(libSQL) + Ably.

## 기능

- 아이디/비밀번호 회원가입 (입장 암호 `INVITE_CODE`가 맞아야 가입 가능)
- 채널: 기본 `#공지`(운영진만 글쓰기), `#자유`, `#질문` + 누구나 채널 생성/참여/나가기
- 1:1 DM, 스레드 답글, 이모지 리액션, @멘션(자동완성·강조·멘션 뱃지)
- 메시지 수정/삭제, 안 읽은 채널 표시, 메시지 검색
- 실시간: 새 메시지, 입력 중 표시, 접속 상태(초록 점)
- `ABLY_API_KEY`가 없으면 3초 폴링으로 자동 전환
- 모바일 레이아웃

**첫 번째로 가입한 사람이 관리자**가 됩니다(공지 작성, 채널 삭제, 타인 메시지 삭제).
기수 오픈 직후 운영진이 먼저 가입하세요.

## 환경변수

| 키 | 설명 |
|---|---|
| `TURSO_DATABASE_URL` | `libsql://...turso.io` (로컬은 생략 시 `file:local.db`) |
| `TURSO_AUTH_TOKEN` | Turso DB 토큰 |
| `ABLY_API_KEY` | Ably API 키 (Subscribe/Publish/Presence 권한) |
| `AUTH_SECRET` | 세션 서명용 랜덤 문자열 (`openssl rand -base64 32`) |
| `INVITE_CODE` | 기수 입장 암호 |
| `NEXT_PUBLIC_COHORT_NAME` | 화면에 표시할 기수 이름 (예: `렛츠커리어 3기`) |

테이블은 첫 요청 때 자동으로 생성됩니다(별도 마이그레이션 불필요).

## 새 기수 띄우기

1. Turso에서 새 DB 생성 → URL/토큰 발급
2. Vercel에서 이 레포로 새 프로젝트 생성 (예: `lct-3`)
3. 위 환경변수 입력 (`INVITE_CODE`, `NEXT_PUBLIC_COHORT_NAME`은 기수별로)
4. 배포 → 운영진이 먼저 가입(관리자) → 링크와 입장 암호 공유

Ably 키는 기수끼리 같이 써도 됩니다. 단, 같은 키를 쓰면 채널 이름이 겹치므로
기수별로 Ably 앱을 따로 만드는 것을 권장합니다(무료 플랜에서 여러 앱 가능).

## 로컬 개발

```bash
cp .env.example .env.local   # AUTH_SECRET, INVITE_CODE만 채워도 동작
npm install
npm run dev
```
