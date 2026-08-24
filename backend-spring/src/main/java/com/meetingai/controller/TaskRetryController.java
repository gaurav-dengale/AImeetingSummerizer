package com.meetingai.controller;

import com.meetingai.entity.TaskEntity;
import com.meetingai.model.Contact;
import com.meetingai.service.ContactsService;
import com.meetingai.service.DatabaseService;
import com.meetingai.service.GoogleService;
import com.meetingai.service.SlackService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

/** #3 Retry button for failed email/Slack notifications */
@RestController
@RequestMapping("/api/tasks")
public class TaskRetryController {

    private final DatabaseService db;
    private final ContactsService contacts;
    private final GoogleService google;
    private final SlackService slack;

    public TaskRetryController(DatabaseService db, ContactsService contacts,
                               GoogleService google, SlackService slack) {
        this.db = db; this.contacts = contacts;
        this.google = google; this.slack = slack;
    }

    /** POST /api/tasks/{id}/retry/email */
    @PostMapping("/{id}/retry/email")
    public ResponseEntity<?> retryEmail(@PathVariable Long id) {
        return db.getTask(id).<ResponseEntity<?>>map(task -> {
            Optional<Contact> c = contacts.findContact(task.getAssignee());
            if (c.isEmpty() || c.get().getEmail() == null || c.get().getEmail().isBlank()) {
                return ResponseEntity.badRequest().body(
                    Map.of("error", "No email contact found for: " + task.getAssignee()));
            }
            boolean sent = google.sendTaskEmail(c.get().getName(), c.get().getEmail(),
                    task.getTask(), task.getDueDate());
            db.markEmailResult(id, sent);
            return ResponseEntity.ok(Map.of(
                "success", sent,
                "channel", "email",
                "message", sent ? "Email re-sent successfully" : "Email retry failed again"
            ));
        }).orElse(ResponseEntity.notFound().build());
    }

    /** POST /api/tasks/{id}/retry/slack */
    @PostMapping("/{id}/retry/slack")
    public ResponseEntity<?> retrySlack(@PathVariable Long id) {
        return db.getTask(id).<ResponseEntity<?>>map(task -> {
            Optional<Contact> c = contacts.findContact(task.getAssignee());
            if (c.isEmpty() || c.get().getSlackId() == null || c.get().getSlackId().isBlank()) {
                return ResponseEntity.badRequest().body(
                    Map.of("error", "No Slack ID found for: " + task.getAssignee()));
            }
            boolean sent = slack.sendSlackMessage(c.get().getSlackId(), c.get().getName(),
                    task.getTask(), task.getDueDate());
            db.markSlackResult(id, sent);
            return ResponseEntity.ok(Map.of(
                "success", sent,
                "channel", "slack",
                "message", sent ? "Slack message re-sent successfully" : "Slack retry failed again"
            ));
        }).orElse(ResponseEntity.notFound().build());
    }
}
