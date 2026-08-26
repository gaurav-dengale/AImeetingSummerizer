package com.meetingai.controller;

import com.meetingai.entity.DecisionEntity;
import com.meetingai.service.DatabaseService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/decisions")
@CrossOrigin(origins = "*")
public class DecisionController {

    private final DatabaseService dbService;

    public DecisionController(DatabaseService dbService) {
        this.dbService = dbService;
    }

    @GetMapping
    public ResponseEntity<List<DecisionEntity>> getAllDecisions() {
        return ResponseEntity.ok(dbService.getAllDecisions());
    }

    @GetMapping("/meeting/{meetingId}")
    public ResponseEntity<List<DecisionEntity>> getMeetingDecisions(@PathVariable Long meetingId) {
        return ResponseEntity.ok(dbService.getDecisionsForMeeting(meetingId));
    }

    @PostMapping("/verify")
    public ResponseEntity<?> verifyProvenanceHash(@RequestBody Map<String, String> body) {
        String hash = body.get("hash");
        if (hash == null || hash.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "hash parameter is required"));
        }

        Optional<DecisionEntity> opt = dbService.getDecisionByHash(hash);
        if (opt.isEmpty()) {
            return ResponseEntity.ok(Map.of(
                    "verified", false,
                    "message", "No matching decision found for SHA-256 hash."
            ));
        }

        DecisionEntity d = opt.get();
        String computed = d.computeProvenanceHash();
        boolean valid = computed.equalsIgnoreCase(d.getProvenanceHash()) || hash.equalsIgnoreCase(d.getProvenanceHash());

        return ResponseEntity.ok(Map.of(
                "verified", valid,
                "decision_id", d.getId(),
                "decision", d.getDecision(),
                "category", d.getCategory(),
                "consensus_score", d.getConsensusScore(),
                "status", d.getStatus(),
                "timestamp", d.getCreatedAt(),
                "hash", d.getProvenanceHash()
        ));
    }
}
