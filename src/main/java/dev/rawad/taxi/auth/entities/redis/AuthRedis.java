package dev.rawad.taxi.auth.entities.redis;

import java.time.Instant;

import org.springframework.data.annotation.Id;
import org.springframework.data.redis.core.RedisHash;
import org.springframework.data.redis.core.TimeToLive;
import org.springframework.data.redis.core.index.Indexed;

import dev.rawad.taxi.auth.enums.AuthRedisType;
import dev.rawad.taxi.auth.enums.RegisteredWith;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
@RedisHash(value = "AuthRedis")
public class AuthRedis {
    @Id
    private Long id;

    @Indexed
    private Long userId;

    @Indexed
    private AuthRedisType type;

    private String code;
    private RegisteredWith via;

    @Builder.Default
    private Integer tries = 0;

    @Builder.Default
    private Instant issuedAt = Instant.now();

    @TimeToLive
    @Builder.Default
    private Long expires = 300L;
}