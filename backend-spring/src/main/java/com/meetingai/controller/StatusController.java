package com.meetingai.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.meetingai.config.AppProperties;
import com.meetingai.service.AiBridgeService;
import com.meetingai.service.ContactsService;
import com.meetingai.service.GoogleService;
import com.meetingai.service.SlackService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Backs the React dashboard's status badges (Slack/Google/Vexa configured, contacts count,
 * AI microservice health) — replaces the data that used to be injected into the Thymeleaf
 * dashboard.html model attributes.
 */
@RestController
public class StatusController {

    private final AppProperties appProperties;
    private final SlackService slackService;
    private final GoogleService googleService;
    private final ContactsService contactsService;
    private final AiBridgeService aiBridgeService;
    private final ObjectMapper objectMapper;

    public StatusController(AppProperties appProperties, SlackService slackService,
                            GoogleService googleService, ContactsService contactsService,
                            AiBridgeService aiBridgeService, ObjectMapper objectMapper) {
        this.appProperties = appProperties;
        this.slackService = slackService;
        this.googleService = googleService;
        this.contactsService = contactsService;
        this.aiBridgeService = aiBridgeService;
        this.objectMapper = objectMapper;
    }

    @GetMapping("/api/status")
    public Map<String, Object> status() {
        Object aiHealth;
        try {
            aiHealth = objectMapper.readValue(aiBridgeService.getHealth(), Object.class);
        } catch (Exception e) {
            aiHealth = Map.of("status", "DOWN");
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("vexaConfigured", appProperties.getVexaApiKey() != null && !appProperties.getVexaApiKey().isBlank());
        result.put("vexaBaseUrl", appProperties.getVexaBaseUrl());
        result.put("slackConfigured", slackService.isConnected());
        result.put("googleConfigured", googleService.hasValidToken() || googleService.hasCredentialsFile());
        result.put("contactsCount", contactsService.getAllContacts().size());
        result.put("aiServiceHealth", aiHealth);
        return result;
    }
}
