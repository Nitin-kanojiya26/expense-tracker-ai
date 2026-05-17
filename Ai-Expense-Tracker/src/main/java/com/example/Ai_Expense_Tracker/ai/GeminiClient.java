package com.example.Ai_Expense_Tracker.ai;

import com.google.gson.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class GeminiClient {

    @Value("${gemini.api.key}")
    private String apiKey;

    @Value("${gemini.api.url}")
    private String apiUrl;

    private final WebClient webClient;
    private final Gson gson;

    public GeminiClient(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.build();
        this.gson = new Gson(); // Reusable Gson instance
    }

    public String askGemini(String prompt) {
        try {
            String requestBody = buildRequestBody(prompt);
            log.info("Calling Gemini AI with prompt length: {}", prompt.length());

            // Safely appends query parameters without manual string concatenation
            String response = webClient.post()
                    .uri(apiUrl, uriBuilder -> uriBuilder
                            .queryParam("key", apiKey)
                            .build())
                    .header("Content-Type", "application/json")
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            log.info("Gemini responded successfully");
            return extractText(response);

        } catch (Exception e) {
            if (e.getMessage() != null && e.getMessage().contains("429")) {
                log.warn("Gemini rate limit hit - free tier limit reached");
                return "Rate limit reached. Please wait 1 minute and try again.";
            }
            log.error("Gemini API failed: {}", e.getMessage());
            return "AI service unavailable: " + e.getMessage();
        }
    }

    // Clean, readable request payload assembly using Java Maps/Lists
    private String buildRequestBody(String prompt) {
        var body = Map.of(
                "contents", List.of(
                        Map.of("parts", List.of(
                                Map.of("text", prompt)
                        ))
                )
        );
        return gson.toJson(body);
    }

    // Safely navigates the JSON payload with explicit validation checks
    private String extractText(String jsonResponse) {
        try {
            JsonObject responseObj = JsonParser.parseString(jsonResponse).getAsJsonObject();

            if (!responseObj.has("candidates") || responseObj.getAsJsonArray("candidates").isEmpty()) {
                log.warn("Gemini returned a response with no candidates. Check safety settings or prompt filter.");
                return "Could not generate content based on the input.";
            }

            return responseObj
                    .getAsJsonArray("candidates").get(0).getAsJsonObject()
                    .getAsJsonObject("content")
                    .getAsJsonArray("parts").get(0).getAsJsonObject()
                    .get("text").getAsString()
                    .trim();

        } catch (Exception e) {
            log.error("Failed to parse Gemini response: {}", e.getMessage());
            log.error("Raw response payload was: {}", jsonResponse);
            return "Could not read AI response";
        }
    }
}