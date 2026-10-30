package com.example.Ai_Expense_Tracker.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
public class HealthController {

    private final Instant startTime = Instant.now();

    /**
     * Health check endpoint used by UptimeRobot, Render, or external monitoring
     * to keep the service awake and verify backend availability.
     */
    @GetMapping({"/health", "/api/health"})
    public ResponseEntity<Map<String, Object>> healthCheck() {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "UP");
        response.put("service", "Ai-Expense-Tracker-Backend");
        response.put("timestamp", Instant.now().toString());
        response.put("uptimeSeconds", java.time.Duration.between(startTime, Instant.now()).getSeconds());
        return ResponseEntity.ok(response);
    }
}

