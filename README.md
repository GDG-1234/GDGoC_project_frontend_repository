# GDGoC_project_frontend_repository

GDGoC 팀 1234의 동국대 웹 길안내 프론트엔드 저장소.

- 스택: React 18, TypeScript, Vite
- 백엔드 API 서버(FastAPI, 기본 `http://127.0.0.1:8000/api/v1`)와 연동한다.

## 빠른 시작

```bash
npm install
npm run dev      # http://localhost:5173
```

## 폴더 구조

```text
src/
├── app/        # 진입점, 전역 스타일
├── pages/      # 페이지 (화면 상태 관리)
├── widgets/    # 화면 블록 (route-sidebar, map-2d-viewer, building-detail 등)
└── shared/     # api, data, types
```

## 주요 문서

- [시작하기](docs/시작하기.md): 개발 환경 세팅, 환경변수, 명령어
- [CLAUDE.md](CLAUDE.md): AI 도구 작업 규칙 및 코드 컨벤션
