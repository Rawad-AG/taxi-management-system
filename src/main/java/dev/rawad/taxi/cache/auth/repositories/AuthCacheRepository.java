package dev.rawad.taxi.cache.auth.repositories;

import java.util.Optional;

import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

import dev.rawad.taxi.cache.auth.entities.AuthCache;
import dev.rawad.taxi.cache.auth.enums.AuthCacheType;

@Repository
public interface AuthCacheRepository extends CrudRepository<AuthCache, Long> {
    Optional<AuthCache> findByUserIdAndType(Long userId, AuthCacheType type);
}