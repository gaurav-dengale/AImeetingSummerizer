export interface Segment {
  speaker?: string;
  text: string;
}

export interface TaskItem {
  id?: number;
  db_id?: number;
  assignee: string;
  task: string;
  due_date?: string | null;
  status?: string; // "pending" | "pending_review" | "done" | "rejected"
  priority?: "critical" | "medium" | "low" | string;
  confidence?: number;
  email_sent?: boolean;
  slack_sent?: boolean;
  email_failed?: boolean;
  slack_failed?: boolean;
  email_retry_count?: number;
  slack_retry_count?: number;
  linked_task_id?: number | null;
  link_type?: string | null;
}

export interface ScheduledEvent {
  event_title?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  attendees?: string[];
  location?: string | null;
  notes?: string | null;
  link?: string | null;
}

export interface AiResult {
  tasks?: TaskItem[];
  scheduled_event?: ScheduledEvent | null;
  scheduled_event_created?: boolean;
  total_segments?: number;
  total_tasks?: number;
  error?: string;
  summary?: string;
  summary_bullets?: string[];
}

export interface TranscriptResponse {
  meeting_id?: string;
  transcript?: { segments?: Segment[] };
  processing_results?: AiResult;
  ai_result?: AiResult;
  has_google_credentials?: boolean;
  has_slack_integration?: boolean;
  pending_review_count?: number;
  warning?: string;
  error?: string;
}

export interface MeetingSummaryItem {
  id: number;
  meeting_id: string;
  title: string;
  summary?: string;
  source: string;
  created_at: string;
  segment_count: number;
  task_count: number;
  done_count: number;
  review_count: number;
}

export interface MeetingDetail extends MeetingSummaryItem {
  raw_transcript?: string;
  summary_bullets?: string[];
  tasks: TaskItem[];
}


export interface ReviewTaskItem {
  id: number;
  assignee: string;
  task: string;
  due_date?: string;
  priority: string;
  confidence: number;
  meeting_title?: string;
  meeting_id?: string;
}

export interface TopAssignee {
  assignee: string;
  total: number;
  done: number;
}

export interface AnalyticsData {
  total_tasks: number;
  done_tasks: number;
  completion_rate: number;
  total_meetings: number;
  pending_review: number;
  top_assignees: TopAssignee[];
}

export interface AiServiceHealth {
  status?: string;
  service?: string;
  groq_configured?: boolean;
  is_recording?: boolean;
}

export interface StatusResponse {
  vexaConfigured: boolean;
  vexaBaseUrl: string;
  slackConfigured: boolean;
  googleConfigured: boolean;
  contactsCount: number;
  aiServiceHealth?: AiServiceHealth;
  pendingReviewCount?: number;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    ...init,
  });

  const text = await res.text();
  let data: unknown = undefined;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const message =
      (typeof data === "object" && data !== null && "error" in data
        ? String((data as { error: unknown }).error)
        : undefined) ?? `Request failed (HTTP ${res.status})`;
    throw new ApiError(message, res.status);
  }

  return data as T;
}

export const api = {
  getStatus: () => request<StatusResponse>("/api/status"),

  createBot: (meetingLink: string) =>
    request<Record<string, unknown>>("/create_bot", {
      method: "POST",
      body: JSON.stringify({ meeting_link: meetingLink }),
    }),

  fetchTranscript: (meetingId?: string) =>
    request<TranscriptResponse>(
      `/fetch_transcript${meetingId ? `?meeting_id=${encodeURIComponent(meetingId)}` : ""}`
    ),

  stopBot: (meetingId?: string) =>
    request<Record<string, unknown>>(
      `/stop_bot${meetingId ? `?meeting_id=${encodeURIComponent(meetingId)}` : ""}`,
      { method: "POST" }
    ),

  startLocalRecording: () =>
    request<{ status?: string; error?: string; chunk_seconds?: number; sample_rate?: number }>(
      "/start_local_recording",
      { method: "POST" }
    ),

  stopAndAnalyzeLocal: () => request<TranscriptResponse>("/stop_and_analyze_local", { method: "POST" }),

  getLiveTranscript: () =>
    request<{ is_recording: boolean; segments: Segment[] }>("/get_live_transcript"),

  sendTaskNotificationManual: (recipientName: string, task: string, dueDate?: string) =>
    request<{ success?: boolean; message?: string; details?: Record<string, boolean> }>(
      "/send_task_notification_manual",
      {
        method: "POST",
        body: JSON.stringify({ recipient_name: recipientName, task, due_date: dueDate }),
      }
    ),

  setSlackToken: (token: string) =>
    request<{ success?: boolean; message?: string }>("/set_slack_token", {
      method: "POST",
      body: JSON.stringify({ slack_token: token }),
    }),

  setContactsCsvPath: (path: string) =>
    request<{ success?: boolean; message?: string; contacts_count?: number }>("/set_contacts_csv_path", {
      method: "POST",
      body: JSON.stringify({ csv_path: path }),
    }),

  setupVexaAdmin: (baseUrl: string, adminKey: string, email: string, name: string) =>
    request<{ success?: boolean; message?: string; api_token?: string; base_url?: string }>(
      "/setup_vexa_admin",
      {
        method: "POST",
        body: JSON.stringify({ base_url: baseUrl, admin_key: adminKey, email, name }),
      }
    ),

  // ── Meeting History & Task Status (#1, #2) ──
  listMeetings: () => request<MeetingSummaryItem[]>("/api/meetings"),
  getMeeting: (id: number) => request<MeetingDetail>(`/api/meetings/${id}`),
  deleteMeeting: (id: number) =>
    request<{ success: boolean; message: string }>(`/api/meetings/${id}`, { method: "DELETE" }),
  updateTaskStatus: (id: number, status: "pending" | "done") =>
    request<{ success: boolean; status: string }>(`/api/tasks/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  // ── Human-in-the-Loop Review (#8, #12) ──
  getPendingReview: () => request<{ tasks: ReviewTaskItem[]; count: number }>("/api/review/pending"),
  getReviewCount: () => request<{ pending_review: number }>("/api/review/count"),
  approveReviewTask: (id: number) =>
    request<{ success: boolean; email_sent?: boolean; slack_sent?: boolean }>(
      `/api/review/${id}/approve`,
      { method: "POST" }
    ),
  editReviewTask: (id: number, data: { assignee: string; task: string; due_date?: string }) =>
    request<{ success: boolean; email_sent?: boolean; slack_sent?: boolean }>(
      `/api/review/${id}/edit`,
      { method: "POST", body: JSON.stringify(data) }
    ),
  rejectReviewTask: (id: number) =>
    request<{ success: boolean; message: string }>(`/api/review/${id}/reject`, { method: "POST" }),

  // ── Notification Retry (#3) ──
  retryTaskEmail: (id: number) =>
    request<{ success: boolean; channel: string; message: string }>(`/api/tasks/${id}/retry/email`, {
      method: "POST",
    }),
  retryTaskSlack: (id: number) =>
    request<{ success: boolean; channel: string; message: string }>(`/api/tasks/${id}/retry/slack`, {
      method: "POST",
    }),

  // ── Analytics (#11) ──
  getAnalytics: () => request<AnalyticsData>("/api/analytics"),

  // ── Recurring Digest (#6) ──
  triggerDigest: () => request<{ success: boolean; message: string }>("/api/digest/trigger", { method: "POST" }),
};

