package com.example.Ai_Expense_Tracker.service;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class EmailService {

    private final JavaMailSender mailSender;
    private final WebClient webClient;

    // Accepts BREVO_API_KEY, brevo.api.key, or fallback to spring.mail.password
    @Value("${brevo.api.key:${BREVO_API_KEY:${spring.mail.password:}}}")
    private String brevoApiKey;

    // Sender email address - must be a verified sender in your Brevo account
    @Value("${mail.from.email:${MAIL_FROM:${spring.mail.username:}}}")
    private String fromEmail;

    // Display sender name
    @Value("${mail.from.name:${MAIL_FROM_NAME:SpentAI}}")
    private String fromName;

    public EmailService(JavaMailSender mailSender, WebClient.Builder webClientBuilder) {
        this.mailSender = mailSender;
        this.webClient = webClientBuilder.build();
    }

    public void sendOtpEmail(String toEmail, String otp) {
        log.info("Initiating OTP verification email to {}", toEmail);

        String sender = (fromEmail != null && !fromEmail.isBlank()) ? fromEmail.trim() : "no-reply@spentai.com";

        String textContent = "Hello,\n\n"
                + "Your OTP verification code is: " + otp + "\n\n"
                + "This code will expire in 5 minutes.\n"
                + "If you did not request this code, please ignore this email.\n\n"
                + "Best regards,\n"
                + fromName + " Team";

        String htmlContent = "<div style=\"font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;\">"
                + "<div style=\"text-align: center; margin-bottom: 24px;\">"
                + "<h2 style=\"color: #0f172a; margin: 0 0 6px; font-size: 22px; font-weight: 700;\">" + fromName + "</h2>"
                + "<p style=\"color: #64748b; font-size: 13px; margin: 0;\">AI Powered Expense Tracker</p>"
                + "</div>"
                + "<p style=\"color: #334155; font-size: 14px; line-height: 1.6; margin: 0 0 16px;\">Hello,</p>"
                + "<p style=\"color: #334155; font-size: 14px; line-height: 1.6; margin: 0 0 20px;\">Use the one-time verification code below to verify your email:</p>"
                + "<div style=\"text-align: center; margin: 24px 0;\">"
                + "<span style=\"display: inline-block; font-size: 32px; font-weight: 800; letter-spacing: 8px; padding: 14px 28px; background: #f8fafc; color: #0f172a; border-radius: 12px; border: 1.5px dashed #cbd5e1; font-family: monospace;\">"
                + otp
                + "</span>"
                + "</div>"
                + "<p style=\"color: #64748b; font-size: 13px; line-height: 1.6; margin: 0 0 20px;\">⏳ This code will expire in <strong>5 minutes</strong>. For your security, do not share this code with anyone.</p>"
                + "<hr style=\"border: none; border-top: 1px solid #f1f5f9; margin: 20px 0;\" />"
                + "<p style=\"color: #94a3b8; font-size: 11px; text-align: center; margin: 0; line-height: 1.5;\">If you did not request this email, no action is required.</p>"
                + "</div>";

        // Strategy 1: Brevo REST API via HTTPS (Port 443).
        // Works on Render Free Tier without SMTP port blocking.
        if (brevoApiKey != null && !brevoApiKey.isBlank()) {
            sendViaBrevoApi(toEmail, sender, textContent, htmlContent);
            return;
        }

        // Strategy 2: Fall back to SMTP relay
        sendViaSmtp(toEmail, sender, textContent, htmlContent);
    }

    private void sendViaBrevoApi(String toEmail, String sender, String textContent, String htmlContent) {
        log.info("Dispatching email via Brevo REST API (HTTPS port 443) to {}", toEmail);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("sender", Map.of("name", fromName, "email", sender));
        payload.put("to", List.of(Map.of("email", toEmail.trim())));
        payload.put("subject", "Your Verification Code - " + fromName);
        payload.put("htmlContent", htmlContent);
        payload.put("textContent", textContent);

        try {
            String response = webClient.post()
                    .uri("https://api.brevo.com/v3/smtp/email")
                    .header("api-key", brevoApiKey.trim())
                    .header("accept", "application/json")
                    .header("content-type", "application/json")
                    .bodyValue(payload)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(10))
                    .block();

            log.info("Brevo REST API delivered email successfully: {}", response);
        } catch (WebClientResponseException e) {
            String body = e.getResponseBodyAsString();
            log.error("Brevo REST API error (HTTP {}): {}", e.getStatusCode(), body);
            String detail = parseBrevoError(body, e.getMessage());
            throw new RuntimeException("Brevo API error: " + detail, e);
        } catch (Exception e) {
            log.error("Brevo REST API call failed: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to send email via Brevo API: " + e.getMessage(), e);
        }
    }

    private String parseBrevoError(String jsonBody, String fallback) {
        if (jsonBody == null || jsonBody.isBlank()) return fallback;
        try {
            JsonObject obj = JsonParser.parseString(jsonBody).getAsJsonObject();
            if (obj.has("message")) {
                return obj.get("message").getAsString();
            }
        } catch (Exception ignored) {}
        return jsonBody;
    }

    private void sendViaSmtp(String toEmail, String sender, String textContent, String htmlContent) {
        try {
            log.info("Sending email via SMTP relay to {}", toEmail);
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(sender, fromName);
            helper.setTo(toEmail.trim());
            helper.setSubject("Your Verification Code - " + fromName);
            helper.setText(textContent, htmlContent);

            mailSender.send(message);
            log.info("SMTP email successfully sent to {}", toEmail);
        } catch (Exception e) {
            log.error("SMTP delivery failed: {}", e.getMessage(), e);
            String errorMsg = e.getMessage() != null ? e.getMessage() : "";
            if (errorMsg.contains("timed out") || errorMsg.contains("timeout") || errorMsg.contains("Couldn't connect")) {
                throw new RuntimeException("Render free tier blocks SMTP ports (587/465). Please add BREVO_API_KEY in your Render environment variables.", e);
            }
            throw new RuntimeException("Failed to send OTP verification email: " + e.getMessage(), e);
        }
    }
}
