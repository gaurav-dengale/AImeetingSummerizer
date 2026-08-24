package com.meetingai.controller;

import com.meetingai.entity.TaskEntity;
import com.meetingai.model.Contact;
import com.meetingai.service.ContactsService;
import com.meetingai.service.DatabaseService;
import com.meetingai.service.GoogleService;
import com.meetingai.service.SlackService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/** #8 Human-in-the-Loop review UI � approve / edit / reject pending tasks */
@RestController
@RequestMapping("/api/review")
public class ReviewController {

    private final DatabaseService db;
    private final ContactsService contacts;
    private final GoogleService google;
    private final SlackService slack;

    public ReviewController(DatabaseService db, ContactsService contacts,
                            GoogleService google, SlackService slack) {
        this.db = db; this.contacts = contacts;
        this.google = google; this.slack = slack;
    }

    /** GET /api/review/pending � all tasks awaiting human review */
    @GetMapping("/pending")
    public ResponseEntity<?> getPendingReview() {
        List<Map<String, Object>> result = new ArrayList<>();
        for (TaskEntity t : db.getPendingReviewTasks()) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id",         t.getId());
            m.put("assignee",   t.getAssignee());
            m.put("task",       t.getTask());
            m.put("due_date",   t.getDueDate());
            m.put("priority",   t.getPriority());
            m.put("confidence", t.getConfidence());
            m.put("meeting_title", t.getMeeting() != null ? t.getMeeting().getTitle() : "");
            m.put("meeting_id",    t.getMeeting() != null ? t.getMeeting().getMeetingId() : "");
            result.add(m);
        }
        return ResponseEntity.ok(Map.of("tasks", result, "count", result.size()));
    }

    /** POST /api/review/{id}/approve � approve and dispatch immediately */
    @PostMapping("/{id}/approve")
    public ResponseEntity<?> approve(@PathVariable Long id) {
        return db.getTask(id).<ResponseEntity<?>>map(task -> {
            db.updateTaskStatus(id, "pending");
            return dispatchTask(task);
        }).orElse(ResponseEntity.notFound().build());
    }

    /** POST /api/review/{id}/edit � edit fields then dispatch */
    @PostMapping("/{id}/edit")
    public ResponseEntity<?> editAndApprove(@PathVariable Long id,
                                            @RequestBody Map<String, String> body) {
        return db.getTask(id).<ResponseEntity<?>>map(task -> {
            String assignee = body.getOrDefault("assignee", task.getAssignee());
            String taskDesc = body.getOrDefault("task",     task.getTask());
            String dueDate  = body.getOrDefault("due_date", task.getDueDate());
            db.updateTaskFields(id, assignee, taskDesc, dueDate);
            db.updateTaskStatus(id, "pending");
            // Re-fetch with updated values
            return db.getTask(id).<ResponseEntity<?>>map(this::dispatchTask)
                    .orElse(ResponseEntity.ok(Map.of("success", true)));
        }).orElse(ResponseEntity.notFound().build());
    }

    /** POST /api/review/{id}/reject � discard the task */
    @PostMapping("/{id}/reject")
    public ResponseEntity<?> reject(@PathVariable Long id) {
        db.updateTaskStatus(id, "rejected");
        return ResponseEntity.ok(Map.of("success", true, "message", "Task rejected and discarded"));
    }

    /** GET /api/review/count */
    @GetMapping("/count")
    public ResponseEntity<?> count() {
        return ResponseEntity.ok(Map.of("pending_review", db.countPendingReview()));
    }

    private ResponseEntity<?> dispatchTask(TaskEntity task) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("task_id", task.getId());
        boolean emailSent = false, slackSent = false;

        Optional<Contact> contactOpt = contacts.findContact(task.getAssignee());
        if (contactOpt.isPresent()) {
            Contact contact = contactOpt.get();
            if (contact.getEmail() != null && !contact.getEmail().isBlank()) {
                emailSent = google.sendTaskEmail(contact.getName(), contact.getEmail(),
                        task.getTask(), task.getDueDate());
                db.markEmailResult(task.getId(), emailSent);
            }
            if (contact.getSlackId() != null && !contact.getSlackId().isBlank()) {
                slackSent = slack.sendSlackMessage(contact.getSlackId(), contact.getName(),
                        task.getTask(), task.getDueDate());
                db.markSlackResult(task.getId(), slackSent);
            }
        }
        result.put("email_sent",  emailSent);
        result.put("slack_sent",  slackSent);
        result.put("success",     emailSent || slackSent || contactOpt.isEmpty());
        result.put("contact_found", contactOpt.isPresent());
        return ResponseEntity.ok(result);
    }
}
