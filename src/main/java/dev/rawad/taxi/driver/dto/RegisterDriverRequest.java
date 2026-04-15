package dev.rawad.taxi.driver.dto;

import dev.rawad.taxi.validation.phone.Phone;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record RegisterDriverRequest(
                @NotBlank @Phone String phone,
                @NotBlank @Size(min = 8) String password,
                @NotBlank String firstName,
                @NotBlank String lastName,
                @NotNull CarDTO car) {

        public static record CarDTO(
                        @NotBlank String licensePlate,
                        @NotBlank @Size(min = 7, max = 7) String vin,
                        @NotBlank String color,
                        @NotNull @Positive Long modelId) {
        }
}
