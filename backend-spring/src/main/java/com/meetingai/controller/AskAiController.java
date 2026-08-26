package com.meetingai.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.meetingai.entity.MeetingEntity;
import com.meetingai.service.AiBridgeService;
import com.meetingai.service.DatabaseService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/meetings/ask")
@CrossOrigin(origins = "*")
public class AskAiController {

    private final AiBridgeService aiBridgeService;
    private final DatabaseService dbService;
    private final ObjectMapper objectMapper;

    public AskAiController(AiBridgeService aiBridgeService, DatabaseService dbService, ObjectMapper objectMapper) {
        this.aiBridgeService = aiBridgeService;
        this.dbService = dbService;
        this.objectMapper = objectMapper;
    }

    @PostMapping
    public ResponseEntity<?> askMeeting(@RequestBody Map<String, Object> body) {
        String query = String.valueOf(body.getOrDefault("query", ""));
        if (query.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Query parameter is required"));
        }

        Object meetingIdObj = body.get("meetingId");
        StringBuilder context = new StringBuilder();

        if (meetingIdObj != null && !String.valueOf(meetingIdObj).isBlank()) {
            Long meetingId = Long.parseLong(String.valueOf(meetingIdObj));
            Optional<MeetingEntity> opt = dbService.getMeeting(meetingId);
            if (opt.isPresent()) {
                MeetingEntity m = opt.get();
                context.append("Meeting Title: ").append(m.getTitle()).append("\n");
                context.append("Summary: ").append(m.getSummary()).append("\n");
                context.append("Decisions: \n");
                dbService.getDecisionsForMeeting(meetingId).forEach(d -> {
                    context.append("- ").append(d.getDecision()).append(" (Consensus: ").append(d.getConsensusScore()).append("%)\n");
                });
                context.append("Tasks: \n");
                dbService.getTasksForMeeting(meetingId).forEach(t -> {
                    context.append("- ").append(t.getAssignee()).append(": ").append(t.getTask()).append(" (Due: ").append(t.getDueDate()).append(")\n");
                });
            }
        } else {
            // Global context across all past meetings
            List<MeetingEntity> all = dbService.listMeetings();
            for (MeetingEntity m : all) {
                context.append("--- Meeting: ").append(m.getTitle()).append(" ---\n");
                context.append("Summary: ").append(m.getSummary()).append("\n");
            }
            context.append("\nAll Corporate Decisions:\n");
            dbService.getAllDecisions().forEach(d -> {
                context.append("- [").append(d.getCategory()).append("] ").append(d.getDecision()).append(" (Score: ").append(d.getConsensusScore()).append("%)\n");
            });
        }

        String rawAi = aiBridgeService.askMeetingAi(query, context.toString());
        try {
            Map<String, Object> map = objectMapper.readValue(rawAi, Map.class);
            return ResponseEntity.ok(map);
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of(
                    "answer", rawAi,
                    "key_citations", List.of(),
                    "related_action_items", List.of(),
                    "confidence", 85
            ));
        }
    }
}
