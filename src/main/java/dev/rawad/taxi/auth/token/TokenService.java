package dev.rawad.taxi.auth.token;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

import dev.rawad.taxi.auth.entities.redis.AuthRedis;
import dev.rawad.taxi.auth.enums.AuthRedisType;
import dev.rawad.taxi.auth.repositories.redis.AuthRedisRepository;
import dev.rawad.taxi.auth.user.AppUserDetails;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class TokenService {

    private final JwtEncoder jwtEncoder;
    private final AuthRedisRepository authRedisRepository;

    @Value("${spring.security.jwt.issuer-uri:http://localhost:8080}")
    private String issuer;

    public String generateToken(AppUserDetails appUser) {
        Instant now = Instant.now();
        Long userId = appUser.getUser().getId();

        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(issuer)
                .issuedAt(now)
                .expiresAt(now.plus(24, ChronoUnit.HOURS))
                .subject(appUser.getUsername())
                .claim("userId", userId)
                .claim("type", "refresh")
                .claim("scope", appUser.getAuthorities().stream().map(GrantedAuthority::getAuthority).toList())
                .build();

        authRedisRepository.deleteById(userId);
        authRedisRepository.save(AuthRedis.builder()
                .userId(userId)
                .type(AuthRedisType.REFRESH_TOKEN)
                .build());
        return jwtEncoder.encode(JwtEncoderParameters.from(claims)).getTokenValue();
    }

    public String generateAccessToken(AppUserDetails appUser) {
        Instant now = Instant.now();

        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(issuer)
                .issuedAt(now)
                .expiresAt(now.plus(15, ChronoUnit.MINUTES))
                .subject(appUser.getUsername())
                .claim("userId", appUser.getUser().getId())
                .claim("type", "access")
                .claim("scope", appUser.getAuthorities().stream().map(GrantedAuthority::getAuthority).toList())
                .build();

        return jwtEncoder.encode(JwtEncoderParameters.from(claims)).getTokenValue();
    }

    public String generateUpdatePasswordToken(String username) {
        Instant now = Instant.now();

        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(issuer)
                .issuedAt(now)
                .expiresAt(now.plus(15, ChronoUnit.MINUTES))
                .subject(username)
                .claim("type", "update-password")
                .build();

        return jwtEncoder.encode(JwtEncoderParameters.from(claims)).getTokenValue();
    }

}