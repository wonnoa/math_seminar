import { subscribeAuthState } from "./supabase-auth.js?v=20260416-001";
import { deleteNotice, fetchNotices, saveNotice } from "./supabase-data.js?v=20260416-001";

const initNoticeBoard = () => {
  const board = document.querySelector("[data-notice-board]");

  if (!board) {
    return;
  }

  const createButton = document.querySelector("[data-notice-create]");
  const status = document.querySelector("[data-notice-status]");
  const formatter = new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const today = new Date().toISOString().slice(0, 10);
  const state = {
    notices: [],
    isAdmin: false,
    canManageNotices: false,
    openEditorId: "",
  };

  const setStatus = (message) => {
    if (status) {
      status.textContent = message;
    }
  };

  const resizeTextarea = (textarea) => {
    textarea.style.height = "0px";
    textarea.style.height = `${Math.max(textarea.scrollHeight, 180)}px`;
  };

  const normalizeNotice = (notice) => {
    if (!notice || typeof notice !== "object") {
      return {
        id: crypto.randomUUID(),
        date: today,
        title: "",
        body: "",
        savedAt: "",
      };
    }

    return {
      id: notice.id ?? crypto.randomUUID(),
      date: notice.notice_date ?? notice.date ?? today,
      title: notice.title ?? "",
      body: notice.body ?? "",
      savedAt: notice.saved_at ?? notice.savedAt ?? "",
    };
  };

  const sortNotices = () => {
    state.notices.sort((left, right) => {
      const dateCompare = right.date.localeCompare(left.date);
      if (dateCompare !== 0) {
        return dateCompare;
      }

      return right.id.localeCompare(left.id);
    });
  };

  const createEmptyState = () => {
    const empty = document.createElement("div");
    empty.className = "notice-empty";
    empty.innerHTML = `
      <strong>아직 날짜별 공지가 없습니다</strong>
      <span>${state.canManageNotices ? "새 공지를 만들어 세션별 안내를 쌓아두세요." : "관리자가 등록한 공지가 여기에 표시됩니다."}</span>
    `;

    if (state.canManageNotices) {
      empty.addEventListener("click", addNotice);
    }

    board.appendChild(empty);
  };

  const addNotice = () => {
    if (!state.canManageNotices) {
      return;
    }

    const id = crypto.randomUUID();

    state.notices.push({
      id,
      date: today,
      title: "",
      body: "",
      savedAt: "",
    });
    state.openEditorId = id;
    sortNotices();
    render();
    setStatus("새 날짜별 공지를 만들었습니다.");
  };

  const createNoticeCard = (notice, index) => {
    const card = document.createElement("article");
    card.className = "notice-card";
    card.dataset.noticeIndex = String(index);

    const head = document.createElement("div");
    head.className = "notice-card-head";

    const headFields = document.createElement("div");
    headFields.className = "notice-card-fields";

    const dateInput = document.createElement("input");
    dateInput.className = "notice-date";
    dateInput.type = "date";
    dateInput.value = notice.date;
    dateInput.dataset.noticeIndex = String(index);
    dateInput.readOnly = !state.canManageNotices;
    dateInput.addEventListener("input", (event) => {
      const currentIndex = Number(event.currentTarget.dataset.noticeIndex);
      state.notices[currentIndex].date = event.currentTarget.value || today;
      setStatus("저장되지 않은 변경사항이 있습니다.");
    });

    const titleInput = document.createElement("input");
    titleInput.className = "notice-title";
    titleInput.type = "text";
    titleInput.placeholder = "공지 제목";
    titleInput.value = notice.title;
    titleInput.dataset.noticeIndex = String(index);
    titleInput.readOnly = !state.canManageNotices;
    titleInput.addEventListener("input", (event) => {
      const currentIndex = Number(event.currentTarget.dataset.noticeIndex);
      state.notices[currentIndex].title = event.currentTarget.value;
      setStatus("저장되지 않은 변경사항이 있습니다.");
    });

    headFields.append(dateInput, titleInput);

    const actions = document.createElement("div");
    actions.className = "notice-card-actions";
    actions.hidden = !state.canManageNotices;

    const saveButton = document.createElement("button");
    saveButton.className = "session-button note-card-button";
    saveButton.type = "button";
    saveButton.textContent = "저장";
    saveButton.dataset.noticeIndex = String(index);
    saveButton.addEventListener("click", async (event) => {
      const currentIndex = Number(event.currentTarget.dataset.noticeIndex);
      const current = state.notices[currentIndex];
      try {
        await saveNotice(current);
        current.savedAt = new Date().toISOString();
        sortNotices();
        render();
        setStatus(`${formatter.format(new Date())}에 공지를 저장했습니다.`);
      } catch (error) {
        setStatus(error?.message ?? "공지를 저장하지 못했습니다.");
      }
    });

    const deleteButton = document.createElement("button");
    deleteButton.className = "session-button secondary note-card-button";
    deleteButton.type = "button";
    deleteButton.textContent = "삭제";
    deleteButton.dataset.noticeIndex = String(index);
    deleteButton.addEventListener("click", async (event) => {
      const currentIndex = Number(event.currentTarget.dataset.noticeIndex);
      const current = state.notices[currentIndex];
      if (state.openEditorId === current.id) {
        state.openEditorId = "";
      }
      state.notices.splice(currentIndex, 1);
      sortNotices();
      render();

      try {
        await deleteNotice(current.id);
        setStatus("공지를 삭제했습니다.");
      } catch (error) {
        setStatus(error?.message ?? "공지를 삭제하지 못했습니다.");
      }
    });

    actions.append(saveButton, deleteButton);
    head.append(headFields, actions);

    const body = document.createElement("textarea");
    body.className = "notice-body";
    body.placeholder = "공지 내용을 적으세요.";
    body.value = notice.body;
    body.dataset.noticeIndex = String(index);
    body.readOnly = !state.canManageNotices;
    body.addEventListener("input", (event) => {
      const currentIndex = Number(event.currentTarget.dataset.noticeIndex);
      state.notices[currentIndex].body = event.currentTarget.value;
      resizeTextarea(event.currentTarget);
      setStatus("저장되지 않은 변경사항이 있습니다.");
    });

    const meta = document.createElement("div");
    meta.className = "notice-card-meta";
    meta.textContent = notice.savedAt
      ? `마지막 저장 ${formatter.format(new Date(notice.savedAt))}`
      : state.canManageNotices
        ? "아직 저장되지 않았습니다."
        : "게시 준비 중";

    card.append(head, body, meta);
    resizeTextarea(body);
    return card;
  };

  const toNoticeHref = (notice) => {
    const params = new URLSearchParams({ id: notice.id });
    return `./notice-post.html?${params.toString()}`;
  };

  const createNoticeListItem = (notice, index) => {
    const card = document.createElement("article");
    card.className = "notice-list-card";
    card.dataset.noticeIndex = String(index);

    const link = document.createElement("a");
    link.className = "notice-list-link";
    link.href = toNoticeHref(notice);

    const meta = document.createElement("div");
    meta.className = "notice-list-meta";
    meta.textContent = dateFormatter.format(new Date(`${notice.date}T00:00:00`));

    const title = document.createElement("h3");
    title.className = "notice-list-title";
    title.textContent = notice.title || "제목 없는 공지";

    const excerpt = document.createElement("p");
    excerpt.className = "notice-list-excerpt";
    excerpt.textContent = (notice.body || "내용이 아직 없습니다.").replace(/\s+/g, " ").trim().slice(0, 120);

    const enter = document.createElement("span");
    enter.className = "inline-link";
    enter.textContent = "공지 보기";

    link.append(meta, title, excerpt, enter);
    card.appendChild(link);

    if (state.canManageNotices) {
      const isOpen = state.openEditorId === notice.id;
      const actions = document.createElement("div");
      actions.className = "notice-list-actions";

      const editButton = document.createElement("button");
      editButton.className = "session-button secondary note-card-button";
      editButton.type = "button";
      editButton.textContent = isOpen ? "수정 닫기" : "펼쳐서 수정";

      actions.appendChild(editButton);
      card.appendChild(actions);

      const editor = createNoticeCard(notice, index);
      editor.classList.add("notice-inline-editor");
      editor.hidden = !isOpen;
      card.appendChild(editor);

      editButton.addEventListener("click", () => {
        state.openEditorId = state.openEditorId === notice.id ? "" : notice.id;
        render();
      });
    }

    return card;
  };

  const render = () => {
    board.innerHTML = "";
    createButton.hidden = !state.canManageNotices;

    if (state.notices.length === 0) {
      createEmptyState();
      return;
    }

    sortNotices();
    state.notices.forEach((notice, index) => {
      board.appendChild(createNoticeListItem(notice, index));
    });
  };

  const restore = async () => {
    try {
      const remoteNotices = await fetchNotices();
      state.notices = remoteNotices.map(normalizeNotice);
      sortNotices();
      render();

      if (state.notices.length === 0) {
        setStatus("아직 등록된 날짜별 공지가 없습니다.");
      } else {
        setStatus("저장된 날짜별 공지를 불러왔습니다.");
      }
    } catch (error) {
      render();
      setStatus(error?.message ?? "날짜별 공지를 불러오지 못했습니다.");
    }
  };

  createButton?.addEventListener("click", addNotice);

  subscribeAuthState((authState) => {
    state.isAdmin = authState.isAdmin;
    state.canManageNotices = authState.isAdmin || authState.canManageNotices;
    render();
  });

  render();
  restore();
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initNoticeBoard);
} else {
  initNoticeBoard();
}
