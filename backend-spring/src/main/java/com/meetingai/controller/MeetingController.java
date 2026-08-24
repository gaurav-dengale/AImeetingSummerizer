package com.meetingai.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.meetingai.config.AppProperties;
import com.meetingai.model.Contact;
import com.meetingai.model.MeetingBotRequest;
import com.meetingai.service.AiBridgeService;
import com.meetingai.service.ContactsService;
import com.meetingai.service.GoogleService;
import com.meetingai.service.SlackService;
import com.meetingai.service.VexaService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
public class MeetingController {

    private static final Logger log = LoggerFactory.getLogger(MeetingController.class);

    private final VexaService vexaService;
    private final AiBridgeService aiBridgeService;
    private final SlackService slackService;
    private final GoogleService googleService;
    private final ContactsService contactsService;
    private final AppProperties appProperties;
    private final ObjectMapper objectMapper;

    private String currentMeetingId;

    public MeetingController(VexaService vexaService, AiBridgeService aiBridgeService,
                             SlackService slackService, GoogleService googleService,
                             ContactsService contactsService, AppProperties appProperties,
                             ObjectMapper objectMapper) {
        this.vexaService = vexaService;
        this.aiBridgeService = aiBridgeService;
        this.slackService = slackService;
        this.googleService = googleService;
        this.contactsService = contactsService;
        this.appProperties = appProperties;
        this.objectMapper = objectMapper;
    }

    @PostMapping(value = "/create_bot", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> createBot(@RequestBody MeetingBotRequest request) {
        if (appProperties.getVexaApiKey() == null || appProperties.getVexaApiKey().isBlank()) {
            Map<String, String> err = new HashMap<>();
            err.put("error", "Vexa API key not configured.");
            err.put("message", "Please configure your VEXA_API_KEY in settings first.");
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(err);
        }

        if (request.getMeetingLink() == null || request.getMeetingLink().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Meeting link is required"));
        }

        ResponseEntity<String> res = vexaService.createBot(request.getMeetingLink());
        if (res.getStatusCode().is2xxSuccessful()) {
            this.currentMeetingId = vexaService.extractMeetingId(request.getMeetingLink());
        }
        return res;
    }

    @GetMapping(value = "/fetch_transcript", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> fetchTranscript(@RequestParam(value = "meeting_id", required = false) String meetingIdParam) {
        String meetingId = (meetingIdParam != null && !meetingIdParam.isBlank()) ? meetingIdParam : this.currentMeetingId;
        if (meetingId == null || meetingId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No meeting ID found. Please create a bot first."));
        }

        ResponseEntity<String> transcriptRes = vexaService.fetchTranscript(meetingId);
        if (!transcriptRes.getStatusCode().is2xxSuccessful()) {
            return transcriptRes;
        }

        try {
            Map<String, Object> transcriptMap = objectMapper.readValue(transcriptRes.getBody(), Map.class);
            String aiResultJson = aiBridgeService.processTranscriptWithAi(transcriptMap);
            Map<String, Object> aiResults = objectMapper.readValue(aiResultJson, Map.class);

            enrichAndDispatch(aiResults);

            Map<String, Object> combined = new HashMap<>();
            combined.put("meeting_id", meetingId);
            combined.put("transcript", transcriptMap);
            combined.put("processing_results", aiResults);
            combined.put("has_google_credentials", googleService.hasValidToken());
            combined.put("has_slack_integration", slackService.isConnected());

            return ResponseEntity.ok(combined);
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("raw_transcript", transcriptRes.getBody(), "error", e.getMessage()));
        }
    }

    @PostMapping(value = "/stop_bot", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> stopBot(@RequestParam(value = "meeting_id", required = false) String meetingIdParam) {
        String meetingId = (meetingIdParam != null && !meetingIdParam.isBlank()) ? meetingIdParam : this.currentMeetingId;
        if (meetingId == null || meetingId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No active meeting ID found."));
        }

        ResponseEntity<String> res = vexaService.stopBot(meetingId);
        if (res.getStatusCode().is2xxSuccessful()) {
            this.currentMeetingId = null;
        }
        return res;
    }

    @PostMapping(value = "/start_local_recording", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> startLocalRecording() {
        String result = aiBridgeService.startLocalMicRecording();
        return ResponseEntity.ok(result);
    }

    @PostMapping(value = "/stop_and_analyze_local", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> stopAndAnalyzeLocal() {
        String resultJson = aiBridgeService.stopAndAnalyzeLocalMic();
        try {
            Map<String, Object> resultMap = objectMapper.readValue(resultJson, Map.class);

            Object aiResultObj = resultMap.get("ai_result");
            if (aiResultObj instanceof Map) {
                @SuppressWarnings("unchecked")
                Map<String, Object> aiResult = (Map<String, Object>) aiResultObj;
                enrichAndDispatch(aiResult);
            }

            resultMap.put("has_google_credentials", googleService.hasValidToken());
            resultMap.put("has_slack_integration", slackService.isConnected());

            return ResponseEntity.ok(resultMap);
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("error", e.getMessage(), "raw", resultJson));
        }
    }

    @GetMapping(value = "/get_live_transcript", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> getLiveTranscript() {
        String result = aiBridgeService.getLiveMicTranscript();
        return ResponseEntity.ok(result);
    }

    /**
     * Mirrors the "reduce phase" that used to live in Python's process_transcript_with_groq:
     * for every task the AI detected, look up the assignee in contacts and immediately send
     * email/Slack; for a detected scheduling intent, immediately create the Calendar event.
     * Mutates aiResults in place so both /fetch_transcript and /stop_and_analyze_local reuse it.
     */
    @SuppressWarnings("unchecked")
    private void enrichAndDispatch(Map<String, Object> aiResults) {
        Object tasksObj = aiResults.get("tasks");
        if (tasksObj instanceof List<?> tasksList) {
            for (Object taskObj : tasksList) {
                if (!(taskObj instanceof Map)) continue;
                Map<String, Object> task = (Map<String, Object>) taskObj;

                task.put("email_sent", false);
                task.put("slack_sent", false);

                String assignee = str(task.get("assignee"));
                String taskDesc = str(task.get("task"));
                String dueDate = str(task.get("due_date"));

                if (assignee == null || assignee.isBlank() || taskDesc == null || taskDesc.isBlank()) {
                    continue;
                }

                Optional<Contact> contactOpt = contactsService.findContact(assignee);
                if (contactOpt.isEmpty()) {
                    log.info("No matching contact found for assignee '{}'", assignee);
                    continue;
                }

                Contact contact = contactOpt.get();

                if (contact.getEmail() != null && !contact.getEmail().isBlank()) {
                    boolean sent = googleService.sendTaskEmail(contact.getName(), contact.getEmail(), taskDesc, dueDate);
                    task.put("email_sent", sent);
                }

                if (contact.getSlackId() != null && !contact.getSlackId().isBlank()) {
                    boolean sent = slackService.sendSlackMessage(contact.getSlackId(), contact.getName(), taskDesc, dueDate);
                    task.put("slack_sent", sent);
                }
            }
        }

        Object scheduledEventObj = aiResults.get("scheduled_event");
        if (scheduledEventObj instanceof Map) {
            Map<String, Object> event = (Map<String, Object>) scheduledEventObj;

            String title = str(event.get("event_title"));
            String startTime = str(event.get("start_time"));
            String endTime = str(event.get("end_time"));
            String location = str(event.get("location"));
            String notes = str(event.get("notes"));

            List<String> attendees = new ArrayList<>();
            Object attendeesObj = event.get("attendees");
            if (attendeesObj instanceof List<?> list) {
                for (Object a : list) {
                    if (a != null) attendees.add(a.toString());
                }
            }

            if (startTime != null && endTime != null) {
                String link = googleService.createCalendarEvent(
                        title != null ? title : "Meeting from transcript",
                        startTime, endTime, attendees, location, notes);
                event.put("link", link);
                aiResults.put("scheduled_event_created", link != null);
            }
        }
    }

    private static String str(Object o) {
        return o == null ? null : o.toString();
    }
}
