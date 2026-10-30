package com.example.Ai_Expense_Tracker.service;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    // Sender email address - in Brevo, this must match an authorized/verified sender in your Brevo account
    @Value("${mail.from.email:${spring.mail.username:}}")
    private String fromEmail;

    // Display sender name
    @Value("${mail.from.name:SpentAI}")
    private String fromName;

    public void sendOtpEmail(String toEmail, String otp) {
        log.info("Sending OTP verification email to {}", toEmail);
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            String sender = (fromEmail != null && !fromEmail.isBlank()) ? fromEmail.trim() : "no-reply@spentai.com";
            helper.setFrom(sender, fromName);
            helper.setTo(toEmail.trim());
            helper.setSubject("Your Verification Code - " + fromName);

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

            helper.setText(textContent, htmlContent);

            mailSender.send(message);
            log.info("OTP verification email successfully dispatched to {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send email to {}. Reason: {}", toEmail, e.getMessage(), e);
            throw new RuntimeException("Failed to send OTP verification email. Please check your Brevo mail credentials or verified sender: " + e.getMessage(), e);
        }
    }
}
