package dev.rawad.taxi.auth.token;

import java.security.SecureRandom;

import org.springframework.stereotype.Service;

import dev.rawad.taxi.auth.entities.UserEntity;
import dev.rawad.taxi.auth.entities.redis.AuthRedis;
import dev.rawad.taxi.auth.enums.AuthRedisType;
import dev.rawad.taxi.auth.enums.RegisteredWith;
import dev.rawad.taxi.auth.repositories.redis.AuthRedisRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class OtpGenerator {
    private final AuthRedisRepository authRedisRepository;

    private final String CHAR_SET = "0123456789ABCDEFGHIJKLMNOPQRSTUVSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    private final SecureRandom random = new SecureRandom();
    private final int length = 6;

    public String generateOtp(int length) {
        StringBuilder otp = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            otp.append(CHAR_SET.charAt(random.nextInt(CHAR_SET.length())));
        }
        return otp.toString();
    }

    public String generateOtp() {
        return generateOtp(length);
    }

    public String generateOTP(UserEntity user, RegisteredWith via) {
        var otp = AuthRedis.builder()
                .userId(user.getId())
                .code(generateOtp())
                .via(via)
                .type(AuthRedisType.OTP)
                .build();

        authRedisRepository.deleteById(user.getId());
        authRedisRepository.save(otp);

        return otp.getCode();
    }

    public String generateForgetPasswordCode(UserEntity user) {
        var otp = AuthRedis.builder()
                .userId(user.getId())
                .code(generateOtp())
                .type(AuthRedisType.FORGET_PASSWORD)
                .build();

        authRedisRepository.deleteById(user.getId());
        authRedisRepository.save(otp);

        return otp.getCode();
    }
}