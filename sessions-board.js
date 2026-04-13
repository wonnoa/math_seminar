import { subscribeAuthState } from "./supabase-auth.js?v=20260414-001";
import { createSessionNote, fetchSessionNoteList } from "./supabase-data.js?v=20260414-001";

const list = document.querySelector("[data-session-list]");

if (list) {
  const createButton = document.querySelector("[data-session-create]");
  const status = document.querySelector("[data-session-status]");
  const empty = document.querySelector("[data-session-empty]");
  let isAdmin = false;

  const formatter = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  function setStatus(message) {
    if (status) {
      status.textContent = message;
    }
  }

  function formatDate(dateString) {
    if (!dateString) {
      return "날짜 미정";
    }

    const date = new Date(`${dateString}T00:00:00`);
    return formatter.format(date).replaceAll(". ", ". ").replace(/\.$/, "");
  }

  function toSessionHref(entry) {
    const params = new URLSearchParams({
      key: entry.session_key,
      date: entry.session_date,
      title: entry.title || "세션 기록",
    });

    return `./session.html?${params.toString()}`;
  }

  function renderSessionList(entries) {
    list.innerHTML = "";

    if (empty) {
      empty.hidden = entries.length > 0;
    }

    for (const entry of entries) {
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.className = "session-link";
      link.href = toSessionHref(entry);

      const date = document.createElement("span");
      date.className = "session-date";
      date.textContent = formatDate(entry.session_date);

      const title = document.createElement("h3");
      title.textContent = entry.title || "제목 없는 세션";

      const action = document.createElement("span");
      action.className = "inline-link";
      action.textContent = isAdmin ? "세션 열기" : "읽기";

      link.append(date, title, action);
      item.appendChild(link);
      list.appendChild(item);
    }
  }

  async function loadSessions() {
    try {
      const entries = await fetchSessionNoteList();
      renderSessionList(entries);
      setStatus(entries.length > 0 ? "온라인 세션을 불러왔습니다." : "");
    } catch (error) {
      setStatus(error?.message ?? "온라인 세션을 불러오지 못했습니다.");
      renderSessionList([]);
    }
  }

  async function handleCreateSession() {
    const date = window.prompt("세션 날짜를 입력하세요. 예: 2026-04-04");
    if (!date) {
      return;
    }

    const title = window.prompt("세션 제목을 입력하세요.", "새 세션") || "새 세션";
    const key = `session-${date}`;

    try {
      const entry = await createSessionNote(key, date, title);
      window.location.href = toSessionHref(entry);
    } catch (error) {
      window.alert(error?.message ?? "새 세션을 만들지 못했습니다.");
    }
  }

  createButton?.addEventListener("click", handleCreateSession);

  subscribeAuthState((authState) => {
    isAdmin = authState.isAdmin;
    if (createButton) {
      createButton.hidden = !isAdmin;
    }
    loadSessions();
  });

  loadSessions();
}
