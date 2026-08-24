package com.meetingai.controller;

import com.meetingai.entity.MeetingEntity;
import com.meetingai.entity.TaskEntity;
import com.meetingai.service.DatabaseService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/** #1 Persistent meeting history | #2 Task status toggle */
@RestController
@RequestMapping("/api")
public class MeetingHistoryController {

    private final DatabaseService db;
    public MeetingHistoryController(DatabaseService db) { this.db = db; }

    /** GET /api/meetings � list all meetings with stats */
    @GetMapping("/meetings")
    public ResponseEntity<?> listMeetings() {
        List<Map<String, Object>> result = new ArrayList<>();
        for (MeetingEntity m : db.listMeetings()) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id",            m.getId());
            row.put("meeting_id",    m.getMeetingId());
            row.put("title",         m.getTitle());
            row.put("summary",       m.getSummary());
            row.put("source",        m.getSource());
            row.put("created_at",    m.getCreatedAt());
            row.put("segment_count", m.getSegmentCount());
            long taskCount = m.getTasks().size();
            long doneCount = m.getTasks().stream().filter(t -> "done".equals(t.getStatus())).count();
            long reviewCount = m.getTasks().stream().filter(t -> "pending_review".equals(t.getStatus())).count();
            row.put("task_count",   taskCount);
            row.put("done_count",   doneCount);
            row.put("review_count", reviewCount);
            result.add(row);
        }
        return ResponseEntity.ok(result);
    }

    /** GET /api/meetings/{id} � get meeting with all tasks */
    @GetMapping("/meetings/{id}")
    public ResponseEntity<?> getMeeting(@PathVariable Long id) {
        return db.getMeeting(id).<ResponseEntity<?>>map(m -> {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("id",         m.getId());
            body.put("meeting_id", m.getMeetingId());
            body.put("title",      m.getTitle());
            body.put("summary",    m.getSummary());
            body.put("source",     m.getSource());
            body.put("created_at", m.getCreatedAt());

            List<Map<String, Object>> tasks = new ArrayList<>();
            for (TaskEntity t : db.getTasksForMeeting(m.getId())) {
                tasks.add(taskToMap(t));
            }
            body.put("tasks", tasks);
            return ResponseEntity.ok(body);
        }).orElse(ResponseEntity.notFound().build());
    }

    /** DELETE /api/meetings/{id} */
    @DeleteMapping("/meetings/{id}")
    public ResponseEntity<?> deleteMeeting(@PathVariable Long id) {
        db.deleteMeeting(id);
        return ResponseEntity.ok(Map.of("success", true, "message", "Meeting deleted"));
    }

    /** PATCH /api/tasks/{id}/status � toggle done/pending (#2) */
    @PatchMapping("/tasks/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String status = body.get("status");
        if (status == null || (!status.equals("done") && !status.equals("pending"))) {
            return ResponseEntity.badRequest().body(Map.of("error", "status must be 'done' or 'pending'"));
        }
        db.updateTaskStatus(id, status);
        return ResponseEntity.ok(Map.of("success", true, "status", status));
    }

    /** GET /api/analytics � analytics dashboard (#11) */
    @GetMapping("/analytics")
    public ResponseEntity<?> getAnalytics() {
        return ResponseEntity.ok(db.getAnalytics());
    }

    /** GET /api/tasks/failed � all tasks with failed notifications (#3 retry) */
    @GetMapping("/tasks/failed")
    public ResponseEntity<?> getFailedTasks() {
        List<Map<String, Object>> result = new ArrayList<>();
        for (TaskEntity t : db.getFailedEmailTasks()) result.add(taskToMap(t));
        // Avoid duplicates (task could have both email + slack failed)
        Set<Long> seen = new HashSet<>();
        for (TaskEntity t : db.getFailedSlackTasks()) {
            if (seen.add(t.getId())) result.add(taskToMap(t));
        }
        return ResponseEntity.ok(result);
    }

    private Map<String, Object> taskToMap(TaskEntity t) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",                t.getId());
        m.put("assignee",          t.getAssignee());
        m.put("task",              t.getTask());
        m.put("due_date",          t.getDueDate());
        m.put("status",            t.getStatus());
        m.put("priority",          t.getPriority());
        m.put("confidence",        t.getConfidence());
        m.put("email_sent",        t.isEmailSent());
        m.put("slack_sent",        t.isSlackSent());
        m.put("email_failed",      t.isEmailFailed());
        m.put("slack_failed",      t.isSlackFailed());
        m.put("email_retry_count", t.getEmailRetryCount());
        m.put("slack_retry_count", t.getSlackRetryCount());
        m.put("created_at",        t.getCreatedAt());
        if (t.getLinkedTask() != null) {
            m.put("linked_task_id", t.getLinkedTask().getId());
            m.put("link_type",      t.getLinkType());
        }
        return m;
    }
}
