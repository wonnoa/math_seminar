import { getAuthState, supabase } from "./supabase-auth.js";

function requireAdmin() {
  if (!getAuthState().isAdmin) {
    throw new Error("관리자 권한이 필요합니다.");
  }
}

export async function fetchSectionProgressMap() {
  const { data, error } = await supabase
    .from("section_progress")
    .select("section_key, status");

  if (error) {
    throw error;
  }

  return Object.fromEntries(data.map((row) => [row.section_key, row.status]));
}

export async function saveSectionProgress(sectionKey, status) {
  requireAdmin();

  const { error } = await supabase.from("section_progress").upsert(
    {
      section_key: sectionKey,
      status,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "section_key" },
  );

  if (error) {
    throw error;
  }
}

export async function fetchSessionNotes(sessionKey) {
  const { data, error } = await supabase
    .from("session_notes")
    .select("session_key, session_date, title, notes, updated_at")
    .eq("session_key", sessionKey)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function fetchSessionNoteList() {
  const { data, error } = await supabase
    .from("session_notes")
    .select("session_key, session_date, title, updated_at")
    .order("session_date", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function saveSessionNotes(sessionKey, title, notes) {
  requireAdmin();

  const sessionDate = sessionKey.replace("session-", "");
  const { error } = await supabase.from("session_notes").upsert(
    {
      session_key: sessionKey,
      session_date: sessionDate,
      title,
      notes,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "session_key" },
  );

  if (error) {
    throw error;
  }
}

export async function createSessionNote(sessionKey, sessionDate, title = "") {
  requireAdmin();

  const { data, error } = await supabase
    .from("session_notes")
    .upsert(
      {
        session_key: sessionKey,
        session_date: sessionDate,
        title,
        notes: [],
        updated_at: new Date().toISOString(),
      },
      { onConflict: "session_key" }
    )
    .select("session_key, session_date, title, updated_at")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function fetchMembers() {
  const { data, error } = await supabase
    .from("member_cards")
    .select("id, sort_order, name, description, image_data, updated_at")
    .order("sort_order", { ascending: true })
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function saveMember(member, index) {
  requireAdmin();

  const { error } = await supabase.from("member_cards").upsert(
    {
      id: member.id,
      sort_order: index,
      name: member.name ?? "",
      description: member.text ?? "",
      image_data: member.image ?? "",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) {
    throw error;
  }
}

export async function deleteMember(id) {
  requireAdmin();

  const { error } = await supabase.from("member_cards").delete().eq("id", id);

  if (error) {
    throw error;
  }
}

export async function fetchNotices() {
  const { data, error } = await supabase
    .from("session_notices")
    .select("id, notice_date, title, body, saved_at, updated_at")
    .order("notice_date", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function saveNotice(notice) {
  requireAdmin();

  const { error } = await supabase.from("session_notices").upsert(
    {
      id: notice.id,
      notice_date: notice.date,
      title: notice.title ?? "",
      body: notice.body ?? "",
      saved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) {
    throw error;
  }
}

export async function deleteNotice(id) {
  requireAdmin();

  const { error } = await supabase.from("session_notices").delete().eq("id", id);

  if (error) {
    throw error;
  }
}
