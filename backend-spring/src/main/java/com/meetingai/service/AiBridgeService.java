package com.meetingai.service;

import com.meetingai.config.AppProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Service
public class AiBridgeService {

    private static final Logger log = LoggerFactory.getLogger(AiBridgeService.class);
    private final AppProperties appProperties;
    private final RestClient restClient;

    public AiBridgeService(AppProperties appProperties, RestClient restClient) {
        this.appProperties = appProperties;
        this.restClient = restClient;
    }

    public String getHealth() {
        try {
            return restClient.get()
                    .uri(appProperties.getAiServiceUrl() + "/health")
                    .retrieve()
                    .body(String.class);
        } catch (Exception e) {
            return "{\"status\": \"DOWN\", \"error\": \"" + e.getMessage() + "\"}";
        }
    }

    public String processTranscriptWithAi(Map<String, Object> transcriptPayload) {
        try {
            return restClient.post()
                    .uri(appProperties.getAiServiceUrl() + "/ai/process_transcript")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(transcriptPayload)
                    .retrieve()
                    .body(String.class);
        } catch (Exception e) {
            log.error("Error calling Python AI microservice: {}", e.getMessage());
            return "{\"error\": \"AI microservice unavailable\", \"tasks\": [], \"scheduled_event\": null}";
        }
    }

    public String startLocalMicRecording() {
        try {
            return restClient.post()
                    .uri(appProperties.getAiServiceUrl() + "/audio/start")
                    .retrieve()
                    .body(String.class);
        } catch (Exception e) {
            log.error("Error starting mic recording in AI microservice: {}", e.getMessage());
            return "{\"error\": \"" + e.getMessage() + "\"}";
        }
    }

    public String stopAndAnalyzeLocalMic() {
        try {
            return restClient.post()
                    .uri(appProperties.getAiServiceUrl() + "/audio/stop")
                    .retrieve()
                    .body(String.class);
        } catch (Exception e) {
            log.error("Error stopping mic recording in AI microservice: {}", e.getMessage());
            return "{\"error\": \"" + e.getMessage() + "\"}";
        }
    }

    public String getLiveMicTranscript() {
        try {
            return restClient.get()
                    .uri(appProperties.getAiServiceUrl() + "/audio/live")
                    .retrieve()
                    .body(String.class);
        } catch (Exception e) {
            return "{\"is_recording\": false, \"segments\": []}";
        }
    }
}
