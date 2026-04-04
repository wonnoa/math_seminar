import { subscribeAuthState } from "./supabase-auth.js";
import { fetchSessionNotes, saveSessionNotes } from "./supabase-data.js";

const initSessionNotes = () => {
  const board = document.querySelector("[data-note-board]");

  if (!board) {
    return;
  }

  const sessionKey = board.dataset.sessionKey;
  const sessionTitle = board.dataset.sessionTitle;
  const createButton = document.querySelector("[data-note-create]");
  const status = document.querySelector("[data-note-status]");
  const formatter = new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const state = {
    notes: [],
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

  const readFileAsDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("file-read-failed"));
      reader.readAsDataURL(file);
    });

  const loadImage = (src) =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("image-load-failed"));
      image.src = src;
    });

  const compressImage = async (file) => {
    const sourceUrl = await readFileAsDataUrl(file);
    const image = await loadImage(sourceUrl);
    const maxDimension = 1400;
    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");

    if (!context) {
      return sourceUrl;
    }

    context.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", 0.82);
  };

  const normalizeBlock = (block) => {
    if (!block || typeof block !== "object") {
      return { type: "text", text: "", image: "" };
    }

    return {
      type: block.type === "media" ? "media" : "text",
      text: block.text ?? block.content ?? "",
      image: block.image ?? "",
    };
  };

  const normalizeNote = (note) => {
    if (typeof note === "string") {
      return {
        title: "",
        blocks: [{ type: "text", text: note, image: "" }],
      };
    }

    if (!note || typeof note !== "object") {
      return {
        title: "",
        blocks: [],
      };
    }

    if (Array.isArray(note.blocks)) {
      return {
        title: note.title ?? "",
        blocks: note.blocks.map(normalizeBlock),
      };
    }

    if (note.image || note.content) {
      return {
        title: note.title ?? "",
        blocks: [
          note.image
            ? { type: "media", text: note.content ?? "", image: note.image ?? "" }
            : { type: "text", text: note.content ?? "", image: "" },
        ],
      };
    }

    return {
      title: note.title ?? "",
      blocks: [],
    };
  };

  const createEmptyState = () => {
    const empty = document.createElement("div");
    empty.className = "note-empty";
    empty.innerHTML = `
      <strong>아직 노트가 없습니다</strong>
      <span>${state.isAdmin ? "노트를 만들어 기록을 시작하세요." : "관리자가 세션 노트를 작성하면 여기에 표시됩니다."}</span>
    `;

    if (state.isAdmin) {
      empty.addEventListener("click", addNote);
    }

    board.appendChild(empty);
  };

  const addNote = () => {
    if (!state.isAdmin) {
      return;
    }

    state.notes.push({
      title: "",
      blocks: [],
    });
    render();
    setStatus("새 노트를 만들었습니다.");

    requestAnimationFrame(() => {
      const lastTitle = board.querySelector(".note-card:last-child .note-title");
      lastTitle?.focus();
    });
  };

  const addBlockToNote = (noteIndex, type) => {
    if (!state.isAdmin) {
      return;
    }

    const note = state.notes[noteIndex];

    if (!note) {
      return;
    }

    note.blocks.push({
      type,
      text: "",
      image: "",
    });
    render();
    setStatus(type === "media" ? "사진 블록을 추가했습니다." : "텍스트 블록을 추가했습니다.");

    requestAnimationFrame(() => {
      const textarea = board.querySelector(
        `.note-card[data-note-index="${noteIndex}"] .note-block:last-child .note-block-textarea`
      );
      textarea?.focus();
    });
  };

  const persistAllNotes = async (message) => {
    try {
      await saveSessionNotes(sessionKey, sessionTitle || document.title, state.notes);
      setStatus(message ?? `${formatter.format(new Date())}에 브라우저가 아닌 온라인 저장소에 저장했습니다.`);
    } catch (error) {
      setStatus(error?.message ?? "세션 노트를 저장하지 못했습니다.");
    }
  };

  const createTextBlock = (block, noteIndex, blockIndex) => {
    const wrapper = document.createElement("div");
    wrapper.className = "note-block note-block-text";

    const textarea = document.createElement("textarea");
    textarea.className = "note-textarea note-block-textarea";
    textarea.placeholder = "여기에 적으세요.";
    textarea.value = block.text ?? "";
    textarea.readOnly = !state.isAdmin;
    textarea.dataset.noteIndex = String(noteIndex);
    textarea.dataset.blockIndex = String(blockIndex);

    textarea.addEventListener("input", (event) => {
      const currentNoteIndex = Number(event.currentTarget.dataset.noteIndex);
      const currentBlockIndex = Number(event.currentTarget.dataset.blockIndex);
      state.notes[currentNoteIndex].blocks[currentBlockIndex].text = event.currentTarget.value;
      resizeTextarea(event.currentTarget);
      setStatus("저장되지 않은 변경사항이 있습니다.");
    });

    wrapper.appendChild(textarea);
    return { wrapper, textarea };
  };

  const createMediaBlock = (block, noteIndex, blockIndex) => {
    const wrapper = document.createElement("div");
    wrapper.className = "note-block note-block-media";

    const mediaPane = document.createElement("div");
    mediaPane.className = "note-media-pane";

    if (block.image) {
      const preview = document.createElement("div");
      preview.className = "note-image-preview";

      const image = document.createElement("img");
      image.className = "note-image";
      image.src = block.image;
      image.alt = "첨부한 노트 이미지";

      preview.appendChild(image);
      mediaPane.appendChild(preview);
    } else {
      const empty = document.createElement("div");
      empty.className = "note-image-empty";
      empty.innerHTML = `
        <strong>아직 사진이 없습니다</strong>
        <span>${state.isAdmin ? "이 블록에 사진을 추가하세요." : "등록된 사진이 없습니다."}</span>
      `;
      mediaPane.appendChild(empty);
    }

    const mediaActions = document.createElement("div");
    mediaActions.className = "note-media-actions";
    mediaActions.dataset.adminOnly = "true";
    mediaActions.hidden = !state.isAdmin;

    const uploadButton = document.createElement("button");
    uploadButton.className = "session-button secondary note-card-button note-upload-label";
    uploadButton.type = "button";
    uploadButton.textContent = block.image ? "사진 바꾸기" : "사진 추가";

    const uploadInput = document.createElement("input");
    uploadInput.className = "note-image-input";
    uploadInput.type = "file";
    uploadInput.accept = "image/*";
    uploadInput.dataset.noteIndex = String(noteIndex);
    uploadInput.dataset.blockIndex = String(blockIndex);

    uploadButton.addEventListener("click", () => {
      uploadInput.click();
    });

    uploadInput.addEventListener("change", async (event) => {
      const currentNoteIndex = Number(event.currentTarget.dataset.noteIndex);
      const currentBlockIndex = Number(event.currentTarget.dataset.blockIndex);
      const file = event.currentTarget.files?.[0];

      if (!file) {
        return;
      }

      setStatus("사진을 준비하는 중입니다.");

      try {
        const imageData = await compressImage(file);
        state.notes[currentNoteIndex].blocks[currentBlockIndex].image = imageData;
        render();
        setStatus("저장되지 않은 변경사항이 있습니다.");
      } catch {
        setStatus("사진을 추가하지 못했습니다.");
      }
    });

    if (block.image) {
      const overlay = document.createElement("div");
      overlay.className = "note-media-overlay";
      overlay.dataset.adminOnly = "true";
      overlay.hidden = !state.isAdmin;

      overlay.appendChild(uploadButton);

      const removeButton = document.createElement("button");
      removeButton.className = "session-button secondary note-card-button note-image-remove";
      removeButton.type = "button";
      removeButton.textContent = "사진 제거";
      removeButton.dataset.noteIndex = String(noteIndex);
      removeButton.dataset.blockIndex = String(blockIndex);
      removeButton.addEventListener("click", (event) => {
        const currentNoteIndex = Number(event.currentTarget.dataset.noteIndex);
        const currentBlockIndex = Number(event.currentTarget.dataset.blockIndex);
        state.notes[currentNoteIndex].blocks[currentBlockIndex].image = "";
        render();
        setStatus("저장되지 않은 변경사항이 있습니다.");
      });

      overlay.appendChild(removeButton);
      overlay.appendChild(uploadInput);

      const preview = mediaPane.querySelector(".note-image-preview");
      preview?.appendChild(overlay);
    } else {
      mediaActions.append(uploadButton, uploadInput);
      mediaPane.appendChild(mediaActions);
    }

    const textPane = document.createElement("div");
    textPane.className = "note-editor-pane";

    const textarea = document.createElement("textarea");
    textarea.className = "note-textarea note-block-textarea";
    textarea.placeholder = "사진 옆에 메모를 적으세요.";
    textarea.value = block.text ?? "";
    textarea.readOnly = !state.isAdmin;
    textarea.dataset.noteIndex = String(noteIndex);
    textarea.dataset.blockIndex = String(blockIndex);

    textarea.addEventListener("input", (event) => {
      const currentNoteIndex = Number(event.currentTarget.dataset.noteIndex);
      const currentBlockIndex = Number(event.currentTarget.dataset.blockIndex);
      state.notes[currentNoteIndex].blocks[currentBlockIndex].text = event.currentTarget.value;
      resizeTextarea(event.currentTarget);
      setStatus("저장되지 않은 변경사항이 있습니다.");
    });

    textPane.appendChild(textarea);
    wrapper.append(mediaPane, textPane);

    return { wrapper, textarea };
  };

  const createNoteCard = (note, noteIndex) => {
    const card = document.createElement("article");
    card.className = "note-card";
    card.dataset.noteIndex = String(noteIndex);

    const head = document.createElement("div");
    head.className = "note-card-head";

    const title = document.createElement("input");
    title.className = "note-title";
    title.type = "text";
    title.placeholder = "제목 없는 노트";
    title.value = note.title ?? "";
    title.dataset.noteIndex = String(noteIndex);
    title.readOnly = !state.isAdmin;

    title.addEventListener("input", (event) => {
      const currentNoteIndex = Number(event.currentTarget.dataset.noteIndex);
      state.notes[currentNoteIndex].title = event.currentTarget.value;
      setStatus("저장되지 않은 변경사항이 있습니다.");
    });

    const headActions = document.createElement("div");
    headActions.className = "note-card-actions";
    headActions.dataset.adminOnly = "true";
    headActions.hidden = !state.isAdmin;

    const saveButton = document.createElement("button");
    saveButton.className = "session-button note-card-button";
    saveButton.type = "button";
    saveButton.textContent = "저장";
    saveButton.dataset.noteIndex = String(noteIndex);
    saveButton.addEventListener("click", async (event) => {
      const currentNoteIndex = Number(event.currentTarget.dataset.noteIndex);
      await persistAllNotes(`노트 ${currentNoteIndex + 1}번을 ${formatter.format(new Date())}에 저장했습니다.`);
    });

    const deleteButton = document.createElement("button");
    deleteButton.className = "session-button secondary note-card-button note-card-delete";
    deleteButton.type = "button";
    deleteButton.textContent = "삭제";
    deleteButton.dataset.noteIndex = String(noteIndex);
    deleteButton.addEventListener("click", async (event) => {
      const currentNoteIndex = Number(event.currentTarget.dataset.noteIndex);
      state.notes.splice(currentNoteIndex, 1);
      render();
      await persistAllNotes(state.notes.length === 0 ? "노트를 비웠습니다." : "노트를 삭제했습니다.");
    });

    headActions.append(saveButton, deleteButton);
    head.append(title, headActions);
    card.appendChild(head);

    const toolbar = document.createElement("div");
    toolbar.className = "note-card-toolbar";
    toolbar.dataset.adminOnly = "true";
    toolbar.hidden = !state.isAdmin;

    const addBoxButton = document.createElement("button");
    addBoxButton.className = "session-button secondary note-card-button";
    addBoxButton.type = "button";
    addBoxButton.textContent = "텍스트 박스";
    addBoxButton.dataset.noteIndex = String(noteIndex);
    addBoxButton.addEventListener("click", (event) => {
      addBlockToNote(Number(event.currentTarget.dataset.noteIndex), "text");
    });

    const addPhotoButton = document.createElement("button");
    addPhotoButton.className = "session-button secondary note-card-button";
    addPhotoButton.type = "button";
    addPhotoButton.textContent = "사진 박스";
    addPhotoButton.dataset.noteIndex = String(noteIndex);
    addPhotoButton.addEventListener("click", (event) => {
      addBlockToNote(Number(event.currentTarget.dataset.noteIndex), "media");
    });

    toolbar.append(addBoxButton, addPhotoButton);
    card.appendChild(toolbar);

    const body = document.createElement("div");
    body.className = "note-card-body";

    if (note.blocks.length === 0) {
      const empty = document.createElement("div");
      empty.className = "note-block-empty";
      empty.innerHTML = `
        <strong>아직 블록이 없습니다</strong>
        <span>${state.isAdmin ? "텍스트 박스나 사진 박스를 추가해 기록을 채워보세요." : "관리자가 내용을 추가하면 여기에 표시됩니다."}</span>
      `;
      body.appendChild(empty);
    } else {
      note.blocks.forEach((block, blockIndex) => {
        const entry =
          block.type === "media"
            ? createMediaBlock(block, noteIndex, blockIndex)
            : createTextBlock(block, noteIndex, blockIndex);

        body.appendChild(entry.wrapper);
        resizeTextarea(entry.textarea);
      });
    }

    card.appendChild(body);
    return card;
  };

  const render = () => {
    board.innerHTML = "";
    createButton.hidden = !state.isAdmin;

    if (state.notes.length === 0) {
      createEmptyState();
      return;
    }

    state.notes.forEach((note, noteIndex) => {
      board.appendChild(createNoteCard(note, noteIndex));
    });
  };

  const restore = async () => {
    if (!sessionKey) {
      render();
      return;
    }

    try {
      const payload = await fetchSessionNotes(sessionKey);
      state.notes = Array.isArray(payload?.notes) ? payload.notes.map(normalizeNote) : [];
      render();

      if (payload?.updated_at) {
        setStatus(`${formatter.format(new Date(payload.updated_at))}에 저장된 노트를 불러왔습니다.`);
      } else {
        setStatus("아직 저장된 내용이 없습니다.");
      }
    } catch (error) {
      render();
      setStatus(error?.message ?? "저장된 노트를 불러오지 못했습니다.");
    }
  };

  createButton?.addEventListener("click", addNote);

  subscribeAuthState((authState) => {
    state.isAdmin = authState.isAdmin;
    render();
  });

  render();
  restore();
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSessionNotes);
} else {
  initSessionNotes();
}
