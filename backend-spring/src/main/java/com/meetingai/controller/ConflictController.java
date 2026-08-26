package com.meetingai.controller;

import com.meetingai.service.TemporalConflictService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/conflicts")
@CrossOrigin(origins = "*")
public class ConflictController {

    private final TemporalConflictService conflictService;

    public ConflictController(TemporalConflictService conflictService) {
        this.conflictService = conflictService;
    }

    @GetMapping
    public ResponseEntity<List<TemporalConflictService.TaskConflict>> getCrossMeetingConflicts() {
        return ResponseEntity.ok(conflictService.detectCrossMeetingConflicts());
    }

    @PostMapping("/resolve")
    public ResponseEntity<?> resolveConflict(@RequestBody Map<String, Object> body) {
        Object taskIdObj = body.get("taskId");
        Object newDueDateObj = body.get("newDueDate");

        if (taskIdObj == null || newDueDateObj == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "taskId and newDueDate are required"));
        }

        Long taskId = Long.parseLong(String.valueOf(taskIdObj));
        String newDueDate = String.valueOf(newDueDateObj);

        boolean success = conflictService.applyRebalance(taskId, newDueDate);
        if (!success) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Task #" + taskId + " deadline successfully rebalanced to " + newDueDate,
                "remaining_conflicts", conflictService.detectCrossMeetingConflicts()
        ));
    }
}
