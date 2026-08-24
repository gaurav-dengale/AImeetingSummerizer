package com.meetingai.controller;

import com.meetingai.model.Contact;
import com.meetingai.model.TaskNotificationRequest;
import com.meetingai.service.ContactsService;
import com.meetingai.service.GoogleService;
import com.meetingai.service.SlackService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
public class NotificationController {

    private final ContactsService contactsService;
    private final SlackService slackService;
    private final GoogleService googleService;

    public NotificationController(ContactsService contactsService, SlackService slackService, GoogleService googleService) {
        this.contactsService = contactsService;
        this.slackService = slackService;
        this.googleService = googleService;
    }

    @PostMapping("/send_task_notification_manual")
    public ResponseEntity<?> sendTaskNotificationManual(@RequestBody TaskNotificationRequest request) {
        String name = request.getRecipientName();
        String task = request.getTask();
        String dueDate = request.getDueDate();

        if (name == null || name.isBlank() || task == null || task.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing recipient name or task description"));
        }

        Optional<Contact> contactOpt = contactsService.findContact(name);
        if (contactOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of(
                    "error", "No contact found for '" + name + "' in contacts CSV.",
                    "hint", "Check your contacts.csv file to ensure the name exists."
            ));
        }

        Contact contact = contactOpt.get();
        Map<String, Boolean> results = new HashMap<>();
        results.put("email", false);
        results.put("slack", false);

        if (contact.getEmail() != null && !contact.getEmail().isBlank()) {
            results.put("email", googleService.sendTaskEmail(contact.getName(), contact.getEmail(), task, dueDate));
        }

        if (contact.getSlackId() != null && !contact.getSlackId().isBlank()) {
            results.put("slack", slackService.sendSlackMessage(contact.getSlackId(), contact.getName(), task, dueDate));
        }

        boolean success = results.get("email") || results.get("slack");
        if (success) {
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Task notifications successfully sent to " + contact.getName(),
                    "details", results
            ));
        } else {
            return ResponseEntity.status(500).body(Map.of(
                    "error", "Failed to deliver notification to email or Slack",
                    "details", results
            ));
        }
    }
}
