import { subscribeAuthState } from "./supabase-auth.js?v=20260416-004";
import { createSessionNote, fetchSessionNoteList } from "./supabase-data.js?v=20260416-004";

const list = document.querySelector("[data-session-list]");

if (list) {
  const createButton = document.querySelector("[data-session-create]");
  const restoreButton = document.querySelector("[data-session-restore]");
  const createForm = document.querySelector("[data-session-create-form]");
  const dateInput = document.querySelector("[data-session-date-input]");
  const titleInput = document.querySelector("[data-session-title-input]");
  const cancelButton = document.querySelector("[data-session-cancel]");
  const status = document.querySelector("[data-session-status]");
  const empty = document.querySelector("[data-session-empty]");
  let isAdmin = false;
  let currentUserEmail = "";

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

  function getHiddenStorageKey() {
    const scope = currentUserEmail || "guest";
    return `math-seminar.hidden-sessions.v1:${scope}`;
  }

  function readHiddenSessionKeys() {
    try {
      const raw = window.localStorage.getItem(getHiddenStorageKey());
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function writeHiddenSessionKeys(keys) {
    window.localStorage.setItem(getHiddenStorageKey(), JSON.stringify(keys));
  }

  function hideSession(sessionKey) {
    const keys = new Set(readHiddenSessionKeys());
    keys.add(sessionKey);
    writeHiddenSessionKeys([...keys]);
  }

  function clearHiddenSessions() {
    window.localStorage.removeItem(getHiddenStorageKey());
  }

  function getTodayString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function openCreateForm() {
    if (!createForm || !dateInput) {
      return;
    }

    createForm.hidden = false;
    dateInput.value = dateInput.value || getTodayString();

    requestAnimationFrame(() => {
      dateInput.showPicker?.();
      dateInput.focus();
    });
  }

  function closeCreateForm() {
    if (!createForm) {
      return;
    }

    createForm.hidden = true;
    if (dateInput) {
      dateInput.value = "";
    }
    if (titleInput) {
      titleInput.value = "";
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
    const hiddenKeys = new Set(readHiddenSessionKeys());

    const sortedEntries = [...entries].sort((left, right) => {
      const leftTime = left?.session_date ? Date.parse(`${left.session_date}T00:00:00`) : 0;
      const rightTime = right?.session_date ? Date.parse(`${right.session_date}T00:00:00`) : 0;
      return rightTime - leftTime;
    });

    const visibleEntries = sortedEntries.filter((entry) => !hiddenKeys.has(entry.session_key));

    if (empty) {
      empty.hidden = visibleEntries.length > 0;
    }

    if (restoreButton) {
      restoreButton.hidden = !isAdmin || hiddenKeys.size === 0;
    }

    for (const entry of visibleEntries) {
      const item = document.createElement("li");
      const row = document.createElement("div");
      row.className = "session-list-row";

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

      row.appendChild(link);

      if (isAdmin) {
        const hideButton = document.createElement("button");
        hideButton.className = "session-button secondary session-hide-button";
        hideButton.type = "button";
        hideButton.textContent = "삭제";
        hideButton.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          hideSession(entry.session_key);
          renderSessionList(entries);
          setStatus("세션 카드를 현재 브라우저에서 숨겼습니다.");
        });

        row.appendChild(hideButton);
      }

      item.appendChild(row);
      list.appendChild(item);
    }
  }

  async function loadSessions() {
    try {
      const entries = await fetchSessionNoteList();
      renderSessionList(entries);
      setStatus(entries.length > 0 ? "날짜별 세션노트" : "");
    } catch (error) {
      setStatus(error?.message ?? "온라인 세션을 불러오지 못했습니다.");
      renderSessionList([]);
    }
  }

  async function handleCreateSession(event) {
    event?.preventDefault?.();

    const date = dateInput?.value?.trim();
    if (!date) {
      setStatus("세션 날짜를 선택하세요.");
      return;
    }

    const title = titleInput?.value?.trim() || "새 세션";
    const key = `session-${date}`;

    try {
      const entry = await createSessionNote(key, date, title);
      closeCreateForm();
      window.location.href = toSessionHref(entry);
    } catch (error) {
      window.alert(error?.message ?? "새 세션을 만들지 못했습니다.");
    }
  }

  createButton?.addEventListener("click", openCreateForm);
  cancelButton?.addEventListener("click", closeCreateForm);
  createForm?.addEventListener("submit", handleCreateSession);
  restoreButton?.addEventListener("click", () => {
    clearHiddenSessions();
    loadSessions();
    setStatus("숨긴 세션 카드를 다시 표시했습니다.");
  });

  subscribeAuthState((authState) => {
    isAdmin = authState.isAdmin;
    currentUserEmail = authState.user?.email?.toLowerCase?.() ?? "";
    if (createButton) {
      createButton.hidden = !isAdmin;
    }
    if (!isAdmin) {
      closeCreateForm();
    }
    loadSessions();
  });

  loadSessions();
}
