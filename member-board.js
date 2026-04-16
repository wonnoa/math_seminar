import { subscribeAuthState } from "./supabase-auth.js?v=20260416-002";
import { deleteMember, fetchMembers, saveMember } from "./supabase-data.js?v=20260416-002";

const initMemberBoard = () => {
  const board = document.querySelector("[data-member-board]");

  if (!board) {
    return;
  }

  const createButton = document.querySelector("[data-member-create]");
  const status = document.querySelector("[data-member-status]");
  const formatter = new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const state = {
    members: [],
    isAdmin: false,
    canManageMemberCard: false,
    userEmail: "",
  };

  const canCreateMemberCard = () => state.isAdmin || state.canManageMemberCard;

  const canEditMemberCard = (member) =>
    state.isAdmin ||
    (state.canManageMemberCard &&
      Boolean(state.userEmail) &&
      member.ownerEmail === state.userEmail);

  const setStatus = (message) => {
    if (status) {
      status.textContent = message;
    }
  };

  const resizeTextarea = (textarea) => {
    textarea.style.height = "0px";
    textarea.style.height = `${Math.max(textarea.scrollHeight, 140)}px`;
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
    const maxDimension = 1200;
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
    return canvas.toDataURL("image/jpeg", 0.84);
  };

  const normalizeMember = (member) => {
    if (!member || typeof member !== "object") {
      return {
        id: crypto.randomUUID(),
        name: "",
        text: "",
        image: "",
      };
    }

    return {
      id: member.id ?? crypto.randomUUID(),
      ownerEmail: member.owner_email ?? member.ownerEmail ?? "",
      name: member.name ?? "",
      text: member.description ?? member.text ?? "",
      image: member.image_data ?? member.image ?? "",
    };
  };

  const createEmptyState = () => {
    const empty = document.createElement("div");
    empty.className = "member-empty";
    empty.innerHTML = `
      <strong>아직 멤버 카드가 없습니다</strong>
      <span>${canCreateMemberCard() ? "프로필 카드 만들기를 눌러 멤버 소개를 추가하세요." : "관리자가 멤버 카드를 등록하면 여기에 표시됩니다."}</span>
    `;

    if (canCreateMemberCard()) {
      empty.addEventListener("click", addMemberCard);
    }

    board.appendChild(empty);
  };

  const addMemberCard = () => {
    if (!canCreateMemberCard()) {
      return;
    }

    if (!state.isAdmin && state.members.some((member) => member.ownerEmail === state.userEmail)) {
      setStatus("이미 본인 프로필 카드가 있습니다.");

      requestAnimationFrame(() => {
        const existingCard = board.querySelector(`[data-owner-email="${state.userEmail}"] .member-name`);
        existingCard?.focus();
      });

      return;
    }

    state.members.push({
      id: crypto.randomUUID(),
      ownerEmail: state.isAdmin ? "" : state.userEmail,
      name: "",
      text: "",
      image: "",
    });
    render();
    setStatus("새 멤버 카드를 만들었습니다.");

    requestAnimationFrame(() => {
      const input = board.querySelector(".member-card:last-child .member-name");
      input?.focus();
    });
  };

  const saveMemberCard = async (index) => {
    const member = state.members[index];
    if (!member) {
      return;
    }

    try {
      await saveMember(member, index);
      setStatus(`멤버 카드 ${index + 1}번을 ${formatter.format(new Date())}에 저장했습니다.`);
    } catch (error) {
      setStatus(error?.message ?? "멤버 카드를 저장하지 못했습니다.");
    }
  };

  const syncMemberOrder = async () => {
    if (!state.isAdmin) {
      return;
    }

    await Promise.all(state.members.map((member, index) => saveMember(member, index)));
  };

  const createMemberCard = (member, index) => {
    const card = document.createElement("article");
    card.className = "member-card";
    card.dataset.memberIndex = String(index);
    card.dataset.ownerEmail = member.ownerEmail ?? "";
    const canEdit = canEditMemberCard(member);

    const imageWrap = document.createElement("div");
    imageWrap.className = "member-photo";

    if (member.image) {
      const image = document.createElement("img");
      image.className = "member-image";
      image.src = member.image;
      image.alt = "멤버 프로필 사진";
      imageWrap.appendChild(image);
    } else {
      const placeholder = document.createElement("div");
      placeholder.className = "member-photo-placeholder";
      placeholder.innerHTML = `
        <strong>사진 없음</strong>
        <span>${canEdit ? "프로필 사진을 추가하세요." : "등록된 사진이 없습니다."}</span>
      `;
      imageWrap.appendChild(placeholder);
    }

    const mediaActions = document.createElement("div");
    mediaActions.className = "member-media-actions";
    mediaActions.hidden = !canEdit;

    const uploadButton = document.createElement("button");
    uploadButton.className = "session-button secondary note-card-button";
    uploadButton.type = "button";
    uploadButton.textContent = member.image ? "사진 바꾸기" : "사진 추가";

    const uploadInput = document.createElement("input");
    uploadInput.className = "note-image-input";
    uploadInput.type = "file";
    uploadInput.accept = "image/*";
    uploadInput.dataset.memberIndex = String(index);

    uploadButton.addEventListener("click", () => {
      uploadInput.click();
    });

    uploadInput.addEventListener("change", async (event) => {
      const currentIndex = Number(event.currentTarget.dataset.memberIndex);
      const file = event.currentTarget.files?.[0];

      if (!file) {
        return;
      }

      setStatus("사진을 준비하는 중입니다.");

      try {
        const imageData = await compressImage(file);
        state.members[currentIndex].image = imageData;
        render();
        setStatus("저장되지 않은 변경사항이 있습니다.");
      } catch {
        setStatus("사진을 추가하지 못했습니다.");
      }
    });

    mediaActions.append(uploadButton, uploadInput);

    if (member.image) {
      const removeButton = document.createElement("button");
      removeButton.className = "session-button secondary note-card-button";
      removeButton.type = "button";
      removeButton.textContent = "사진 제거";
      removeButton.dataset.memberIndex = String(index);
      removeButton.addEventListener("click", (event) => {
        const currentIndex = Number(event.currentTarget.dataset.memberIndex);
        state.members[currentIndex].image = "";
        render();
        setStatus("저장되지 않은 변경사항이 있습니다.");
      });
      mediaActions.appendChild(removeButton);
    }

    const nameInput = document.createElement("input");
    nameInput.className = "member-name";
    nameInput.type = "text";
    nameInput.placeholder = "이름 또는 닉네임";
    nameInput.value = member.name;
    nameInput.dataset.memberIndex = String(index);
    nameInput.readOnly = !canEdit;
    nameInput.addEventListener("input", (event) => {
      const currentIndex = Number(event.currentTarget.dataset.memberIndex);
      state.members[currentIndex].name = event.currentTarget.value;
      setStatus("저장되지 않은 변경사항이 있습니다.");
    });

    const textArea = document.createElement("textarea");
    textArea.className = "member-text";
    textArea.placeholder = "소개나 메모를 적으세요.";
    textArea.value = member.text;
    textArea.dataset.memberIndex = String(index);
    textArea.readOnly = !canEdit;
    textArea.addEventListener("input", (event) => {
      const currentIndex = Number(event.currentTarget.dataset.memberIndex);
      state.members[currentIndex].text = event.currentTarget.value;
      resizeTextarea(event.currentTarget);
      setStatus("저장되지 않은 변경사항이 있습니다.");
    });

    const actions = document.createElement("div");
    actions.className = "member-actions";
    actions.hidden = !canEdit;

    const saveButton = document.createElement("button");
    saveButton.className = "session-button note-card-button";
    saveButton.type = "button";
    saveButton.textContent = "저장";
    saveButton.dataset.memberIndex = String(index);
    saveButton.addEventListener("click", (event) => {
      saveMemberCard(Number(event.currentTarget.dataset.memberIndex));
    });

    const deleteButton = document.createElement("button");
    deleteButton.className = "session-button secondary note-card-button";
    deleteButton.type = "button";
    deleteButton.textContent = "삭제";
    deleteButton.dataset.memberIndex = String(index);
    deleteButton.addEventListener("click", async (event) => {
      const currentIndex = Number(event.currentTarget.dataset.memberIndex);
      const removed = state.members[currentIndex];
      state.members.splice(currentIndex, 1);
      render();

      try {
        if (removed?.id) {
          await deleteMember(removed.id);
        }

        if (state.isAdmin && state.members.length > 0) {
          await syncMemberOrder();
          setStatus("멤버 카드를 삭제했습니다.");
        } else {
          setStatus(state.members.length === 0 ? "멤버 카드를 모두 지웠습니다." : "멤버 카드를 삭제했습니다.");
        }
      } catch (error) {
        setStatus(error?.message ?? "멤버 카드를 삭제하지 못했습니다.");
      }
    });

    actions.append(saveButton, deleteButton);
    card.append(imageWrap, mediaActions, nameInput, textArea, actions);
    resizeTextarea(textArea);
    return card;
  };

  const render = () => {
    board.innerHTML = "";
    createButton.hidden =
      !canCreateMemberCard() ||
      (!state.isAdmin && state.members.some((member) => member.ownerEmail === state.userEmail));

    if (state.members.length === 0) {
      createEmptyState();
      return;
    }

    state.members.forEach((member, index) => {
      board.appendChild(createMemberCard(member, index));
    });
  };

  const restore = async () => {
    try {
      const remoteMembers = await fetchMembers();
      state.members = remoteMembers.map(normalizeMember);
      render();

      if (state.members.length === 0) {
        setStatus("아직 등록된 멤버 카드가 없습니다.");
      } else {
        setStatus("저장된 멤버 카드를 불러왔습니다.");
      }
    } catch (error) {
      render();
      setStatus(error?.message ?? "멤버 카드를 불러오지 못했습니다.");
    }
  };

  createButton?.addEventListener("click", addMemberCard);

  subscribeAuthState((authState) => {
    state.isAdmin = authState.isAdmin;
    state.canManageMemberCard = authState.canManageMemberCard;
    state.userEmail = authState.user?.email?.toLowerCase() ?? "";
    render();
  });

  render();
  restore();
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initMemberBoard);
} else {
  initMemberBoard();
}
