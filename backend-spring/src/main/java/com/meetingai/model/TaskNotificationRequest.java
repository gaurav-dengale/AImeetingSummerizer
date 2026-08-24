package com.meetingai.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public class TaskNotificationRequest {
    @JsonProperty("recipient_name")
    private String recipientName;

    private String task;

    @JsonProperty("due_date")
    private String dueDate;

    public String getRecipientName() { return recipientName; }
    public void setRecipientName(String recipientName) { this.recipientName = recipientName; }

    public String getTask() { return task; }
    public void setTask(String task) { this.task = task; }

    public String getDueDate() { return dueDate; }
    public void setDueDate(String dueDate) { this.dueDate = dueDate; }
}
