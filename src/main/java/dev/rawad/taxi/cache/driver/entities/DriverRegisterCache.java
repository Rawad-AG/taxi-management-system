package dev.rawad.taxi.cache.driver.entities;

import java.time.Instant;

import org.springframework.data.annotation.Id;
import org.springframework.data.redis.core.RedisHash;
import org.springframework.data.redis.core.TimeToLive;
import org.springframework.data.redis.core.index.Indexed;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
@RedisHash(value = "DriverRegisterCache")
public class DriverRegisterCache {
    @Id
    private Long id;

    @Indexed
    private Long userId;

    @Builder.Default
    private Instant issuedAt = Instant.now();

    @TimeToLive
    @Builder.Default
    private Long expires = 300L;
}
