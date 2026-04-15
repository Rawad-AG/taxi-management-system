package dev.rawad.taxi.driver.dto;

public record CarResponse(
        Long id,
        String licensePlate,
        String vin,
        String color,
        CarModelResponse model) {

    public static record CarModelResponse(
            Long id,
            String name,
            Integer releaseYear,
            String engineType,
            Integer motorPower,
            Integer seats,
            String manufacturer) {
    }
}