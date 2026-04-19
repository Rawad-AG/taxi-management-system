package dev.rawad.taxi.cache.auth.entities;

import java.time.Instant;

import org.springframework.data.annotation.Id;
import org.springframework.data.redis.core.RedisHash;
import org.springframework.data.redis.core.TimeToLive;
import org.springframework.data.redis.core.index.Indexed;

import dev.rawad.taxi.auth.enums.RegisteredWith;
import dev.rawad.taxi.cache.auth.enums.AuthCacheType;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
@RedisHash(value = "AuthCache")
public class AuthCache {
    @Id
    private Long id;

    @Indexed
    private Long userId;

    @Indexed
    private AuthCacheType type;

    private String code;
    private RegisteredWith via;

    @Builder.Default
    private Integer tries = 0;

    @Builder.Default
    private Instant issuedAt = Instant.now();

    @Builder.Default
    private Boolean revoked = false;

    @TimeToLive
    @Builder.Default
    private Long expires = 300L;
}