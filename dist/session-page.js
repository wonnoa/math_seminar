const board = document.querySelector("[data-note-board]");
const pageTitle = document.querySelector("[data-session-page-title]");

const params = new URLSearchParams(window.location.search);
const key = params.get("key") || "";
const date = params.get("date") || "";
const title = params.get("title") || "";

function formatDate(input) {
  if (!input) {
    return "새 세션";
  }

  const parts = input.split("-");
  if (parts.length !== 3) {
    return input;
  }

  return `${parts[0]}년 ${parts[1]}월 ${parts[2]}일`;
}

if (board && key) {
  board.dataset.sessionKey = key;
  board.dataset.sessionTitle = title;
  board.dataset.sessionDate = date;
}

if (pageTitle) {
  pageTitle.textContent = title ? `${formatDate(date)} · ${title}` : `${formatDate(date)} 세션`;
}

document.title = title ? `${formatDate(date)} 세션 | ${title}` : `${formatDate(date)} 세션 | 선형대수 스터디 여정`;
