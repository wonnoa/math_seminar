import { subscribeAuthState } from "./supabase-auth.js?v=20260405-0315";
import {
  createSessionBlockComment,
  deleteSessionBlockComment,
  deleteSessionBlockCommentsByBlockIds,
  fetchSessionBlockComments,
  fetchSessionNotes,
  saveSessionNotes,
  updateSessionBlockComment,
} from "./supabase-data.js?v=20260405-0725";

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
    blockComments: {},
    commentDrafts: {},
    replyDrafts: {},
    commentEditDrafts: {},
    openReplyForms: {},
    openEditForms: {},
    isAdmin: false,
    canComment: false,
    userEmail: "",
  };

  const createId = () =>
    window.crypto?.randomUUID?.() ??
    `note-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const setStatus = (message) => {
    if (status) {
      status.textContent = message;
    }
  };

  const resizeTextarea = (textarea, minHeight = 180) => {
    textarea.style.height = "0px";
    textarea.style.height = `${Math.max(textarea.scrollHeight, minHeight)}px`;
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
      return { id: createId(), type: "text", text: "", image: "" };
    }

    return {
      id: block.id ?? createId(),
      type: block.type === "media" ? "media" : "text",
      text: block.text ?? block.content ?? "",
      image: block.image ?? "",
    };
  };

  const normalizeNote = (note) => {
    if (typeof note === "string") {
      return {
        title: "",
        blocks: [{ id: createId(), type: "text", text: note, image: "" }],
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
            ? { id: createId(), type: "media", text: note.content ?? "", image: note.image ?? "" }
            : { id: createId(), type: "text", text: note.content ?? "", image: "" },
        ],
      };
    }

    return {
      title: note.title ?? "",
      blocks: [],
    };
  };

  const groupCommentsByBlock = (comments) => {
    const grouped = {};

    for (const comment of comments) {
      if (!grouped[comment.block_id]) {
        grouped[comment.block_id] = [];
      }

      grouped[comment.block_id].push(comment);
    }

    return grouped;
  };

  const buildCommentTree = (comments) => {
    const byId = new Map(
      comments.map((comment) => [
        comment.id,
        {
          ...comment,
          children: [],
        },
      ]),
    );

    const roots = [];

    for (const comment of comments) {
      const node = byId.get(comment.id);

      if (comment.parent_id && byId.has(comment.parent_id)) {
        byId.get(comment.parent_id).children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  };

  const refreshBlockComments = async () => {
    try {
      const comments = await fetchSessionBlockComments(sessionKey);
      state.blockComments = groupCommentsByBlock(comments);
    } catch {
      state.blockComments = {};
    }
  };

  const getCommentsForBlock = (blockId) => state.blockComments[blockId] ?? [];

  const formatAuthor = (email) => {
    if (!email) {
      return "관리자";
    }

    return email.split("@")[0] || email;
  };

  const isOwnComment = (comment) =>
    Boolean(state.userEmail) && comment.author_email?.toLowerCase() === state.userEmail;

  const canEditComment = (comment) => state.isAdmin || (canWriteComments() && isOwnComment(comment));

  const canDeleteComment = (comment) => state.isAdmin || (canWriteComments() && isOwnComment(comment));

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

  const persistAllNotes = async (message) => {
    try {
      await saveSessionNotes(sessionKey, sessionTitle || document.title, state.notes);
      setStatus(message ?? `${formatter.format(new Date())}에 온라인 저장소에 저장했습니다.`);
    } catch (error) {
      setStatus(error?.message ?? "세션 노트를 저장하지 못했습니다.");
    }
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

  const canWriteComments = () => state.isAdmin || state.canComment;

  const addBlockToNote = (noteIndex, type) => {
    if (!state.isAdmin) {
      return;
    }

    const note = state.notes[noteIndex];

    if (!note) {
      return;
    }

    note.blocks.push({
      id: createId(),
      type,
      text: "",
      image: "",
    });
    render();
    setStatus(type === "media" ? "사진 박스를 추가했습니다." : "텍스트 박스를 추가했습니다.");

    requestAnimationFrame(() => {
      const textarea = board.querySelector(
        `.note-card[data-note-index="${noteIndex}"] .note-block:last-child .note-block-textarea`
      );
      textarea?.focus();
    });
  };

  const deleteBlock = async (noteIndex, blockIndex) => {
    if (!state.isAdmin) {
      return;
    }

    const note = state.notes[noteIndex];
    const block = note?.blocks?.[blockIndex];

    if (!note || !block) {
      return;
    }

    note.blocks.splice(blockIndex, 1);
    delete state.blockComments[block.id];
    delete state.commentDrafts[block.id];
    state.replyDrafts = {};
    state.openReplyForms = {};
    state.commentEditDrafts = {};
    state.openEditForms = {};

    render();

    try {
      await deleteSessionBlockCommentsByBlockIds(sessionKey, [block.id]);
    } catch (error) {
      setStatus(error?.message ?? "블록 댓글을 삭제하지 못했습니다.");
    }

    await persistAllNotes("박스를 삭제했습니다.");
  };

  const submitComment = async ({ blockId, body, parentId = null }) => {
    if (!canWriteComments()) {
      return;
    }

    const content = body.trim();

    if (!content) {
      setStatus("댓글 내용을 입력하세요.");
      return;
    }

    try {
      await createSessionBlockComment(sessionKey, blockId, content, parentId);

      if (parentId) {
        delete state.replyDrafts[parentId];
        delete state.openReplyForms[parentId];
      } else {
        state.commentDrafts[blockId] = "";
      }

      await refreshBlockComments();
      render();
      setStatus(parentId ? "대댓글을 올렸습니다." : "댓글을 올렸습니다.");
    } catch (error) {
      setStatus(error?.message ?? "댓글을 저장하지 못했습니다.");
    }
  };

  const removeComment = async (commentId) => {
    if (!canWriteComments()) {
      return;
    }

    try {
      await deleteSessionBlockComment(commentId);
      delete state.commentEditDrafts[commentId];
      delete state.openEditForms[commentId];
      delete state.replyDrafts[commentId];
      delete state.openReplyForms[commentId];
      await refreshBlockComments();
      render();
      setStatus("댓글을 삭제했습니다.");
    } catch (error) {
      setStatus(error?.message ?? "댓글을 삭제하지 못했습니다.");
    }
  };

  const editComment = async (comment) => {
    if (!canEditComment(comment)) {
      return;
    }

    const content = (state.commentEditDrafts[comment.id] ?? "").trim();

    if (!content) {
      setStatus("댓글 내용을 입력하세요.");
      return;
    }

    try {
      await updateSessionBlockComment(comment.id, content);
      delete state.commentEditDrafts[comment.id];
      delete state.openEditForms[comment.id];
      await refreshBlockComments();
      render();
      setStatus("댓글을 수정했습니다.");
    } catch (error) {
      setStatus(error?.message ?? "댓글을 수정하지 못했습니다.");
    }
  };

  const createCommentComposer = ({
    className,
    value,
    placeholder,
    submitLabel,
    onInput,
    onSubmit,
    minHeight = 68,
  }) => {
    const wrapper = document.createElement("div");
    wrapper.className = className;

    const textarea = document.createElement("textarea");
    textarea.className = "note-comment-textarea";
    textarea.placeholder = placeholder;
    textarea.value = value;
    textarea.readOnly = !canWriteComments();

    textarea.addEventListener("input", (event) => {
      onInput(event.currentTarget.value);
      resizeTextarea(event.currentTarget, minHeight);
    });

    const actions = document.createElement("div");
    actions.className = "note-comment-composer-actions";
    actions.hidden = !canWriteComments();

    const submitButton = document.createElement("button");
    submitButton.className = "session-button note-card-button";
    submitButton.type = "button";
    submitButton.textContent = submitLabel;
    submitButton.addEventListener("click", async () => {
      await onSubmit();
    });

    actions.appendChild(submitButton);
    wrapper.append(textarea, actions);

    requestAnimationFrame(() => resizeTextarea(textarea, minHeight));

    return wrapper;
  };

  const createCommentCard = (comment, depth = 0) => {
    const card = document.createElement("article");
    card.className = "note-comment-card";
    card.style.setProperty("--comment-depth", String(depth));

    const meta = document.createElement("div");
    meta.className = "note-comment-meta";

    const author = document.createElement("strong");
    author.className = "note-comment-author";
    author.textContent = formatAuthor(comment.author_email);

    const time = document.createElement("span");
    time.className = "note-comment-time";
    time.textContent = formatter.format(new Date(comment.updated_at || comment.created_at));

    meta.append(author, time);

    const body = document.createElement("div");
    body.className = "note-comment-body";
    body.textContent = comment.body;

    const actions = document.createElement("div");
    actions.className = "note-comment-actions";
    actions.hidden = !(canWriteComments() || canEditComment(comment) || canDeleteComment(comment));

    const replyButton = document.createElement("button");
    replyButton.className = "session-button secondary note-card-button";
    replyButton.type = "button";
    replyButton.textContent = state.openReplyForms[comment.id] ? "답글 닫기" : "답글";
    replyButton.addEventListener("click", () => {
      delete state.openEditForms[comment.id];
      state.openReplyForms[comment.id] = !state.openReplyForms[comment.id];
      render();
    });

    const editButton = document.createElement("button");
    editButton.className = "session-button secondary note-card-button";
    editButton.type = "button";
    editButton.textContent = state.openEditForms[comment.id] ? "수정 닫기" : "수정";
    editButton.addEventListener("click", () => {
      delete state.openReplyForms[comment.id];
      state.commentEditDrafts[comment.id] = state.commentEditDrafts[comment.id] ?? comment.body;
      state.openEditForms[comment.id] = !state.openEditForms[comment.id];

      if (!state.openEditForms[comment.id]) {
        delete state.commentEditDrafts[comment.id];
      }

      render();
    });

    const deleteButton = document.createElement("button");
    deleteButton.className = "session-button secondary note-card-button note-block-delete";
    deleteButton.type = "button";
    deleteButton.textContent = "댓글 삭제";
    deleteButton.addEventListener("click", async () => {
      if (!state.isAdmin && comment.children.length > 0) {
        setStatus("답글이 달린 댓글은 삭제할 수 없습니다.");
        return;
      }
      await removeComment(comment.id);
    });

    if (canWriteComments()) {
      actions.appendChild(replyButton);
    }

    if (canEditComment(comment)) {
      actions.appendChild(editButton);
    }

    if (canDeleteComment(comment)) {
      actions.appendChild(deleteButton);
    }

    card.append(meta, body, actions);

    if (canEditComment(comment) && state.openEditForms[comment.id]) {
      const editComposer = document.createElement("div");
      editComposer.className = "note-comment-reply-composer";

      const textarea = document.createElement("textarea");
      textarea.className = "note-comment-textarea";
      textarea.value = state.commentEditDrafts[comment.id] ?? comment.body;
      textarea.placeholder = "댓글을 수정하세요.";
      textarea.addEventListener("input", (event) => {
        state.commentEditDrafts[comment.id] = event.currentTarget.value;
        resizeTextarea(event.currentTarget, 60);
      });

      const editActions = document.createElement("div");
      editActions.className = "note-comment-composer-actions";

      const saveEditButton = document.createElement("button");
      saveEditButton.className = "session-button note-card-button";
      saveEditButton.type = "button";
      saveEditButton.textContent = "수정 저장";
      saveEditButton.addEventListener("click", async () => {
        await editComment(comment);
      });

      const cancelEditButton = document.createElement("button");
      cancelEditButton.className = "session-button secondary note-card-button";
      cancelEditButton.type = "button";
      cancelEditButton.textContent = "취소";
      cancelEditButton.addEventListener("click", () => {
        delete state.commentEditDrafts[comment.id];
        delete state.openEditForms[comment.id];
        render();
      });

      editActions.append(saveEditButton, cancelEditButton);
      editComposer.append(textarea, editActions);
      card.appendChild(editComposer);

      requestAnimationFrame(() => resizeTextarea(textarea, 60));
    }

    if (canWriteComments() && state.openReplyForms[comment.id]) {
      const replyComposer = createCommentComposer({
        className: "note-comment-reply-composer",
        value: state.replyDrafts[comment.id] ?? "",
        placeholder: "대댓글을 입력하세요.",
        submitLabel: "대댓글 올리기",
        onInput: (value) => {
          state.replyDrafts[comment.id] = value;
        },
        onSubmit: async () => {
          await submitComment({
            blockId: comment.block_id,
            body: state.replyDrafts[comment.id] ?? "",
            parentId: comment.id,
          });
        },
        minHeight: 60,
      });

      card.appendChild(replyComposer);
    }

    if (comment.children.length > 0) {
      const children = document.createElement("div");
      children.className = "note-comment-children";
      comment.children.forEach((child) => {
        children.appendChild(createCommentCard(child, depth + 1));
      });
      card.appendChild(children);
    }

    return card;
  };

  const createTextBlock = (block, noteIndex, blockIndex) => {
    const wrapper = document.createElement("div");
    wrapper.className = "note-block note-block-text";

    const actions = document.createElement("div");
    actions.className = "note-block-actions";
    actions.dataset.adminOnly = "true";
    actions.hidden = !state.isAdmin;

    const deleteButton = document.createElement("button");
    deleteButton.className = "session-button secondary note-card-button note-block-delete";
    deleteButton.type = "button";
    deleteButton.textContent = "박스 삭제";
    deleteButton.addEventListener("click", async () => {
      await deleteBlock(noteIndex, blockIndex);
    });

    actions.appendChild(deleteButton);

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

    wrapper.append(actions, textarea);
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

      overlay.append(removeButton, uploadInput);
      mediaPane.querySelector(".note-image-preview")?.appendChild(overlay);
    } else {
      mediaActions.append(uploadButton, uploadInput);
      mediaPane.appendChild(mediaActions);
    }

    const commentPane = document.createElement("div");
    commentPane.className = "note-editor-pane";

    const blockActions = document.createElement("div");
    blockActions.className = "note-block-actions";
    blockActions.dataset.adminOnly = "true";
    blockActions.hidden = !state.isAdmin;

    const deleteButton = document.createElement("button");
    deleteButton.className = "session-button secondary note-card-button note-block-delete";
    deleteButton.type = "button";
    deleteButton.textContent = "박스 삭제";
    deleteButton.addEventListener("click", async () => {
      await deleteBlock(noteIndex, blockIndex);
    });

    blockActions.appendChild(deleteButton);
    commentPane.appendChild(blockActions);

    const thread = document.createElement("div");
    thread.className = "note-comment-thread";

    const blockComments = getCommentsForBlock(block.id);
    const commentTree = buildCommentTree(blockComments);
    const hasLegacyMemo = !blockComments.length && Boolean(block.text?.trim());

    if (hasLegacyMemo) {
      const legacy = document.createElement("article");
      legacy.className = "note-comment-card note-comment-legacy";

      const meta = document.createElement("div");
      meta.className = "note-comment-meta";

      const author = document.createElement("strong");
      author.className = "note-comment-author";
      author.textContent = "기존 메모";

      meta.appendChild(author);

      const body = document.createElement("div");
      body.className = "note-comment-body";
      body.textContent = block.text;

      legacy.append(meta, body);
      thread.appendChild(legacy);
    }

    if (commentTree.length === 0 && !hasLegacyMemo) {
      const empty = document.createElement("div");
      empty.className = "note-comment-empty";
      empty.innerHTML = `
        <strong>아직 댓글이 없습니다</strong>
        <span>${state.isAdmin ? "이 블록에 첫 댓글을 남겨보세요." : "새로고침하면 새 댓글을 볼 수 있습니다."}</span>
      `;
      thread.appendChild(empty);
    } else {
      commentTree.forEach((comment) => {
        thread.appendChild(createCommentCard(comment));
      });
    }

    commentPane.appendChild(thread);

    if (state.isAdmin) {
      const composer = createCommentComposer({
        className: "note-comment-composer",
        value: state.commentDrafts[block.id] ?? "",
        placeholder: "이 사진 블록에 댓글을 남기세요.",
        submitLabel: "댓글 올리기",
        onInput: (value) => {
          state.commentDrafts[block.id] = value;
        },
        onSubmit: async () => {
          await submitComment({
            blockId: block.id,
            body: state.commentDrafts[block.id] ?? "",
          });
        },
        minHeight: 68,
      });

      commentPane.appendChild(composer);
    } else if (state.canComment) {
      const composer = createCommentComposer({
        className: "note-comment-composer",
        value: state.commentDrafts[block.id] ?? "",
        placeholder: "이 사진 블록에 댓글을 남기세요.",
        submitLabel: "댓글 올리기",
        onInput: (value) => {
          state.commentDrafts[block.id] = value;
        },
        onSubmit: async () => {
          await submitComment({
            blockId: block.id,
            body: state.commentDrafts[block.id] ?? "",
          });
        },
        minHeight: 68,
      });

      commentPane.appendChild(composer);
    }

    const stubTextarea = document.createElement("textarea");
    stubTextarea.className = "note-textarea note-block-textarea note-textarea-stub";
    stubTextarea.tabIndex = -1;
    stubTextarea.setAttribute("aria-hidden", "true");
    stubTextarea.value = "";

    wrapper.append(mediaPane, commentPane);

    return { wrapper, textarea: stubTextarea };
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
      const deletedNote = state.notes[currentNoteIndex];
      const deletedBlockIds = (deletedNote?.blocks ?? []).map((block) => block.id).filter(Boolean);

      state.notes.splice(currentNoteIndex, 1);
      deletedBlockIds.forEach((blockId) => {
        delete state.blockComments[blockId];
        delete state.commentDrafts[blockId];
      });
      render();

      try {
        await deleteSessionBlockCommentsByBlockIds(sessionKey, deletedBlockIds);
      } catch (error) {
        setStatus(error?.message ?? "노트 댓글을 삭제하지 못했습니다.");
      }

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
      await refreshBlockComments();
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
    state.canComment = authState.canComment;
    state.userEmail = authState.user?.email?.toLowerCase() ?? "";
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
