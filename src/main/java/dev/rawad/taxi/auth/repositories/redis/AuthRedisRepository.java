package dev.rawad.taxi.auth.repositories.redis;

import java.util.Optional;

import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

import dev.rawad.taxi.auth.entities.redis.AuthRedis;
import dev.rawad.taxi.auth.enums.AuthRedisType;

@Repository
public interface AuthRedisRepository extends CrudRepository<AuthRedis, Long> {
    Optional<AuthRedis> findByUserIdAndType(Long userId, AuthRedisType type);
}