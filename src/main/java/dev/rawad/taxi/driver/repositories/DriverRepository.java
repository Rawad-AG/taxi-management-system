package dev.rawad.taxi.driver.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import dev.rawad.taxi.driver.entities.DriverEntity;

@Repository
public interface DriverRepository extends JpaRepository<DriverEntity, Long> {
}
