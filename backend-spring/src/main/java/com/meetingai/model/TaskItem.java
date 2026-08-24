package com.meetingai.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public class TaskItem {
    private String assignee;
    private String task;
    
    @JsonProperty("due_date")
    private String dueDate;

    public TaskItem() {}

    public TaskItem(String assignee, String task, String dueDate) {
        this.assignee = assignee;
        this.task = task;
        this.dueDate = dueDate;
    }

    public String getAssignee() { return assignee; }
    public void setAssignee(String assignee) { this.assignee = assignee; }

    public String getTask() { return task; }
    public void setTask(String task) { this.task = task; }

    public String getDueDate() { return dueDate; }
    public void setDueDate(String dueDate) { this.dueDate = dueDate; }
}
