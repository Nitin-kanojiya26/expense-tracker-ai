package com.example.Ai_Expense_Tracker.service;

import com.example.Ai_Expense_Tracker.entity.OtpToken;
import com.example.Ai_Expense_Tracker.repository.OtpTokenRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class OtpService {

    private final OtpTokenRepository otpTokenRepository;
    private final EmailService emailService;
    private static final int OTP_VALID_DURATION = 5; // minutes

    @Transactional
    public void generateAndSendOtp(String email) {
        // Delete any existing OTP for this email
        otpTokenRepository.deleteByEmail(email);

        String otp = generateRandomOtp();
        LocalDateTime expiryDate = LocalDateTime.now().plusMinutes(OTP_VALID_DURATION);

        OtpToken otpToken = new OtpToken(email, otp, expiryDate);
        otpTokenRepository.save(otpToken);

        emailService.sendOtpEmail(email, otp);
    }

    public boolean verifyOtp(String email, String otp) {
        Optional<OtpToken> otpTokenOpt = otpTokenRepository.findByEmailAndOtp(email, otp);

        if (otpTokenOpt.isPresent()) {
            OtpToken otpToken = otpTokenOpt.get();
            if (!otpToken.isExpired()) {
                otpTokenRepository.deleteByEmail(email); // OTP used, so delete it
                return true;
            } else {
                otpTokenRepository.deleteByEmail(email); // Clean up expired token
            }
        }
        return false;
    }

    private String generateRandomOtp() {
        SecureRandom random = new SecureRandom();
        int otpNum = 100000 + random.nextInt(900000);
        return String.valueOf(otpNum);
    }
}
