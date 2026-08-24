package com.meetingai.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.meetingai.config.AppProperties;
import com.meetingai.entity.MeetingEntity;
import com.meetingai.entity.TaskEntity;
import com.meetingai.model.Contact;
import com.meetingai.model.MeetingBotRequest;
import com.meetingai.service.AiBridgeService;
import com.meetingai.service.ContactsService;
import com.meetingai.service.DatabaseService;
import com.meetingai.service.GoogleService;
import com.meetingai.service.SlackService;
import com.meetingai.service.VexaService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

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
    private final DatabaseService databaseService;

    @Value("${dispatch.confidence.auto.threshold:80}")
    private int confidenceThreshold;

    private String currentMeetingId;

    public MeetingController(VexaService vexaService, AiBridgeService aiBridgeService,
                             SlackService slackService, GoogleService googleService,
                             ContactsService contactsService, AppProperties appProperties,
                             ObjectMapper objectMapper, DatabaseService databaseService) {
        this.vexaService = vexaService;
        this.aiBridgeService = aiBridgeService;
        this.slackService = slackService;
        this.googleService = googleService;
        this.contactsService = contactsService;
        this.appProperties = appProperties;
        this.objectMapper = objectMapper;
        this.databaseService = databaseService;
    }

    @PostMapping(value = "/create_bot", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> createBot(@RequestBody MeetingBotRequest request) {
        if (appProperties.getVexaApiKey() == null || appProperties.getVexaApiKey().isBlank()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(
                Map.of("error", "Vexa API key not configured.",
                       "message", "Please configure your VEXA_API_KEY in settings first."));
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
        if (!transcriptRes.getStatusCode().is2xxSuccessful()) return transcriptRes;
        try {
            Map<String, Object> transcriptMap = objectMapper.readValue(transcriptRes.getBody(), Map.class);
            String aiResultJson = aiBridgeService.processTranscriptWithAi(transcriptMap);
            Map<String, Object> aiResults = objectMapper.readValue(aiResultJson, Map.class);
            int segmentCount = 0;
            Object segs = transcriptMap.get("segments");
            if (segs instanceof List<?> l) segmentCount = l.size();
            enrichAndDispatch(aiResults, meetingId, "vexa", segmentCount);
            Map<String, Object> combined = new HashMap<>();
            combined.put("meeting_id", meetingId);
            combined.put("transcript", transcriptMap);
            combined.put("processing_results", aiResults);
            combined.put("has_google_credentials", googleService.hasValidToken());
            combined.put("has_slack_integration", slackService.isConnected());
            combined.put("pending_review_count", databaseService.countPendingReview());
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
        if (res.getStatusCode().is2xxSuccessful()) this.currentMeetingId = null;
        return res;
    }

    @PostMapping(value = "/start_local_recording", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> startLocalRecording() {
        return ResponseEntity.ok(aiBridgeService.startLocalMicRecording());
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
                String localId = "local-" + UUID.randomUUID().toString().substring(0, 8);
                Object segs = resultMap.get("transcript");
                int segCount = 0;
                if (segs instanceof Map<?,?> tMap) {
                    Object segList = tMap.get("segments");
                    if (segList instanceof List<?> l) segCount = l.size();
                }
                enrichAndDispatch(aiResult, localId, "local", segCount);
            }
            resultMap.put("has_google_credentials", googleService.hasValidToken());
            resultMap.put("has_slack_integration", slackService.isConnected());
            resultMap.put("pending_review_count", databaseService.countPendingReview());
            return ResponseEntity.ok(resultMap);
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("error", e.getMessage(), "raw", resultJson));
        }
    }

    @GetMapping(value = "/get_live_transcript", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> getLiveTranscript() {
        return ResponseEntity.ok(aiBridgeService.getLiveMicTranscript());
    }

    @SuppressWarnings("unchecked")
    private void enrichAndDispatch(Map<String, Object> aiResults, String meetingId,
                                   String source, int segmentCount) {
        String summary = str(aiResults.get("summary"));
        MeetingEntity meeting = databaseService.saveMeeting(
            meetingId, "Meeting " + meetingId, summary, source, segmentCount);

        Object tasksObj = aiResults.get("tasks");
        if (tasksObj instanceof List<?> tasksList) {
            for (Object taskObj : tasksList) {
                if (!(taskObj instanceof Map)) continue;
                Map<String, Object> task = (Map<String, Object>) taskObj;
                task.put("email_sent", false);
                task.put("slack_sent", false);
                task.put("email_failed", false);
                task.put("slack_failed", false);
                String assignee = str(task.get("assignee"));
                String taskDesc = str(task.get("task"));
                String dueDate  = str(task.get("due_date"));
                String priority = str(task.get("priority"));
                int confidence  = toInt(task.get("confidence"), 50);
                if (taskDesc == null || taskDesc.isBlank()) continue;
                boolean autoDispatch = confidence >= confidenceThreshold;
                String status = autoDispatch ? "pending" : "pending_review";
                task.put("status", status);
                task.put("confidence", confidence);
                task.put("priority", priority != null ? priority : "medium");
                boolean emailSent = false, slackSent = false;
                if (autoDispatch && assignee != null && !assignee.isBlank()) {
                    Optional<Contact> contactOpt = contactsService.findContact(assignee);
                    if (contactOpt.isPresent()) {
                        Contact contact = contactOpt.get();
                        if (contact.getEmail() != null && !contact.getEmail().isBlank()) {
                            emailSent = googleService.sendTaskEmail(
                                contact.getName(), contact.getEmail(), taskDesc, dueDate);
                            task.put("email_sent", emailSent);
                            task.put("email_failed", !emailSent);
                        }
                        if (contact.getSlackId() != null && !contact.getSlackId().isBlank()) {
                            slackSent = slackService.sendSlackMessage(
                                contact.getSlackId(), contact.getName(), taskDesc, dueDate);
                            task.put("slack_sent", slackSent);
                            task.put("slack_failed", !slackSent);
                        }
                    }
                } else if (!autoDispatch) {
                    log.info("Task held for HITL review (confidence={}%): {}", confidence, taskDesc);
                }
                TaskEntity saved = databaseService.saveTask(
                    meeting, assignee, taskDesc, dueDate, status,
                    priority != null ? priority : "medium", confidence, emailSent, slackSent);
                task.put("db_id", saved.getId());
            }
        }

        Object scheduledEventObj = aiResults.get("scheduled_event");
        if (scheduledEventObj instanceof Map) {
            Map<String, Object> event = (Map<String, Object>) scheduledEventObj;
            String title     = str(event.get("event_title"));
            String startTime = str(event.get("start_time"));
            String endTime   = str(event.get("end_time"));
            String location  = str(event.get("location"));
            String notes     = str(event.get("notes"));
            List<String> attendees = new ArrayList<>();
            Object attendeesObj = event.get("attendees");
            if (attendeesObj instanceof List<?> list) {
                for (Object a : list) if (a != null) attendees.add(a.toString());
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

    private static String str(Object o) { return o == null ? null : o.toString(); }
    private static int toInt(Object o, int def) {
        if (o == null) return def;
        try { return Integer.parseInt(o.toString()); } catch (Exception e) { return def; }
    }
}