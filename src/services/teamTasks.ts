import { supabase } from "@/lib/supabaseClient";

/* ─── Types ─── */

export type TaskPriority = "LOW" | "MED" | "HIGH";
export type TaskUserStatus = "OPEN" | "DONE";

export interface Task {
  id: string;
  title: string;
  notes: string | null;
  due_at: string | null;
  priority: TaskPriority;
  is_broadcast: boolean;
  created_by_crm_user_id: string;
  created_at: string;
  // joined
  creator_name?: string;
  my_status?: TaskUserStatus;
  my_pinned?: boolean;
  recipient_count?: number;
}

export interface TaskRecipient {
  id: string;
  task_id: string;
  crm_user_id: string;
  assigned_by_crm_user_id: string;
  user_name?: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  comment: string;
  created_at: string;
  user_name?: string;
}

export interface TaskUserState {
  task_id: string;
  crm_user_id: string;
  status: TaskUserStatus;
  pinned: boolean;
}

/* ─── Fetch tasks (RLS handles visibility) ─── */

export async function getMyTasks(
  crmUserId: string,
  limit = 50,
): Promise<{
  data: Task[] | null;
  error: string | null;
}> {
  try {
    const { data, error } = await supabase
      .from("tasks")
      .select(
        `
        id,
        title,
        notes,
        priority,
        due_at,
        is_broadcast,
        created_at,
        created_by_crm_user_id,
        created_by:crm_users!tasks_created_by_fk(id, full_name, email),
        task_recipients(
          crm_user_id,
          user:crm_users!task_recipients_user_fk(id, full_name, email)
        ),
        task_user_state(
          crm_user_id,
          status,
          pinned,
          pinned_order
        )
      `,
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      if (error.message.includes("does not exist") || error.code === "42P01") {
        return { data: [], error: null };
      }
      return { data: null, error: error.message };
    }

    const mapped: Task[] = (data || []).map((row: any) => {
      // Find the task_user_state row for the current user
      const myState = Array.isArray(row.task_user_state)
        ? row.task_user_state.find((s: any) => s.crm_user_id === crmUserId)
        : null;

      return {
        id: row.id,
        title: row.title,
        notes: row.notes,
        due_at: row.due_at,
        priority: row.priority || "MED",
        is_broadcast: row.is_broadcast ?? false,
        created_by_crm_user_id: row.created_by_crm_user_id,
        created_at: row.created_at,
        creator_name: row.created_by?.full_name || null,
        my_status: myState?.status || "OPEN",
        my_pinned: myState?.pinned ?? false,
        recipient_count: Array.isArray(row.task_recipients) ? row.task_recipients.length : 0,
      };
    });

    // Sort: pinned first, then by due_at asc nulls last, then created_at desc
    mapped.sort((a, b) => {
      if (a.my_pinned && !b.my_pinned) return -1;
      if (!a.my_pinned && b.my_pinned) return 1;
      if (a.due_at && b.due_at) {
        const diff = new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
        if (diff !== 0) return diff;
      }
      if (a.due_at && !b.due_at) return -1;
      if (!a.due_at && b.due_at) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return { data: mapped, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Failed to load tasks" };
  }
}

/* ─── Create task ─── */

export async function createTeamTask(input: {
  title: string;
  notes?: string | null;
  due_at?: string | null;
  priority: TaskPriority;
  is_broadcast: boolean;
  recipient_ids?: string[];
  crmUserId: string;
}): Promise<{ error: string | null }> {
  try {
    // Auth gate
    const {
      data: { session },
    } = await supabase.auth.getSession();
    console.log("[createTeamTask] session uid:", session?.user?.id ?? "NULL");
    if (!session?.access_token) {
      return { error: "Session expired. Please login again." };
    }

    const { data: taskData, error: taskError } = await supabase
      .from("tasks")
      .insert({
        title: input.title,
        notes: input.notes || null,
        due_at: input.due_at || null,
        priority: input.priority,
        is_broadcast: input.is_broadcast,
        created_by_crm_user_id: input.crmUserId,
        assigned_to_crm_user_id: input.crmUserId,
      })
      .select("id")
      .single();

    if (taskError) return { error: taskError.message };

    // Insert recipients if private task
    if (!input.is_broadcast && input.recipient_ids && input.recipient_ids.length > 0) {
      const rows = input.recipient_ids.map((uid) => ({
        task_id: taskData.id,
        crm_user_id: uid,
        assigned_by_crm_user_id: input.crmUserId,
      }));
      const { error: recError } = await supabase.from("task_recipients").insert(rows);
      if (recError) return { error: `Task created but failed to add recipients: ${recError.message}` };
    }

    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to create task" };
  }
}

/* ─── Update task (admin or creator) ─── */

export async function updateTeamTask(
  taskId: string,
  updates: Partial<Pick<Task, "title" | "notes" | "due_at" | "priority" | "is_broadcast">>,
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.from("tasks").update(updates).eq("id", taskId);
    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to update task" };
  }
}

/* ─── Delete task ─── */

export async function deleteTeamTask(taskId: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to delete task" };
  }
}

/* ─── User state (pin / done) ─── */

export async function upsertTaskUserState(
  taskId: string,
  crmUserId: string,
  updates: Partial<Pick<TaskUserState, "status" | "pinned">>,
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.from("task_user_state").upsert(
      {
        task_id: taskId,
        crm_user_id: crmUserId,
        ...updates,
      },
      { onConflict: "task_id,crm_user_id" },
    );
    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to update task state" };
  }
}

/* ─── Comments ─── */

export async function getTaskComments(taskId: string): Promise<{
  data: TaskComment[] | null;
  error: string | null;
}> {
  try {
    const { data, error } = await supabase
      .from("task_comments")
      .select("id, task_id, user_id, comment, created_at")
      .eq("task_id", taskId)
      .order("created_at", { ascending: true });

    if (error) return { data: null, error: error.message };

    // Collect unique user_ids to fetch names
    const userIds = [...new Set((data || []).map((r: any) => r.user_id).filter(Boolean))];
    let nameMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: users } = await supabase.from("crm_users").select("id, full_name").in("id", userIds);
      (users || []).forEach((u: any) => {
        nameMap[u.id] = u.full_name || "Unknown";
      });
    }

    const mapped: TaskComment[] = (data || []).map((r: any) => ({
      id: r.id,
      task_id: r.task_id,
      user_id: r.user_id,
      comment: r.comment || "",
      created_at: r.created_at,
      user_name: nameMap[r.user_id] || "Unknown",
    }));

    return { data: mapped, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Failed to load comments" };
  }
}

export async function addTaskComment(
  taskId: string,
  crmUserId: string,
  comment: string,
): Promise<{ error: string | null }> {
  try {
    // Auth gate – ensure RLS can resolve auth.uid()
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      return { error: "Session expired. Please login again." };
    }

    const { error } = await supabase
      .from("task_comments")
      .insert({ task_id: taskId, user_id: crmUserId, comment: comment });
    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to add comment" };
  }
}

/* ─── Recipients ─── */

export async function getTaskRecipients(taskId: string): Promise<{
  data: TaskRecipient[] | null;
  error: string | null;
}> {
  try {
    const { data, error } = await supabase
      .from("task_recipients")
      .select(
        `
        *,
        recipient:crm_users!task_recipients_crm_user_id_fkey(full_name)
      `,
      )
      .eq("task_id", taskId);

    if (error) return { data: null, error: error.message };

    const mapped: TaskRecipient[] = (data || []).map((r: any) => ({
      id: r.id,
      task_id: r.task_id,
      crm_user_id: r.crm_user_id,
      assigned_by_crm_user_id: r.assigned_by_crm_user_id,
      user_name: r.recipient?.full_name || "Unknown",
    }));

    return { data: mapped, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Failed to load recipients" };
  }
}

export async function addTaskRecipients(
  taskId: string,
  userIds: string[],
  assignedByCrmUserId: string,
): Promise<{ error: string | null }> {
  try {
    const rows = userIds.map((uid) => ({
      task_id: taskId,
      crm_user_id: uid,
      assigned_by_crm_user_id: assignedByCrmUserId,
    }));
    const { error } = await supabase.from("task_recipients").insert(rows);
    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to add recipients" };
  }
}

export async function removeTaskRecipient(recipientId: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.from("task_recipients").delete().eq("id", recipientId);
    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to remove recipient" };
  }
}
