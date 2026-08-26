package com.meetingai.controller;

import com.meetingai.entity.MeetingEntity;
import com.meetingai.service.DatabaseService;
import com.meetingai.service.TemporalConflictService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/demo")
@CrossOrigin(origins = "*")
public class DemoSeedController {

    private final DatabaseService dbService;
    private final TemporalConflictService conflictService;

    public DemoSeedController(DatabaseService dbService, TemporalConflictService conflictService) {
        this.dbService = dbService;
        this.conflictService = conflictService;
    }

    /**
     * Seeds realistic sample meetings, conflicting tasks across meetings, and ADR decisions
     * so that the user can immediately test both patent-grade features in the UI.
     */
    @PostMapping("/seed")
    public ResponseEntity<?> seedDemoData() {
        String targetDue = LocalDate.now().plusDays(2).toString();

        // 1. Meeting A: Architecture & Cloud Migration
        MeetingEntity meetingA = dbService.saveMeeting(
                "demo-arch-" + System.currentTimeMillis() % 10000,
                "Q3 Core Architecture & Cloud Sync",
                "Discussed database migration strategy, caching layers, and high-load failover architecture.",
                "local",
                8
        );

        // Task for Alice in Meeting A
        dbService.saveTask(
                meetingA,
                "Alice Chen",
                "Migrate PostgreSQL schema and configure Redis clustering for high-throughput caching",
                targetDue,
                "pending",
                "critical",
                95,
                false,
                false
        );

        // Decision in Meeting A
        dbService.saveDecision(
                meetingA,
                "Adopt PostgreSQL with Read Replicas as primary transactional database",
                "Architecture",
                "Benchmarked against Cassandra; PostgreSQL provides required ACID guarantees and strict relational integrity for financial records.",
                95,
                "[\"Alice Chen\", \"David Kim\", \"Sarah Connor\"]",
                "[]"
        );

        // 2. Meeting B: Security & Payment Integration
        MeetingEntity meetingB = dbService.saveMeeting(
                "demo-sec-" + (System.currentTimeMillis() + 1) % 10000,
                "Payment Gateway & Auth Security Review",
                "Agreed on OAuth2 PKCE implementation, token refresh mechanisms, and audit ledger sealing.",
                "local",
                6
        );

        // Task for Alice in Meeting B (Same due date -> Collides with Meeting A!)
        dbService.saveTask(
                meetingB,
                "Alice Chen",
                "Implement OAuth2 PKCE authentication flow and JWT rotation across microservices",
                targetDue,
                "pending",
                "critical",
                92,
                false,
                false
        );

        // Decision in Meeting B
        dbService.saveDecision(
                meetingB,
                "Mandate OAuth2 PKCE flow for all third-party and web API integrations",
                "Security",
                "Mitigates authorization code interception attacks on public and single-page applications.",
                88,
                "[\"Sarah Connor\", \"Marcus Brody\"]",
                "[\"David Kim\"]"
        );

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Successfully seeded 2 meetings with conflicting tasks and cryptographic ADR decisions!",
                "active_conflicts", conflictService.detectCrossMeetingConflicts(),
                "decisions_count", dbService.getAllDecisions().size()
        ));
    }
}
