package com.meetingai.controller;

import com.meetingai.entity.TaskEntity;
import com.meetingai.repository.TaskRepository;
import com.meetingai.service.DatabaseService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * WebhookController — Feature #7 Bi-Directional Task Sync Engine.
 * 
 * Closes the feedback loop:
 * 1. Email reply ("Done, deployed it") → marks task ✅ Done in database & UI
 * 2. Slack reaction (adds ✅ emoji) → marks task ✅ Done
 * 3. Slack / Email reply ("Need 2 more days") → extends deadline, flags for review
 * 4. Simulation endpoint for live testing without external webhook setup
 */
@RestController
@RequestMapping("/api/webhooks")
@CrossOrigin(origins = "*")
public class WebhookController {

    private static final Logger log = LoggerFactory.getLogger(WebhookController.class);

    private final DatabaseService dbService;
    private final TaskRepository taskRepo;

    public WebhookController(DatabaseService dbService, TaskRepository taskRepo) {
        this.dbService = dbService;
        this.taskRepo = taskRepo;
    }

    // ── 1. Inbound Email Webhook ───────────────────────────────────────────────

    public record EmailWebhookPayload(
            String from,
            String to,
            String subject,
            String text,
            String html,
            Long taskId
    ) {}

    @PostMapping("/email")
    public ResponseEntity<?> handleInboundEmail(@RequestBody Map<String, Object> payload) {
        log.info("[Bi-Directional] Received inbound email webhook: {}", payload);

        String from = String.valueOf(payload.getOrDefault("from", ""));
        String subject = String.valueOf(payload.getOrDefault("subject", ""));
        String body = String.valueOf(payload.getOrDefault("text", payload.getOrDefault("body", "")));
        
        Long explicitTaskId = null;
        if (payload.containsKey("taskId") && payload.get("taskId") != null) {
            try {
                explicitTaskId = Long.parseLong(String.valueOf(payload.get("taskId")));
            } catch (Exception ignored) {}
        }

        Map<String, Object> syncResult = processInboundResponse(from, subject, body, explicitTaskId, "email");
        return ResponseEntity.ok(syncResult);
    }

    // ── 2. Slack Events Webhook (Reactions & Thread Replies) ───────────────────

    @PostMapping("/slack/events")
    public ResponseEntity<?> handleSlackEvents(@RequestBody Map<String, Object> payload) {
        // Handle Slack URL Verification Challenge
        if ("url_verification".equals(payload.get("type"))) {
            return ResponseEntity.ok(Map.of("challenge", payload.getOrDefault("challenge", "")));
        }

        log.info("[Bi-Directional] Received Slack event: {}", payload);

        if ("event_callback".equals(payload.get("type"))) {
            @SuppressWarnings("unchecked")
            Map<String, Object> event = (Map<String, Object>) payload.get("event");
            if (event != null) {
                String eventType = String.valueOf(event.get("type"));

                // A. Slack Reaction Added (e.g. :white_check_mark:, :heavy_check_mark:, :done:)
                if ("reaction_added".equals(eventType)) {
                    String reaction = String.valueOf(event.get("reaction")).toLowerCase();
                    String user = String.valueOf(event.get("user"));
                    log.info("[Bi-Directional] Slack reaction added: {} by user {}", reaction, user);

                    if (isCompletionReaction(reaction)) {
                        TaskEntity task = findLatestOpenTaskForUser(user);
                        if (task != null) {
                            task.setStatus("done");
                            taskRepo.save(task);
                            log.info("[Bi-Directional] Task #{} marked done via Slack reaction :{}", task.getId(), reaction);
                            return ResponseEntity.ok(Map.of(
                                    "success", true,
                                    "action", "marked_done",
                                    "task_id", task.getId(),
                                    "task", task.getTask(),
                                    "channel", "slack_reaction"
                            ));
                        }
                    }
                }

                // B. Slack Message Reply in Thread
                if ("message".equals(eventType) && event.get("bot_id") == null) {
                    String text = String.valueOf(event.get("text"));
                    String user = String.valueOf(event.get("user"));
                    Map<String, Object> result = processInboundResponse(user, "Slack Reply", text, null, "slack");
                    return ResponseEntity.ok(result);
                }
            }
        }

        return ResponseEntity.ok(Map.of("received", true));
    }

    // ── 3. Interactive Simulation Endpoint (For UI testing) ────────────────────

    public record SimulationRequest(
            Long taskId,
            String channel,   // "email" | "slack"
            String responseText,
            String reaction
    ) {}

    @PostMapping("/simulate")
    public ResponseEntity<?> simulateBiDirectionalSync(@RequestBody SimulationRequest req) {
        log.info("[Bi-Directional] Simulating sync: {}", req);

        if (req.reaction() != null && !req.reaction().isBlank()) {
            if (isCompletionReaction(req.reaction())) {
                TaskEntity task = resolveTask(req.taskId(), null);
                if (task != null) {
                    task.setStatus("done");
                    taskRepo.save(task);
                    return ResponseEntity.ok(Map.of(
                            "success", true,
                            "action", "marked_done",
                            "task_id", task.getId(),
                            "task", task.getTask(),
                            "trigger", "Slack reaction :" + req.reaction() + ":"
                    ));
                }
            }
        }

        Map<String, Object> result = processInboundResponse("Gaurav", "Task Response", req.responseText(), req.taskId(), req.channel());
        return ResponseEntity.ok(result);
    }

    // ── Core Bi-Directional Logic ──────────────────────────────────────────────

    private Map<String, Object> processInboundResponse(String sender, String subject, String body, Long explicitTaskId, String channel) {
        String combined = (subject + " " + body).toLowerCase().trim();
        TaskEntity task = resolveTask(explicitTaskId, sender);

        if (task == null) {
            return Map.of(
                    "success", false,
                    "message", "No matching open task found for sender: " + sender
            );
        }

        // Case A: Completion Intent ("Done", "Deployed", "Finished", "Completed", "Fixed")
        if (isCompletionText(combined)) {
            task.setStatus("done");
            taskRepo.save(task);
            log.info("[Bi-Directional] Task #{} '{}' marked DONE via {}", task.getId(), task.getTask(), channel);
            return Map.of(
                    "success", true,
                    "action", "marked_done",
                    "task_id", task.getId(),
                    "task", task.getTask(),
                    "assignee", task.getAssignee(),
                    "status", "done",
                    "source", channel
            );
        }

        // Case B: Deadline Extension Intent ("Need 2 more days", "delay to Friday", "need more time")
        Integer daysExtension = extractDaysExtension(combined);
        if (daysExtension != null) {
            LocalDate baseDate = LocalDate.now();
            try {
                if (task.getDueDate() != null && !task.getDueDate().isBlank()) {
                    baseDate = LocalDate.parse(task.getDueDate());
                }
            } catch (Exception ignored) {}

            LocalDate newDate = baseDate.plusDays(daysExtension);
            String oldDate = task.getDueDate();
            task.setDueDate(newDate.toString());
            task.setStatus("pending_review"); // Flag for review with updated deadline
            taskRepo.save(task);

            log.info("[Bi-Directional] Task #{} deadline extended from {} to {} (+{} days) via {}",
                    task.getId(), oldDate, newDate, daysExtension, channel);

            return Map.of(
                    "success", true,
                    "action", "deadline_extended",
                    "task_id", task.getId(),
                    "task", task.getTask(),
                    "old_due_date", String.valueOf(oldDate),
                    "new_due_date", newDate.toString(),
                    "status", "pending_review",
                    "note", "Deadline extended by " + daysExtension + " days via " + channel + " reply",
                    "source", channel
            );
        }

        // Case C: General reply / Flag for Review
        task.setStatus("pending_review");
        taskRepo.save(task);
        return Map.of(
                "success", true,
                "action", "flagged_for_review",
                "task_id", task.getId(),
                "task", task.getTask(),
                "status", "pending_review",
                "message", "Reply received and held for review",
                "source", channel
        );
    }

    private boolean isCompletionText(String text) {
        return text.contains("done")
                || text.contains("completed")
                || text.contains("finished")
                || text.contains("deployed")
                || text.contains("fixed")
                || text.contains("resolved")
                || text.contains("closed")
                || text.contains("merged");
    }

    private boolean isCompletionReaction(String reaction) {
        return reaction.equals("white_check_mark")
                || reaction.equals("heavy_check_mark")
                || reaction.equals("check")
                || reaction.equals("done")
                || reaction.equals("+1")
                || reaction.equals("thumbsup")
                || reaction.equals("ok")
                || reaction.equals("yes");
    }

    private Integer extractDaysExtension(String text) {
        // Regex patterns for "need X days", "need X more days", "+X days", "delay X days"
        Pattern p = Pattern.compile("(?:need|delay|extend|require|give me)\\s+(\\d+)\\s+(?:more\\s+)?(?:day|days)", Pattern.CASE_INSENSITIVE);
        Matcher m = p.matcher(text);
        if (m.find()) {
            try {
                return Integer.parseInt(m.group(1));
            } catch (Exception ignored) {}
        }
        if (text.contains("tomorrow")) return 1;
        if (text.contains("next week")) return 7;
        return null;
    }

    private TaskEntity resolveTask(Long taskId, String sender) {
        if (taskId != null) {
            return taskRepo.findById(taskId).orElse(null);
        }
        return findLatestOpenTaskForUser(sender);
    }

    private TaskEntity findLatestOpenTaskForUser(String sender) {
        List<TaskEntity> open = taskRepo.findByStatusOrderByPriorityAscDueDateAsc("pending");
        if (open.isEmpty()) {
            open = taskRepo.findByStatusOrderByPriorityAscDueDateAsc("pending_review");
        }
        if (open.isEmpty()) return null;

        if (sender != null && !sender.isBlank()) {
            for (TaskEntity t : open) {
                if (t.getAssignee() != null && (
                        t.getAssignee().equalsIgnoreCase(sender) ||
                        sender.toLowerCase().contains(t.getAssignee().toLowerCase()) ||
                        t.getAssignee().toLowerCase().contains(sender.toLowerCase())
                )) {
                    return t;
                }
            }
        }
        return open.get(0);
    }
}
