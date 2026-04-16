import { fetchNoticeById } from "./supabase-data.js?v=20260416-004";

const root = document.querySelector("[data-notice-post-root]");

if (root) {
  const params = new URLSearchParams(window.location.search);
  const noticeId = params.get("id") || "";

  const loading = document.querySelector("[data-notice-post-loading]");
  const empty = document.querySelector("[data-notice-post-empty]");
  const article = document.querySelector("[data-notice-post]");
  const pageTitle = document.querySelector("[data-notice-post-title]");
  const heading = document.querySelector("[data-notice-post-heading]");
  const dateEl = document.querySelector("[data-notice-post-date]");
  const savedEl = document.querySelector("[data-notice-post-saved]");
  const bodyEl = document.querySelector("[data-notice-post-body]");

  const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const timeFormatter = new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const setEmpty = () => {
    loading.hidden = true;
    article.hidden = true;
    empty.hidden = false;
    if (pageTitle) {
      pageTitle.textContent = "공지 없음";
    }
  };

  const renderBody = (text) => {
    bodyEl.replaceChildren();

    const blocks = String(text || "")
      .split(/\n{2,}/)
      .map((block) => block.trim())
      .filter(Boolean);

    if (blocks.length === 0) {
      const paragraph = document.createElement("p");
      paragraph.textContent = "내용이 아직 없습니다.";
      bodyEl.appendChild(paragraph);
      return;
    }

    blocks.forEach((block) => {
      const paragraph = document.createElement("p");
      paragraph.textContent = block;
      bodyEl.appendChild(paragraph);
    });
  };

  const load = async () => {
    if (!noticeId) {
      setEmpty();
      return;
    }

    try {
      const notice = await fetchNoticeById(noticeId);

      if (!notice) {
        setEmpty();
        return;
      }

      const title = notice.title || "제목 없는 공지";
      const date = notice.notice_date
        ? dateFormatter.format(new Date(`${notice.notice_date}T00:00:00`))
        : "날짜 미정";

      loading.hidden = true;
      empty.hidden = true;
      article.hidden = false;

      if (pageTitle) {
        pageTitle.textContent = title;
      }

      document.title = `${title} | 공지사항`;
      heading.textContent = title;
      dateEl.textContent = date;
      savedEl.textContent = notice.updated_at
        ? `마지막 수정 ${timeFormatter.format(new Date(notice.updated_at))}`
        : "";
      renderBody(notice.body);
    } catch {
      setEmpty();
    }
  };

  load();
}
