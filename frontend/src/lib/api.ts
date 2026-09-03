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

export interface DecisionItem {
  id?: number;
  db_id?: number;
  decision: string;
  category?: string;
  rationale?: string;
  consensus_score: number;
  approving_speakers?: string | string[];
  dissenting_speakers?: string | string[];
  approvers?: string[];
  dissenters?: string[];
  provenance_hash?: string;
  status?: string;
  created_at?: string;
  // Decision Reversal & Supersession fields
  superseded_by_id?: number | null;
  superseded_by_hash?: string | null;
  reversal_similarity_score?: number | null;
  semantic_fingerprint?: string | null;
  supersedes_id?: number | null;
}

export interface ReversalCandidate {
  originalDecisionId: number;
  originalDecision: string;
  originalCategory: string;
  originalConsensusScore: number;
  originalProvenanceHash: string;
  originalCreatedAt: string;
  originalStatus: string;
  newDecision: string;
  newCategory: string;
  similarityScore: number;
  contradictionConfidence: number;
  contradictionReason: string;
  suggestedAction: "supersede" | "coexist" | "clarify";
}

export interface ReversalAlert {
  new_decision_id: number;
  new_decision: string;
  original_decision_id: number;
  original_decision: string;
  original_category: string;
  original_consensus_score: number;
  original_provenance_hash: string;
  similarity_score: number;
  contradiction_confidence: number;
  contradiction_reason: string;
  suggested_action: "supersede" | "coexist" | "clarify";
}

export interface StabilityIndex {
  stability_index: number;
  total_decisions: number;
  verified_count: number;
  superseded_count: number;
  contested_count: number;
  reversal_rate: number;
  category_breakdown: Record<string, number>;
  superseded_by_category: Record<string, number>;
}

export interface SupersessionChainLink {
  id: number;
  decision: string;
  category: string;
  status: string;
  consensus_score: number;
  provenance_hash: string;
  created_at: string;
  reversal_similarity_score?: number | null;
}

export interface TaskConflict {
  conflictId: string;
  assignee: string;
  conflictScore: number;
  severity: "critical" | "high" | "moderate";
  reason: string;
  involvedTasks: Array<{
    id: number;
    task: string;
    assignee: string;
    due_date?: string;
    priority: string;
    status: string;
    meeting_title?: string;
    meeting_id?: number;
  }>;
  suggestedRebalance: {
    target_task_id: number;
    current_due_date?: string;
    recommended_due_date: string;
    rationale: string;
  };
}

export interface AskAiResponse {
  answer: string;
  key_citations?: Array<{
    speaker: string;
    quote: string;
    relevance: string;
  }>;
  related_action_items?: string[];
  confidence?: number;
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

  // ── Bi-Directional Task Sync (#7) ──
  simulateBiDirectionalSync: (data: {
    taskId?: number;
    channel?: string;
    responseText?: string;
    reaction?: string;
  }) =>
    request<{
      success: boolean;
      action?: string;
      task_id?: number;
      task?: string;
      new_due_date?: string;
      message?: string;
      trigger?: string;
      source?: string;
    }>("/api/webhooks/simulate", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // ── Cryptographic Decision Ledger (ADR) ──
  getDecisions: () => request<DecisionItem[]>("/api/decisions"),
  getMeetingDecisions: (meetingId: number) => request<DecisionItem[]>(`/api/decisions/meeting/${meetingId}`),
  verifyDecision: (hash: string) =>
    request<{
      verified: boolean;
      decision_id?: number;
      decision?: string;
      category?: string;
      consensus_score?: number;
      status?: string;
      timestamp?: string;
      hash?: string;
      message?: string;
    }>("/api/decisions/verify", {
      method: "POST",
      body: JSON.stringify({ hash }),
    }),

  // ── Decision Reversal & Supersession Tracker (Patent Feature #5) ──
  detectReversals: (decision: string, category?: string, semanticFingerprint?: string) =>
    request<{
      reversals_detected: boolean;
      count: number;
      candidates: ReversalCandidate[];
    }>("/api/decisions/detect-reversals", {
      method: "POST",
      body: JSON.stringify({ decision, category, semantic_fingerprint: semanticFingerprint }),
    }),
  supersedeDecision: (originalDecisionId: number, newDecisionId: number) =>
    request<{
      success: boolean;
      action: string;
      original_decision_id: number;
      new_decision_id: number;
      original_hash: string;
      new_hash: string;
      message: string;
    }>("/api/decisions/supersede", {
      method: "POST",
      body: JSON.stringify({ originalDecisionId, newDecisionId }),
    }),
  markDecisionsCoexisting: (decisionId1: number, decisionId2: number) =>
    request<{ success: boolean; action: string; message: string }>("/api/decisions/coexist", {
      method: "POST",
      body: JSON.stringify({ decisionId1, decisionId2 }),
    }),
  getStabilityIndex: () => request<StabilityIndex>("/api/decisions/stability"),
  getSupersessionChain: (id: number) =>
    request<{
      decision_id: number;
      chain_length: number;
      chain: SupersessionChainLink[];
    }>(`/api/decisions/${id}/chain`),

  // ── Cross-Meeting Temporal Conflict Solver ──
  getConflicts: () => request<TaskConflict[]>("/api/conflicts"),
  resolveConflict: (taskId: number, newDueDate: string) =>
    request<{
      success: boolean;
      message: string;
      remaining_conflicts: TaskConflict[];
    }>("/api/conflicts/resolve", {
      method: "POST",
      body: JSON.stringify({ taskId, newDueDate }),
    }),

  // ── Interactive Grounded Meeting RAG (Ask AI) ──
  askMeetingAi: (query: string, meetingId?: number) =>
    request<AskAiResponse>("/api/meetings/ask", {
      method: "POST",
      body: JSON.stringify({ query, meetingId }),
    }),
};
