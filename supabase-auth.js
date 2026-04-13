import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const SUPABASE_URL = "https://xltjtolonmqmagduqbxc.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_VfPnqgLrWWzz7in6gab_eg_UfXiP9D2";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: "math-seminar.supabase.auth",
  },
});

const listeners = new Set();
const state = {
  ready: false,
  isAdmin: false,
  canComment: false,
  canManageMemberCard: false,
  canManageNotices: false,
  user: null,
  error: "",
};

let mounted = false;

function emitState() {
  const snapshot = { ...state };
  document.body.dataset.admin = snapshot.isAdmin ? "true" : "false";
  document.body.dataset.canComment = snapshot.canComment ? "true" : "false";
  document.body.dataset.canManageMemberCard = snapshot.canManageMemberCard ? "true" : "false";
  document.body.dataset.canManageNotices = snapshot.canManageNotices ? "true" : "false";
  document.body.dataset.authReady = snapshot.ready ? "true" : "false";
  listeners.forEach((listener) => listener(snapshot));
}

async function checkAdmin(email) {
  if (!email) {
    return false;
  }

  const { data, error } = await supabase
    .from("admin_emails")
    .select("email")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

async function fetchPermissions(email) {
  if (!email) {
    return {
      isAdmin: false,
      canComment: false,
      canManageMemberCard: false,
      canManageNotices: false,
    };
  }

  let permissionRow = null;

  try {
    const { data, error } = await supabase
      .from("user_permissions")
      .select("*")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (!error) {
      permissionRow = data;
    }
  } catch {
    permissionRow = null;
  }

  const legacyAdmin = await checkAdmin(email).catch(() => false);
  const isAdmin = legacyAdmin || Boolean(permissionRow?.is_admin);

  return {
    isAdmin,
    canComment: isAdmin || Boolean(permissionRow?.can_comment),
    canManageMemberCard: isAdmin || Boolean(permissionRow?.can_manage_member_card),
    canManageNotices: isAdmin || Boolean(permissionRow?.can_manage_notices),
  };
}

export async function refreshAuthState() {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      throw error;
    }

    const user = session?.user ?? null;
    const permissions = user?.email
      ? await fetchPermissions(user.email)
      : {
          isAdmin: false,
          canComment: false,
          canManageMemberCard: false,
          canManageNotices: false,
        };

    state.ready = true;
    state.user = user;
    state.isAdmin = permissions.isAdmin;
    state.canComment = permissions.canComment;
    state.canManageMemberCard = permissions.canManageMemberCard;
    state.canManageNotices = permissions.canManageNotices;
    state.error = "";
  } catch (error) {
    state.ready = true;
    state.user = null;
    state.isAdmin = false;
    state.canComment = false;
    state.canManageMemberCard = false;
    state.canManageNotices = false;
    state.error = error?.message ?? "Supabase 연결을 확인할 수 없습니다.";
  }

  emitState();
  return { ...state };
}

export function getAuthState() {
  return { ...state };
}

export function subscribeAuthState(listener) {
  listeners.add(listener);
  listener({ ...state });
  return () => listeners.delete(listener);
}

export async function signInAdmin(email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  const { error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error) {
    throw error;
  }

  return refreshAuthState();
}

export async function signOutAdmin() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
  return refreshAuthState();
}

function buildAuthPanel() {
  const sidebarFrame = document.querySelector(".sidebar-frame");

  if (!sidebarFrame || sidebarFrame.querySelector("[data-auth-panel]")) {
    return;
  }

  const panel = document.createElement("section");
  panel.className = "auth-panel";
  panel.dataset.authPanel = "true";
  panel.innerHTML = `
    <p class="spec-label">계정</p>
    <div class="auth-panel-head">
      <span class="auth-panel-status" data-auth-status>로그인 안 됨</span>
      <button class="session-button secondary auth-panel-button" type="button" data-auth-action>로그인</button>
    </div>
    <p class="auth-panel-meta" data-auth-meta>로그인하면 부여된 권한에 따라 편집 기능이 열립니다.</p>
    <form class="auth-login-form" data-auth-form hidden>
      <label class="auth-field">
        <span class="auth-field-label">이메일</span>
        <input class="auth-input" type="email" autocomplete="username" data-auth-email />
      </label>
      <label class="auth-field">
        <span class="auth-field-label">비밀번호</span>
        <input class="auth-input" type="password" autocomplete="current-password" data-auth-password />
      </label>
      <div class="auth-form-actions">
        <button class="session-button auth-panel-button" type="submit" data-auth-submit>로그인</button>
        <button class="session-button secondary auth-panel-button" type="button" data-auth-cancel>닫기</button>
      </div>
    </form>
  `;

  const nav = sidebarFrame.querySelector(".sidebar-nav");
  if (nav) {
    nav.before(panel);
  } else {
    sidebarFrame.appendChild(panel);
  }

  const actionButton = panel.querySelector("[data-auth-action]");
  const statusEl = panel.querySelector("[data-auth-status]");
  const metaEl = panel.querySelector("[data-auth-meta]");
  const form = panel.querySelector("[data-auth-form]");
  const emailInput = panel.querySelector("[data-auth-email]");
  const passwordInput = panel.querySelector("[data-auth-password]");
  const submitButton = panel.querySelector("[data-auth-submit]");
  const cancelButton = panel.querySelector("[data-auth-cancel]");

  const closeForm = () => {
    if (!form || !emailInput || !passwordInput) {
      return;
    }

    form.hidden = true;
    emailInput.value = "";
    passwordInput.value = "";
  };

  const openForm = () => {
    if (!form || !emailInput) {
      return;
    }

    form.hidden = false;
    requestAnimationFrame(() => {
      emailInput.focus();
    });
  };

  actionButton?.addEventListener("click", async () => {
    const current = getAuthState();

    if (current.user) {
      try {
        actionButton.disabled = true;
        await signOutAdmin();
      } catch (error) {
        window.alert(error?.message ?? "로그아웃하지 못했습니다.");
      } finally {
        actionButton.disabled = false;
      }
      return;
    }

    openForm();
  });

  cancelButton?.addEventListener("click", () => {
    closeForm();
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = emailInput?.value?.trim();
    const password = passwordInput?.value ?? "";

    if (!email || !password) {
      window.alert("이메일과 비밀번호를 입력하세요.");
      return;
    }

    try {
      actionButton.disabled = true;
      if (submitButton) {
        submitButton.disabled = true;
      }
      await signInAdmin(email, password);
      closeForm();
    } catch (error) {
      window.alert(error?.message ?? "로그인하지 못했습니다.");
    } finally {
      actionButton.disabled = false;
      if (submitButton) {
        submitButton.disabled = false;
      }
    }
  });

  subscribeAuthState((nextState) => {
    if (!statusEl || !metaEl || !actionButton || !form) {
      return;
    }

    if (!nextState.ready) {
      statusEl.textContent = "확인 중";
      metaEl.textContent = "계정 권한을 확인하고 있습니다.";
      actionButton.textContent = "잠시만";
      actionButton.disabled = true;
      form.hidden = true;
      return;
    }

    actionButton.disabled = false;

    if (nextState.isAdmin) {
      statusEl.textContent = "관리자 로그인됨";
      metaEl.textContent = nextState.user?.email ?? "전체 관리자";
      actionButton.textContent = "로그아웃";
      form.hidden = true;
      return;
    }

    if (nextState.user && !nextState.isAdmin) {
      const enabled = [];

      if (nextState.canComment) {
        enabled.push("댓글");
      }

      if (nextState.canManageMemberCard) {
        enabled.push("멤버 카드");
      }

      statusEl.textContent = enabled.length > 0 ? "권한 로그인됨" : "읽기 전용";
      metaEl.textContent =
        enabled.length > 0
          ? `${nextState.user.email ?? "계정"} · ${enabled.join(", ")} 권한`
          : "로그인은 되었지만 부여된 권한이 없습니다.";
      actionButton.textContent = "로그아웃";
      form.hidden = true;
      return;
    }

    if (nextState.error) {
      statusEl.textContent = "설정 필요";
      metaEl.textContent = "Supabase 테이블 또는 권한 설정을 먼저 완료해야 합니다.";
      actionButton.textContent = "로그인";
      form.hidden = true;
      return;
    }

    statusEl.textContent = "로그인 안 됨";
    metaEl.textContent = "로그인하면 부여된 권한에 따라 편집 기능이 열립니다.";
    actionButton.textContent = "로그인";
  });
}

function mountAuthPanel() {
  if (mounted) {
    return;
  }

  mounted = true;
  buildAuthPanel();
  refreshAuthState();

  supabase.auth.onAuthStateChange(() => {
    refreshAuthState();
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountAuthPanel, { once: true });
} else {
  mountAuthPanel();
}
