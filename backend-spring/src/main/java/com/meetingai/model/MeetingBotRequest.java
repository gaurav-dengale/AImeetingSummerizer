package com.meetingai.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public class MeetingBotRequest {
    @JsonProperty("meeting_link")
    private String meetingLink;

    public String getMeetingLink() { return meetingLink; }
    public void setMeetingLink(String meetingLink) { this.meetingLink = meetingLink; }
}
