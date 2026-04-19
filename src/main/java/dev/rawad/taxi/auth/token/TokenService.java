package dev.rawad.taxi.auth.token;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

import dev.rawad.taxi.auth.user.AppUserDetails;
import dev.rawad.taxi.cache.auth.entities.AuthCache;
import dev.rawad.taxi.cache.auth.enums.AuthCacheType;
import dev.rawad.taxi.cache.auth.repositories.AuthCacheRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class TokenService {

    private final JwtEncoder jwtEncoder;
    private final AuthCacheRepository authRedisRepository;

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
        authRedisRepository.save(AuthCache.builder()
                .userId(userId)
                .type(AuthCacheType.REFRESH_TOKEN)
                .issuedAt(now)
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