package com.meetingai.controller;

import com.meetingai.entity.DecisionEntity;
import com.meetingai.service.DatabaseService;
import com.meetingai.service.DecisionReversalService;
import com.meetingai.service.DecisionReversalService.ReversalCandidate;
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
    private final DecisionReversalService reversalService;

    public DecisionController(DatabaseService dbService, DecisionReversalService reversalService) {
        this.dbService = dbService;
        this.reversalService = reversalService;
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

    // ── Decision Reversal & Supersession Tracker (Patent Feature #5) ──

    /**
     * Detect potential reversals for a given decision text.
     * POST /api/decisions/detect-reversals
     * Body: { "decision": "...", "category": "...", "semantic_fingerprint": "..." }
     */
    @PostMapping("/detect-reversals")
    public ResponseEntity<?> detectReversals(@RequestBody Map<String, String> body) {
        String decision = body.get("decision");
        String category = body.getOrDefault("category", "General");
        String fingerprint = body.get("semantic_fingerprint");

        if (decision == null || decision.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "decision text is required"));
        }

        List<ReversalCandidate> candidates = reversalService.detectReversals(decision, category, fingerprint);

        return ResponseEntity.ok(Map.of(
                "reversals_detected", !candidates.isEmpty(),
                "count", candidates.size(),
                "candidates", candidates
        ));
    }

    /**
     * Apply a supersession: mark an original decision as superseded by a newer one.
     * POST /api/decisions/supersede
     * Body: { "originalDecisionId": 1, "newDecisionId": 5 }
     */
    @PostMapping("/supersede")
    public ResponseEntity<?> supersedeDecision(@RequestBody Map<String, Object> body) {
        Long originalId = toLong(body.get("originalDecisionId"));
        Long newId = toLong(body.get("newDecisionId"));

        if (originalId == null || newId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "originalDecisionId and newDecisionId are required"));
        }

        Map<String, Object> result = reversalService.applySuperSession(originalId, newId);
        return ResponseEntity.ok(result);
    }

    /**
     * Mark two decisions as coexisting (dismiss false-positive reversal).
     * POST /api/decisions/coexist
     * Body: { "decisionId1": 1, "decisionId2": 5 }
     */
    @PostMapping("/coexist")
    public ResponseEntity<?> markCoexisting(@RequestBody Map<String, Object> body) {
        Long id1 = toLong(body.get("decisionId1"));
        Long id2 = toLong(body.get("decisionId2"));

        if (id1 == null || id2 == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "decisionId1 and decisionId2 are required"));
        }

        Map<String, Object> result = reversalService.markAsCoexisting(id1, id2);
        return ResponseEntity.ok(result);
    }

    /**
     * Get the Decision Stability Index for the organization.
     * GET /api/decisions/stability
     */
    @GetMapping("/stability")
    public ResponseEntity<?> getStabilityIndex() {
        return ResponseEntity.ok(reversalService.computeStabilityIndex());
    }

    /**
     * Get the full supersession chain for a specific decision.
     * GET /api/decisions/{id}/chain
     */
    @GetMapping("/{id}/chain")
    public ResponseEntity<?> getSupersessionChain(@PathVariable Long id) {
        List<Map<String, Object>> chain = reversalService.getSupersessionChain(id);
        return ResponseEntity.ok(Map.of(
                "decision_id", id,
                "chain_length", chain.size(),
                "chain", chain
        ));
    }

    private Long toLong(Object o) {
        if (o == null) return null;
        try { return Long.parseLong(o.toString()); } catch (Exception e) { return null; }
    }
}

