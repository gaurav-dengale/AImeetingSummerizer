package com.meetingai.service;

import com.meetingai.entity.TaskEntity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * #6 Recurring Task Digest � daily/weekly summary of all open tasks
 * sent via email and/or Slack.
 */
@Service
public class DigestService {

    private static final Logger log = LoggerFactory.getLogger(DigestService.class);

    private final DatabaseService db;
    private final GoogleService google;
    private final SlackService slack;

    @Value("${digest.schedule:OFF}")
    private String schedule;

    @Value("${digest.email:}")
    private String digestEmail;

    @Value("${digest.slack.channel:}")
    private String digestSlackChannel;

    public DigestService(DatabaseService db, GoogleService google, SlackService slack) {
        this.db = db; this.google = google; this.slack = slack;
    }

    /** Runs every day at 8 AM � only fires if schedule=DAILY */
    @Scheduled(cron = "0 0 8 * * *")
    public void dailyDigest() {
        if ("DAILY".equalsIgnoreCase(schedule)) sendDigest("Daily");
    }

    /** Runs every Monday at 8 AM � only fires if schedule=WEEKLY */
    @Scheduled(cron = "0 0 8 * * MON")
    public void weeklyDigest() {
        if ("WEEKLY".equalsIgnoreCase(schedule)) sendDigest("Weekly");
    }

    /** Manual trigger via API � POST /api/digest/trigger */
    public void triggerManually() {
        sendDigest("Manual");
    }

    private void sendDigest(String type) {
        List<TaskEntity> openTasks = db.getAllOpenTasks();
        if (openTasks.isEmpty()) {
            log.info("[Digest] {} digest triggered � no open tasks found.", type);
            return;
        }

        String subject = type + " Task Digest � " + openTasks.size() + " open task(s)";
        StringBuilder html = new StringBuilder();
        html.append("<html><body>");
        html.append("<h2>").append(type).append(" Open Task Digest</h2>");
        html.append("<p>You have <strong>").append(openTasks.size()).append("</strong> open tasks:</p>");
        html.append("<table border='1' cellpadding='8' style='border-collapse:collapse;width:100%'>");
        html.append("<tr style='background:#2196F3;color:white'><th>Task</th><th>Assignee</th><th>Due Date</th><th>Priority</th><th>Meeting</th></tr>");

        StringBuilder slackMsg = new StringBuilder("*").append(type).append(" Task Digest* � ")
                .append(openTasks.size()).append(" open task(s):\n\n");

        for (TaskEntity t : openTasks) {
            String priority = t.getPriority() != null ? t.getPriority() : "medium";
            String emoji = switch (priority) {
                case "critical" -> "??";
                case "medium"   -> "??";
                default         -> "??";
            };
            html.append("<tr><td>").append(t.getTask()).append("</td>")
                .append("<td>").append(t.getAssignee() != null ? t.getAssignee() : "�").append("</td>")
                .append("<td>").append(t.getDueDate() != null ? t.getDueDate() : "�").append("</td>")
                .append("<td>").append(priority).append("</td>")
                .append("<td>").append(t.getMeeting() != null ? t.getMeeting().getTitle() : "�").append("</td></tr>");

            slackMsg.append(emoji).append(" *").append(t.getTask()).append("*");
            if (t.getAssignee() != null) slackMsg.append(" ? ").append(t.getAssignee());
            if (t.getDueDate() != null) slackMsg.append(" (due: ").append(t.getDueDate()).append(")");
            slackMsg.append("\n");
        }
        html.append("</table></body></html>");

        // Send email digest
        if (digestEmail != null && !digestEmail.isBlank()) {
            boolean sent = google.sendRawEmail(digestEmail, subject, html.toString());
            log.info("[Digest] {} email digest {} to {}", type, sent ? "sent" : "FAILED", digestEmail);
        }

        // Send Slack digest
        if (digestSlackChannel != null && !digestSlackChannel.isBlank()) {
            boolean sent = slack.sendRawMessage(digestSlackChannel, slackMsg.toString());
            log.info("[Digest] {} Slack digest {} to channel {}", type, sent ? "sent" : "FAILED", digestSlackChannel);
        }

        log.info("[Digest] {} digest completed for {} open tasks.", type, openTasks.size());
    }
}
