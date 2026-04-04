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

export async function fetchSessionBlockComments(sessionKey) {
  const { data, error } = await supabase
    .from("session_block_comments")
    .select("id, session_key, block_id, parent_id, body, author_email, created_at, updated_at")
    .eq("session_key", sessionKey)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function createSessionBlockComment(sessionKey, blockId, body, parentId = null) {
  requireAdmin();

  const authorEmail = getAuthState().user?.email?.toLowerCase() ?? "";

  const { data, error } = await supabase
    .from("session_block_comments")
    .insert({
      session_key: sessionKey,
      block_id: blockId,
      parent_id: parentId,
      body,
      author_email: authorEmail,
      updated_at: new Date().toISOString(),
    })
    .select("id, session_key, block_id, parent_id, body, author_email, created_at, updated_at")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteSessionBlockCommentsByBlockIds(sessionKey, blockIds) {
  requireAdmin();

  if (!Array.isArray(blockIds) || blockIds.length === 0) {
    return;
  }

  const { error } = await supabase
    .from("session_block_comments")
    .delete()
    .eq("session_key", sessionKey)
    .in("block_id", blockIds);

  if (error) {
    throw error;
  }
}

export async function deleteSessionBlockComment(commentId) {
  requireAdmin();

  const { error } = await supabase
    .from("session_block_comments")
    .delete()
    .or(`id.eq.${commentId},parent_id.eq.${commentId}`);

  if (error) {
    throw error;
  }
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
