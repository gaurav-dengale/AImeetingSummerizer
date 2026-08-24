package com.meetingai.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public class VexaAdminRequest {
    @JsonProperty("base_url")
    private String baseUrl = "http://localhost:8056";

    @JsonProperty("admin_key")
    private String adminKey = "token";

    private String email = "user@example.com";
    private String name = "John Doe";

    public String getBaseUrl() { return baseUrl; }
    public void setBaseUrl(String baseUrl) { this.baseUrl = baseUrl; }

    public String getAdminKey() { return adminKey; }
    public void setAdminKey(String adminKey) { this.adminKey = adminKey; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
}
