import { subscribeAuthState } from "./supabase-auth.js";
import { deleteNotice, fetchNotices, saveNotice } from "./supabase-data.js";

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

  const today = new Date().toISOString().slice(0, 10);
  const state = {
    notices: [],
    isAdmin: false,
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
      <span>${state.isAdmin ? "새 공지를 만들어 세션별 안내를 쌓아두세요." : "관리자가 등록한 공지가 여기에 표시됩니다."}</span>
    `;

    if (state.isAdmin) {
      empty.addEventListener("click", addNotice);
    }

    board.appendChild(empty);
  };

  const addNotice = () => {
    if (!state.isAdmin) {
      return;
    }

    state.notices.push({
      id: crypto.randomUUID(),
      date: today,
      title: "",
      body: "",
      savedAt: "",
    });
    sortNotices();
    render();
    setStatus("새 날짜별 공지를 만들었습니다.");

    requestAnimationFrame(() => {
      const firstInput = board.querySelector(".notice-card:first-child .notice-title");
      firstInput?.focus();
    });
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
    dateInput.readOnly = !state.isAdmin;
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
    titleInput.readOnly = !state.isAdmin;
    titleInput.addEventListener("input", (event) => {
      const currentIndex = Number(event.currentTarget.dataset.noticeIndex);
      state.notices[currentIndex].title = event.currentTarget.value;
      setStatus("저장되지 않은 변경사항이 있습니다.");
    });

    headFields.append(dateInput, titleInput);

    const actions = document.createElement("div");
    actions.className = "notice-card-actions";
    actions.dataset.adminOnly = "true";
    actions.hidden = !state.isAdmin;

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
    body.readOnly = !state.isAdmin;
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
      : state.isAdmin
        ? "아직 저장되지 않았습니다."
        : "게시 준비 중";

    card.append(head, body, meta);
    resizeTextarea(body);
    return card;
  };

  const render = () => {
    board.innerHTML = "";
    createButton.hidden = !state.isAdmin;

    if (state.notices.length === 0) {
      createEmptyState();
      return;
    }

    sortNotices();
    state.notices.forEach((notice, index) => {
      board.appendChild(createNoticeCard(notice, index));
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
