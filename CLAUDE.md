# CLAUDE.md

AI 코딩 도구(Claude Code, Cursor, Copilot, Antigravity 등)가 이 저장소에서 작업할 때 따르는 규칙이다.
**같은 규칙을 쓰도록 이 파일을 함께 관리한다.** 규칙을 바꿀 때는 PR로 바꾼다.

## 프로젝트

- GDGoC 팀 1234 프론트엔드.
- 스택: React 18, TypeScript, Vite

## 자주 쓰는 명령

```bash
npm install          # 의존성 설치
npm run dev          # 개발 서버 실행
npm run build        # 타입 체크(tsc -b) 및 프로덕션 빌드
npm run preview      # 빌드 결과물 프리뷰
```

## 폴더 구조 (`FSD-Lite`)

단방향 의존성 규칙(`app → pages → widgets → features → shared`)을 따른다.

```text
src/
├── app/                  # 진입점(main.tsx), App.tsx, 전역 스타일(styles.css)
├── pages/                # 페이지 레이아웃
├── widgets/              # 독립적인 화면 블록 단위 (사이드바, 지도 뷰어 등)
├── features/             # 유저 인터랙션 및 비즈니스 로직 (검색, 경로 탐색 등)
└── shared/               # 공통 모듈 (api, data, types, ui)
```

## 코드 규칙

- 계층 방향: `app → pages → widgets → features → shared`. 하위 계층에서 상위 계층을 import하지 않는다.
- 요청/응답에는 항상 `src/shared/types/`에 정의된 TypeScript 인터페이스를 사용한다 (`any` 사용 지양).
- API 호출은 컴포넌트 안에서 `fetch`를 직접 부르지 않고 `src/shared/api/` 계층을 통해 수행한다.
- 검색·안내 목록 등 데이터 처리 상태와 지도 렌더링 뷰어 컴포넌트를 분리한다.
- 에러 처리는 서버의 `error.message`를 그대로 노출하지 않고 `error.code`로 분기한다.
- 설정값과 서버 주소는 `import.meta.env`(`VITE_*`)를 통해 `.env`에서 읽는다. 코드에 하드코딩하지 않는다.
- 정적 이미지 URL은 API 응답에 포함된 경로를 그대로 사용하고 파일 이름을 직접 조합하지 않는다.

## AI가 지켜야 할 것 (충돌 방지)

- **작업 범위 밖의 파일을 고치지 않는다.** 요청받지 않은 위젯이나 공용 설정 파일을 임의로 수정하지 않는다.
- 공용 파일(`package.json`, `vite.config.ts`, `tsconfig.json`, `src/shared/types/*`, `src/shared/api/*`)을 바꿔야 하면 바꾸기 전에 사용자에게 알린다.
- 대규모 리포맷, 파일 이동, 이름 변경을 임의로 하지 않는다.
- 패키지를 추가할 때는 추가한 이유를 사용자에게 알린다.
- `.env`, 비밀값, 토큰을 커밋하거나 출력하지 않는다. 새 환경변수는 `.env.example`에 추가한다.

## Git 컨벤션

- 브랜치: `feat/<기능명>`, `fix/...`, `chore/...`, `refactor/...`, `docs/...`
- 커밋: `<type>: <한글 설명>` (예: `feat: 장소 자동완성 검색 구현`)
  - type: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`
- `main`에 직접 push하지 않는다. 항상 PR → 리뷰 → Squash merge.
