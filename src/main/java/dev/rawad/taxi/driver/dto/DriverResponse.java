package dev.rawad.taxi.driver.dto;

import java.time.Instant;

public record DriverResponse(
        Long id,
        String firstName,
        String lastName,
        String phone,
        Instant createdAt,
        Instant updatedAt,
        CarResponse car) {

}
