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
  user: null,
  error: "",
};

let mounted = false;

function emitState() {
  const snapshot = { ...state };
  document.body.dataset.admin = snapshot.isAdmin ? "true" : "false";
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
    const isAdmin = user?.email ? await checkAdmin(user.email) : false;

    state.ready = true;
    state.user = user;
    state.isAdmin = isAdmin;
    state.error = "";
  } catch (error) {
    state.ready = true;
    state.user = null;
    state.isAdmin = false;
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
    <p class="spec-label">관리자</p>
    <div class="auth-panel-head">
      <span class="auth-panel-status" data-auth-status>읽기 전용</span>
      <button class="session-button secondary auth-panel-button" type="button" data-auth-action>관리자 로그인</button>
    </div>
    <p class="auth-panel-meta" data-auth-meta>편집 기능은 관리자 로그인 후 사용할 수 있습니다.</p>
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

  actionButton?.addEventListener("click", async () => {
    const current = getAuthState();

    if (current.isAdmin) {
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

    const email = window.prompt("관리자 이메일을 입력하세요.");
    if (!email) {
      return;
    }

    const password = window.prompt("비밀번호를 입력하세요.");
    if (!password) {
      return;
    }

    try {
      actionButton.disabled = true;
      await signInAdmin(email, password);
    } catch (error) {
      window.alert(error?.message ?? "로그인하지 못했습니다.");
    } finally {
      actionButton.disabled = false;
    }
  });

  subscribeAuthState((nextState) => {
    if (!statusEl || !metaEl || !actionButton) {
      return;
    }

    if (!nextState.ready) {
      statusEl.textContent = "확인 중";
      metaEl.textContent = "관리자 상태를 확인하고 있습니다.";
      actionButton.textContent = "잠시만";
      actionButton.disabled = true;
      return;
    }

    actionButton.disabled = false;

    if (nextState.isAdmin) {
      statusEl.textContent = "관리자 로그인됨";
      metaEl.textContent = nextState.user?.email ?? "관리자 계정";
      actionButton.textContent = "로그아웃";
      return;
    }

    if (nextState.user && !nextState.isAdmin) {
      statusEl.textContent = "읽기 전용";
      metaEl.textContent = "로그인은 되었지만 관리자 권한이 없습니다.";
      actionButton.textContent = "관리자 로그인";
      return;
    }

    if (nextState.error) {
      statusEl.textContent = "설정 필요";
      metaEl.textContent = "Supabase 테이블 또는 권한 설정을 먼저 완료해야 합니다.";
      actionButton.textContent = "관리자 로그인";
      return;
    }

    statusEl.textContent = "읽기 전용";
    metaEl.textContent = "편집 기능은 관리자 로그인 후 사용할 수 있습니다.";
    actionButton.textContent = "관리자 로그인";
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
