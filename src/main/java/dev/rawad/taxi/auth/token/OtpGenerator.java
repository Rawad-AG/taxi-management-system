package dev.rawad.taxi.auth.token;

import java.security.SecureRandom;

import org.springframework.stereotype.Service;

import dev.rawad.taxi.auth.entities.UserEntity;
import dev.rawad.taxi.auth.enums.RegisteredWith;
import dev.rawad.taxi.cache.auth.entities.AuthCache;
import dev.rawad.taxi.cache.auth.enums.AuthCacheType;
import dev.rawad.taxi.cache.auth.repositories.AuthCacheRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class OtpGenerator {
    private final AuthCacheRepository authRedisRepository;

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
        var otp = AuthCache.builder()
                .userId(user.getId())
                .code(generateOtp())
                .via(via)
                .type(AuthCacheType.OTP)
                .build();

        authRedisRepository.deleteById(user.getId());
        authRedisRepository.save(otp);

        return otp.getCode();
    }

    public String generateForgetPasswordCode(UserEntity user) {
        var otp = AuthCache.builder()
                .userId(user.getId())
                .code(generateOtp())
                .type(AuthCacheType.FORGET_PASSWORD)
                .build();

        authRedisRepository.deleteById(user.getId());
        authRedisRepository.save(otp);

        return otp.getCode();
    }
}