package dev.rawad.taxi.customer.dto;

import org.locationtech.jts.geom.Point;

public record CustomerUpdateProfileRequest(
                String firstName,
                String lastName,
                Point location) {
}