# Linear Algebra Journey Map

정적 단일 페이지 웹사이트다. `index.html`, `styles.css`, `app.js`만으로 동작하고, 브라우저 `localStorage`에 섹션 진행 상태를 저장한다.

## 로컬 실행

```bash
cd /Users/wonnoa/Desktop/work/linear-algebra-toc-site
python3 -m http.server 4314
```

브라우저에서 `http://localhost:4314`로 열면 된다.

## 배포 준비

이 폴더는 정적 호스팅용으로 바로 올릴 수 있게 정리되어 있다.

- `netlify.toml`: Netlify 정적 배포 설정
- `favicon.svg`: 사이트 아이콘
- `social-preview.svg`: 공유용 미리보기 이미지
- `site.webmanifest`: 앱 메타데이터
- `robots.txt`: 기본 검색 허용

## 가장 빠른 공개 방법

`Netlify`에 수동 업로드하면 바로 공개 URL이 생긴다.

1. `linear-algebra-toc-site` 폴더를 그대로 업로드하거나
2. 아래 압축본을 업로드한다

배포용 압축본:

- `linear-algebra-toc-site-netlify.zip`

## 지속 배포로 바꾸려면

이 폴더는 이제 독립 Git 저장소로 써도 되게 정리해뒀다.

1. GitHub에서 빈 저장소를 하나 만든다
2. 아래 명령으로 원격 저장소를 연결한다
3. `main` 브랜치를 한 번 올린다
4. Netlify에서 현재 사이트에 GitHub 저장소를 연결한다
5. 이후에는 `git push`만 하면 자동 배포된다

예시:

```bash
cd /Users/wonnoa/Desktop/work/linear-algebra-toc-site
git remote add origin <YOUR_GITHUB_REPO_URL>
git push -u origin main
```

Netlify 연결 위치:

- `Project configuration`
- `Build & deploy`
- `Continuous deployment`
- `Repository`
- `Link repository`

연결이 끝나면 이후 작업 흐름은 아래처럼 단순해진다.

```bash
cd /Users/wonnoa/Desktop/work/linear-algebra-toc-site
git add .
git commit -m "update layout"
git push
```

## 공개 전에 바꾸면 좋은 것

- `index.html`의 `og:image`를 실제 배포 도메인 기준 절대 URL로 교체
- 필요하면 커스텀 도메인 연결
