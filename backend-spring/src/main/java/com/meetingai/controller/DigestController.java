package com.meetingai.controller;

import com.meetingai.service.DigestService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/** #6 Recurring digest � manual trigger endpoint */
@RestController
@RequestMapping("/api/digest")
public class DigestController {

    private final DigestService digestService;
    public DigestController(DigestService digestService) { this.digestService = digestService; }

    @PostMapping("/trigger")
    public ResponseEntity<?> trigger() {
        digestService.triggerManually();
        return ResponseEntity.ok(Map.of("success", true, "message", "Digest triggered manually"));
    }
}
