package com.meetingai.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "tasks")
public class TaskEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "meeting_id")
    private MeetingEntity meeting;

    private String assignee;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String task;

    @Column(name = "due_date")
    private String dueDate;

    /** pending | pending_review | done */
    private String status = "pending";

    /** critical | medium | low */
    private String priority = "medium";

    /** 0-100 AI confidence score */
    private int confidence = 50;

    @Column(name = "email_sent")
    private boolean emailSent = false;

    @Column(name = "slack_sent")
    private boolean slackSent = false;

    @Column(name = "email_failed")
    private boolean emailFailed = false;

    @Column(name = "slack_failed")
    private boolean slackFailed = false;

    @Column(name = "email_retry_count")
    private int emailRetryCount = 0;

    @Column(name = "slack_retry_count")
    private int slackRetryCount = 0;

    /** Cross-meeting task linking (#13) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "linked_task_id")
    private TaskEntity linkedTask;

    @Column(name = "link_type")
    private String linkType; // "update" | "continuation" | "completion"

    @Column(name = "created_at")
    private Instant createdAt = Instant.now();

    public TaskEntity() {}

    // -- Getters & Setters -----------------------------------------------------
    public Long getId() { return id; }
    public MeetingEntity getMeeting() { return meeting; }
    public void setMeeting(MeetingEntity meeting) { this.meeting = meeting; }
    public String getAssignee() { return assignee; }
    public void setAssignee(String assignee) { this.assignee = assignee; }
    public String getTask() { return task; }
    public void setTask(String task) { this.task = task; }
    public String getDueDate() { return dueDate; }
    public void setDueDate(String dueDate) { this.dueDate = dueDate; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }
    public int getConfidence() { return confidence; }
    public void setConfidence(int confidence) { this.confidence = confidence; }
    public boolean isEmailSent() { return emailSent; }
    public void setEmailSent(boolean emailSent) { this.emailSent = emailSent; }
    public boolean isSlackSent() { return slackSent; }
    public void setSlackSent(boolean slackSent) { this.slackSent = slackSent; }
    public boolean isEmailFailed() { return emailFailed; }
    public void setEmailFailed(boolean emailFailed) { this.emailFailed = emailFailed; }
    public boolean isSlackFailed() { return slackFailed; }
    public void setSlackFailed(boolean slackFailed) { this.slackFailed = slackFailed; }
    public int getEmailRetryCount() { return emailRetryCount; }
    public void setEmailRetryCount(int emailRetryCount) { this.emailRetryCount = emailRetryCount; }
    public int getSlackRetryCount() { return slackRetryCount; }
    public void setSlackRetryCount(int slackRetryCount) { this.slackRetryCount = slackRetryCount; }
    public TaskEntity getLinkedTask() { return linkedTask; }
    public void setLinkedTask(TaskEntity linkedTask) { this.linkedTask = linkedTask; }
    public String getLinkType() { return linkType; }
    public void setLinkType(String linkType) { this.linkType = linkType; }
    public Instant getCreatedAt() { return createdAt; }
}
