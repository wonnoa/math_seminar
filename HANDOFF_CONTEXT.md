# 인수인계 문서

이 문서는 `/Users/wonnoa/Desktop/work/linear-algebra-toc-site` 프로젝트를 다른 작업자에게 넘길 때 필요한 맥락을 최대한 한곳에 모아두기 위한 문서다.

## 1. 프로젝트 한 줄 요약

선형대수 스터디를 위한 정적 웹사이트다.  
현재는 `정적 HTML/CSS/JS + Supabase(Auth + Postgres)` 구조이며, 공개 읽기와 제한적 쓰기 권한이 분리되어 있다.

핵심 개념:
- 홈: 선형대수 챕터 저니맵과 진행 상태
- 세션: 날짜별 세션 목록과 세션별 노트
- 멤버: 프로필 카드
- 공지사항: 메인 공지 + 날짜별 공지
- 인증/권한: Supabase 로그인 + RLS

## 2. 현재 운영 주소

현재 메인 공개 주소:
- `https://mathlearn.wonnoa91.workers.dev/`

과거 Netlify 주소:
- `https://mathstudywouldyoulearn.netlify.app/`

Netlify는 크레딧/레이트 제한 이슈로 사실상 메인 배포에서 제외했다.  
현재 기준 메타데이터, canonical, sitemap, robots는 `workers.dev` 기준으로 수정 완료되어 있다.

## 3. 저장소와 배포

GitHub:
- `https://github.com/wonnoa/math_seminar`

현재 배포:
- Cloudflare Workers & Pages

최근 푸시된 커밋들:
- `4322b60 Update metadata for Cloudflare domain`
- `184a50e Add emoji icons to sidebar navigation`
- `377c643 Add granular comment and member permissions`
- `93ef489 Add session block comments and masked admin login`
- `7d56a5f Add multi-page study app with Supabase-backed editing`

## 4. 로컬 실행

```bash
cd /Users/wonnoa/Desktop/work/linear-algebra-toc-site
python3 -m http.server 4320
```

브라우저:
- `http://127.0.0.1:4320/`

주의:
- macOS에서 `Desktop` 경로 권한이 꼬이면 `Operation not permitted`가 날 수 있었다.
- 그 경우 터미널 재실행으로 풀린 적이 있다.

## 5. 기술 구조

프레임워크 없음:
- 순수 `HTML + CSS + JS modules`

백엔드:
- Supabase
  - Auth
  - Postgres
  - RLS

호스팅:
- Cloudflare Workers & Pages

이미지 저장:
- 현재는 멤버 카드와 세션 노트 이미지가 DB 텍스트(base64/data URL)로 저장된다.
- Storage bucket 분리는 아직 안 했다.

## 6. 주요 페이지 구조

### 홈
- 파일: [index.html](/Users/wonnoa/Desktop/work/linear-algebra-toc-site/index.html)
- 스크립트: [app.js](/Users/wonnoa/Desktop/work/linear-algebra-toc-site/app.js)
- 역할:
  - 챕터 저니맵
  - 섹션 진행 상태 표시
  - 관리자만 progress 수정 가능

### 세션 목록
- 파일: [sessions.html](/Users/wonnoa/Desktop/work/linear-algebra-toc-site/sessions.html)
- 스크립트: [sessions-board.js](/Users/wonnoa/Desktop/work/linear-algebra-toc-site/sessions-board.js)
- 역할:
  - 온라인 세션 목록 로드
  - 관리자만 `새 세션 만들기`
  - 개별 세션은 공용 [session.html](/Users/wonnoa/Desktop/work/linear-algebra-toc-site/session.html)로 진입

### 공용 세션 페이지
- 파일: [session.html](/Users/wonnoa/Desktop/work/linear-algebra-toc-site/session.html)
- 스크립트:
  - [session-page.js](/Users/wonnoa/Desktop/work/linear-algebra-toc-site/session-page.js)
  - [session-editor.js](/Users/wonnoa/Desktop/work/linear-algebra-toc-site/session-editor.js)
- 역할:
  - URL query로 `key`, `date`, `title`을 받음
  - 세션 노트 생성/편집
  - 사진 블록 오른쪽에 댓글/대댓글 스레드

### 예전 고정 세션 페이지
- [session-2026-03-15.html](/Users/wonnoa/Desktop/work/linear-algebra-toc-site/session-2026-03-15.html)
- [session-2026-03-22.html](/Users/wonnoa/Desktop/work/linear-algebra-toc-site/session-2026-03-22.html)
- [session-2026-03-29.html](/Users/wonnoa/Desktop/work/linear-algebra-toc-site/session-2026-03-29.html)

`2026-03-29`는 여전히 실시간 편집용 세션 구조를 공유한다.

### 멤버 페이지
- 파일: [member.html](/Users/wonnoa/Desktop/work/linear-algebra-toc-site/member.html)
- 스크립트: [member-board.js](/Users/wonnoa/Desktop/work/linear-algebra-toc-site/member-board.js)
- 역할:
  - 3열 카드 레이아웃
  - 사진 첨부
  - 권한 사용자 본인 카드만 생성/수정/삭제
  - 관리자는 모든 카드 제어 가능

### 공지사항 페이지
- 파일: [notice.html](/Users/wonnoa/Desktop/work/linear-algebra-toc-site/notice.html)
- 스크립트: [notice-board.js](/Users/wonnoa/Desktop/work/linear-algebra-toc-site/notice-board.js)
- 역할:
  - 상단 고정 메인 공지
  - 날짜별 공지 목록
  - 관리자는 생성/수정/삭제 가능

주의:
- 이 페이지는 현재 “목록형 공지 + 관리자 인라인 수정”으로 바꾸는 작업을 **시작만 했고 아직 미완료**다.
- 아래 `15. 미완료 로컬 변경` 참고.

### 기타
- [progress.html](/Users/wonnoa/Desktop/work/linear-algebra-toc-site/progress.html)
- [future.html](/Users/wonnoa/Desktop/work/linear-algebra-toc-site/future.html)

이 두 페이지는 현재 구조만 있고 내용은 최소화되어 있다.

## 7. 스타일 / UI

중앙 스타일 파일:
- [styles.css](/Users/wonnoa/Desktop/work/linear-algebra-toc-site/styles.css)

현재 UI 특징:
- 다크 그린 기반
- 좌측 네비 + 중앙 메인
- 네비 아이콘은 CSS 이모지 기반
- 마스코트 이미지: [mascot.png](/Users/wonnoa/Desktop/work/linear-algebra-toc-site/mascot.png)
- 말풍선 “공사중!” 포함

최근 네비 이모지 매핑:
- 홈 `🏠`
- 세션 `🗂️`
- 진행 상황 `📈`
- 미래 지향 `🚀`
- 멤버 `👥`
- 공지사항 `📢`

## 8. 인증 및 권한

인증 패널:
- [supabase-auth.js](/Users/wonnoa/Desktop/work/linear-algebra-toc-site/supabase-auth.js)

현재 로그인 상태 종류:
- 비로그인
- 읽기 전용 로그인
- 권한 로그인
  - 댓글 권한
  - 멤버 카드 권한
- 관리자 로그인

현재 UI에 반영되는 상태:
- `data-admin`
- `data-can-comment`
- `data-can-manage-member-card`

## 9. Supabase 구조

설정 SQL:
- [supabase-setup.sql](/Users/wonnoa/Desktop/work/linear-algebra-toc-site/supabase-setup.sql)

핵심 테이블:
- `admin_emails`
- `user_permissions`
- `section_progress`
- `session_notes`
- `session_block_comments`
- `member_cards`
- `session_notices`

권한 함수:
- `public.is_admin()`
- `public.can_comment()`
- `public.can_manage_member_card()`

현재 권한 의도:
- 관리자:
  - 모든 기능
- 댓글 권한 사용자:
  - 세션의 댓글/대댓글 작성
- 멤버 카드 권한 사용자:
  - 자기 카드 1개 생성/수정/삭제
- 일반 로그인 사용자:
  - 읽기 전용

## 10. 현재 권한 동작 상세

### 관리자만 가능한 것
- 홈 진행 상태 수정
- 공지 생성/수정/삭제
- 새 세션 생성
- 세션 노트 구조 편집
  - 노트 만들기
  - 텍스트 박스 생성
  - 사진 박스 생성
  - 박스 삭제
  - 노트 저장/삭제
  - 사진 교체/제거
- 댓글 삭제

### 댓글 권한 사용자 가능한 것
- 세션 사진 블록 오른쪽에서 댓글 작성
- 대댓글 작성

불가능:
- 노트 구조 편집
- 댓글 삭제

### 멤버 카드 권한 사용자 가능한 것
- 멤버 페이지에서 자기 카드 1개 생성
- 자기 카드만 수정/삭제

불가능:
- 다른 사람 카드 편집
- 관리자 전용 기능

## 11. 세션 편집 구조

세션 노트는 현재 “문서 전체 실시간 동시편집”이 아니다.

구조:
- 노트 단위
  - 제목
  - 블록들
- 블록 종류
  - 텍스트 블록
  - 사진 블록
- 사진 블록 오른쪽
  - 댓글 스레드
  - 대댓글

중요:
- 노트 구조는 여전히 전체 저장 방식이다.
- 댓글은 블록 단위 row로 분리 저장된다.
- 즉 협업은 “문서 실시간 동기화”가 아니라 “댓글형 협업”에 가깝다.

동시 편집 의미:
- 댓글은 비교적 안전
- 노트 구조 편집은 여러 관리자가 동시에 하면 마지막 저장이 이길 수 있음

## 12. 데이터 접근 JS

Supabase 데이터 접근 모듈:
- [supabase-data.js](/Users/wonnoa/Desktop/work/linear-algebra-toc-site/supabase-data.js)

주요 함수:
- `fetchSectionProgressMap`
- `saveSectionProgress`
- `fetchSessionNotes`
- `saveSessionNotes`
- `createSessionNote`
- `fetchSessionBlockComments`
- `createSessionBlockComment`
- `deleteSessionBlockComment`
- `fetchMembers`
- `saveMember`
- `deleteMember`
- `fetchNotices`
- `saveNotice`
- `deleteNotice`

## 13. 현재 공개 운영에서 중요한 점

Cloudflare로 옮기면서 URL이 바뀌었다.

현재 workers.dev 기준으로 수정 완료:
- canonical
- og url/image
- JSON-LD
- robots
- sitemap

README는 일부 Netlify 중심 설명이 남아 있어서 현재 운영 상태와 완전히 일치하지 않을 수 있다.  
실제 운영 기준은 이 문서를 우선 참고하는 편이 낫다.

## 14. 작업자가 먼저 확인해야 할 파일

우선순위 순:
- [index.html](/Users/wonnoa/Desktop/work/linear-algebra-toc-site/index.html)
- [styles.css](/Users/wonnoa/Desktop/work/linear-algebra-toc-site/styles.css)
- [supabase-auth.js](/Users/wonnoa/Desktop/work/linear-algebra-toc-site/supabase-auth.js)
- [supabase-data.js](/Users/wonnoa/Desktop/work/linear-algebra-toc-site/supabase-data.js)
- [session-editor.js](/Users/wonnoa/Desktop/work/linear-algebra-toc-site/session-editor.js)
- [member-board.js](/Users/wonnoa/Desktop/work/linear-algebra-toc-site/member-board.js)
- [notice-board.js](/Users/wonnoa/Desktop/work/linear-algebra-toc-site/notice-board.js)
- [supabase-setup.sql](/Users/wonnoa/Desktop/work/linear-algebra-toc-site/supabase-setup.sql)

## 15. 현재 미완료 로컬 변경

이 문서 작성 시점 기준, 아직 커밋/푸시되지 않은 작업이 있다.

수정 중 파일:
- [notice-board.js](/Users/wonnoa/Desktop/work/linear-algebra-toc-site/notice-board.js)
- [supabase-data.js](/Users/wonnoa/Desktop/work/linear-algebra-toc-site/supabase-data.js)

의도:
- 날짜별 공지를 지금처럼 페이지 안에서 전부 펼쳐 보여주는 대신
- “공지 목록 카드” 형태로 줄이고
- 각각 클릭해서 개별 상세 페이지로 들어가게 바꾸려는 작업

현재 상태:
- 목록 카드형 렌더 초안 시작
- `fetchNoticeById` 추가
- 아직 상세 페이지 파일 `notice-post.html` / `notice-post.js`는 없음
- 따라서 이 부분은 아직 중간 상태다

즉 지금 공지 관련 후속 작업자는 먼저 `git status`를 보고 이 변경을 정리해야 한다.

## 16. 권한 추가 방법

새 사용자 계정 생성:
- Supabase `Authentication > Users > Add user`

권한 부여:

댓글만:
```sql
insert into public.user_permissions (email, can_comment)
values ('someone@example.com', true)
on conflict (email) do update
set can_comment = true,
    updated_at = now();
```

멤버 카드만:
```sql
insert into public.user_permissions (email, can_manage_member_card)
values ('someone@example.com', true)
on conflict (email) do update
set can_manage_member_card = true,
    updated_at = now();
```

둘 다:
```sql
insert into public.user_permissions (email, can_comment, can_manage_member_card)
values ('someone@example.com', true, true)
on conflict (email) do update
set can_comment = excluded.can_comment,
    can_manage_member_card = excluded.can_manage_member_card,
    updated_at = now();
```

## 17. 알려진 제약 / 리스크

- 멤버 카드 이미지와 세션 이미지가 DB에 직접 들어간다
  - Storage 분리 전이라 대용량 이미지에 취약
- 세션 노트 본문 구조는 실시간 협업이 아님
- 댓글 삭제는 현재 관리자만 가능
- 공지 상세 페이지 분리 작업은 아직 미완료
- README가 현 운영 상태를 100% 반영하지 않음

## 18. 다음 작업 추천

가장 자연스러운 다음 우선순위:
1. 공지사항 페이지를 목록형 + 개별 상세 페이지로 완성
2. README를 현재 Cloudflare/Supabase 기준으로 갱신
3. 멤버 카드 이미지를 Supabase Storage로 이전
4. 세션 페이지 댓글 삭제를 작성자 본인도 가능하게 확장 여부 검토
5. 세션 노트 구조 편집의 충돌 방지 개선

## 19. 요약

현재 프로젝트는 “프로토타입”을 넘어서, 이미 공개 배포되고 로그인/권한/온라인 저장이 되는 작은 서비스 상태다.  
하지만 완전히 정리된 제품이라기보다, 기능이 빠르게 확장된 상태라 문서화와 몇몇 페이지 구조 정리가 다음 작업에서 중요하다.
