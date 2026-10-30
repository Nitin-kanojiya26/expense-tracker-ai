package com.example.Ai_Expense_Tracker.service;

import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class EmailService {

    private final JavaMailSender mailSender;
    private final WebClient webClient;

    // Brevo API Key (for sending over HTTPS port 443 - bypasses Render SMTP port blocks)
    @Value("${brevo.api.key:${BREVO_API_KEY:}}")
    private String brevoApiKey;

    // Sender email address - must be verified in Brevo
    @Value("${mail.from.email:${spring.mail.username:}}")
    private String fromEmail;

    // Display sender name
    @Value("${mail.from.name:SpentAI}")
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
        // Essential on Render Free tier where outbound SMTP (ports 25, 465, 587) is blocked.
        if (brevoApiKey != null && !brevoApiKey.isBlank()) {
            boolean success = sendViaBrevoApi(toEmail, sender, textContent, htmlContent);
            if (success) {
                return;
            }
        }

        // Strategy 2: Fall back to SMTP relay
        sendViaSmtp(toEmail, sender, textContent, htmlContent);
    }

    private boolean sendViaBrevoApi(String toEmail, String sender, String textContent, String htmlContent) {
        try {
            log.info("Sending email via Brevo REST API (HTTPS port 443) to {}", toEmail);

            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("sender", Map.of("name", fromName, "email", sender));
            payload.put("to", List.of(Map.of("email", toEmail.trim())));
            payload.put("subject", "Your Verification Code - " + fromName);
            payload.put("htmlContent", htmlContent);
            payload.put("textContent", textContent);

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
            return true;
        } catch (Exception e) {
            log.error("Brevo REST API call failed: {}. Falling back to SMTP...", e.getMessage());
            return false;
        }
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
                throw new RuntimeException("SMTP connection timed out. On Render Free tier, SMTP ports are blocked. Please add BREVO_API_KEY in Render environment variables to send via HTTPS.", e);
            }
            throw new RuntimeException("Failed to send OTP verification email: " + e.getMessage(), e);
        }
    }
}
