package com.meetingai.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.meetingai.config.AppProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.HashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class VexaService {

    private static final Logger log = LoggerFactory.getLogger(VexaService.class);
    private static final Pattern MEET_PATTERN = Pattern.compile("https://meet\\.google\\.com/([a-zA-Z0-9\\-]+)");

    private final AppProperties appProperties;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public VexaService(AppProperties appProperties, RestClient restClient, ObjectMapper objectMapper) {
        this.appProperties = appProperties;
        this.restClient = restClient;
        this.objectMapper = objectMapper;
    }

    public String extractMeetingId(String meetingLink) {
        if (meetingLink == null || meetingLink.isBlank()) return null;
        Matcher matcher = MEET_PATTERN.matcher(meetingLink);
        if (matcher.find()) {
            return matcher.group(1);
        }
        if (meetingLink.contains("/")) {
            String lastPart = meetingLink.substring(meetingLink.lastIndexOf('/') + 1);
            if (lastPart.contains("-")) {
                return lastPart;
            }
        }
        return meetingLink;
    }

    public ResponseEntity<String> createBot(String meetingLink) {
        String meetingId = extractMeetingId(meetingLink);
        if (meetingId == null) {
            return ResponseEntity.badRequest().body("{\"error\": \"Invalid Google Meet URL format\"}");
        }

        String baseUrl = appProperties.getVexaBaseUrl();
        String apiKey = appProperties.getVexaApiKey();

        Map<String, Object> payload = new HashMap<>();
        payload.put("platform", "google_meet");
        payload.put("native_meeting_id", meetingId);
        payload.put("meeting_url", meetingLink);
        payload.put("language", "en");
        payload.put("bot_name", "Yobot");

        try {
            return restClient.post()
                    .uri(baseUrl + "/bots")
                    .header("X-API-Key", apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .toEntity(String.class);
        } catch (Exception e) {
            log.error("Error creating Vexa bot: {}", e.getMessage());
            return ResponseEntity.status(502).body("{\"error\": \"Cannot connect to Vexa API\", \"details\": \"" + e.getMessage() + "\"}");
        }
    }

    public ResponseEntity<String> fetchTranscript(String meetingId) {
        String baseUrl = appProperties.getVexaBaseUrl();
        String apiKey = appProperties.getVexaApiKey();

        try {
            return restClient.get()
                    .uri(baseUrl + "/transcripts/google_meet/" + meetingId)
                    .header("X-API-Key", apiKey)
                    .retrieve()
                    .toEntity(String.class);
        } catch (Exception e) {
            log.error("Error fetching transcript for {}: {}", meetingId, e.getMessage());
            return ResponseEntity.status(502).body("{\"error\": \"Failed to fetch transcript from Vexa\", \"details\": \"" + e.getMessage() + "\"}");
        }
    }

    public ResponseEntity<String> stopBot(String meetingId) {
        String baseUrl = appProperties.getVexaBaseUrl();
        String apiKey = appProperties.getVexaApiKey();

        try {
            return restClient.delete()
                    .uri(baseUrl + "/bots/google_meet/" + meetingId)
                    .header("X-API-Key", apiKey)
                    .retrieve()
                    .toEntity(String.class);
        } catch (Exception e) {
            log.error("Error stopping Vexa bot {}: {}", meetingId, e.getMessage());
            return ResponseEntity.status(502).body("{\"error\": \"Failed to stop Vexa bot\", \"details\": \"" + e.getMessage() + "\"}");
        }
    }

    /**
     * Registers (or fetches) a user on a self-hosted Vexa instance's admin API and mints an
     * API token for it — mirrors Python's /setup_vexa_admin, which called the same two
     * admin endpoints (POST /admin/users then POST /admin/users/{id}/tokens).
     */
    public Map<String, Object> setupAdmin(String baseUrl, String adminKey, String email, String name) {
        String normalizedBaseUrl = (baseUrl != null && baseUrl.endsWith("/"))
                ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;

        Map<String, Object> userPayload = new HashMap<>();
        userPayload.put("email", email);
        userPayload.put("name", name);
        userPayload.put("max_concurrent_bots", 5);

        Map<String, Object> userInfo;
        try {
            String userRes = restClient.post()
                    .uri(normalizedBaseUrl + "/admin/users")
                    .header("X-Admin-API-Key", adminKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(userPayload)
                    .retrieve()
                    .body(String.class);
            userInfo = objectMapper.readValue(userRes, Map.class);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to create/get Vexa user: " + e.getMessage(), e);
        }

        Object userId = userInfo.get("id");
        if (userId == null) {
            throw new IllegalStateException("Vexa admin API did not return a user id: " + userInfo);
        }

        Map<String, Object> tokenInfo;
        try {
            String tokenRes = restClient.post()
                    .uri(normalizedBaseUrl + "/admin/users/" + userId + "/tokens")
                    .header("X-Admin-API-Key", adminKey)
                    .retrieve()
                    .body(String.class);
            tokenInfo = objectMapper.readValue(tokenRes, Map.class);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to generate Vexa user API token: " + e.getMessage(), e);
        }

        Object apiToken = tokenInfo.get("token");
        if (apiToken == null) {
            throw new IllegalStateException("Vexa admin API did not return a token: " + tokenInfo);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("user_id", userId);
        result.put("api_token", apiToken.toString());
        result.put("base_url", normalizedBaseUrl);
        return result;
    }
}
