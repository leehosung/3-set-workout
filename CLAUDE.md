# 3-Set Workout - Claude 작업 규칙

## PR 정책
- 코드 수정 후 항상 PR을 생성한다.
- base 브랜치: `main`
- PR 생성 후 squash merge로 자동 머지한다.
- 머지 후 feature 브랜치(로컬 및 원격)를 삭제한다.

## 버전 정책
- 모든 코드 수정 시 `index.html`의 `APP_VERSION`을 함께 올린다.
- 버전 형식: `vMAJOR.MINOR` (예: v2.1 → v2.2)
- 기능 추가/변경: MINOR +1, 큰 구조 변경: MAJOR +1
