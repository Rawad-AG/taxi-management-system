package dev.rawad.taxi.cache.driver.repositories;

import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

import dev.rawad.taxi.cache.driver.entities.DriverRegisterCache;

@Repository
public interface DriverRegisterCacheRepository extends CrudRepository<DriverRegisterCache, Long> {
}