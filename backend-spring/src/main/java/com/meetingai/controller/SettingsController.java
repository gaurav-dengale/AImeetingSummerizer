package com.meetingai.controller;

import com.meetingai.config.AppProperties;
import com.meetingai.model.VexaAdminRequest;
import com.meetingai.service.ContactsService;
import com.meetingai.service.SlackService;
import com.meetingai.service.VexaService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.io.File;
import java.util.Map;

@RestController
public class SettingsController {

    private final AppProperties appProperties;
    private final SlackService slackService;
    private final ContactsService contactsService;
    private final VexaService vexaService;

    public SettingsController(AppProperties appProperties, SlackService slackService,
                              ContactsService contactsService, VexaService vexaService) {
        this.appProperties = appProperties;
        this.slackService = slackService;
        this.contactsService = contactsService;
        this.vexaService = vexaService;
    }

    @PostMapping("/set_slack_token")
    public ResponseEntity<?> setSlackToken(@RequestBody Map<String, String> payload) {
        String token = payload.get("slack_token");
        if (token == null || token.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No Slack token provided"));
        }

        appProperties.setSlackBotToken(token);
        slackService.initClient();

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Slack token updated and client re-initialized successfully."
        ));
    }

    @PostMapping("/set_contacts_csv_path")
    public ResponseEntity<?> setContactsCsvPath(@RequestBody Map<String, String> payload) {
        String path = payload.get("csv_path");
        if (path == null || path.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No CSV path provided"));
        }

        File f = new File(path);
        if (!f.exists()) {
            return ResponseEntity.status(404).body(Map.of("error", "CSV file not found at " + path));
        }

        appProperties.setContactsCsvPath(path);
        var loaded = contactsService.loadContacts();

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Contacts CSV path updated to " + path,
                "contacts_count", loaded.size()
        ));
    }

    @PostMapping("/setup_vexa_admin")
    public ResponseEntity<?> setupVexaAdmin(@RequestBody VexaAdminRequest request) {
        try {
            Map<String, Object> result = vexaService.setupAdmin(
                    request.getBaseUrl(), request.getAdminKey(), request.getEmail(), request.getName());

            String apiToken = String.valueOf(result.get("api_token"));
            String baseUrl = String.valueOf(result.get("base_url"));

            appProperties.setVexaBaseUrl(baseUrl);
            appProperties.setVexaApiKey(apiToken);

            String maskedToken = apiToken.length() > 16
                    ? apiToken.substring(0, 8) + "..." + apiToken.substring(apiToken.length() - 8)
                    : apiToken;

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Successfully configured self-hosted Vexa. Created user '" + request.getEmail() + "' and generated API token.",
                    "user_id", result.get("user_id"),
                    "api_token", maskedToken,
                    "base_url", baseUrl
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Error setting up self-hosted Vexa: " + e.getMessage()));
        }
    }
}
