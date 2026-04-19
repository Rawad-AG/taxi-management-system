package dev.rawad.taxi.customer.dto;

import java.time.Instant;

import org.locationtech.jts.geom.Point;

public record CustomerResponse(
        Long id,
        String avatar,
        String firstName,
        String lastName,
        Point location,
        Instant createdAt,
        Instant updatedAt) {

}
