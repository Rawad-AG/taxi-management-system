package dev.rawad.taxi.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdatePasswordRequest(@NotBlank @Size(min = 8) String newPass) {
}
