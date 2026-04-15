package dev.rawad.taxi.auth.dto;

import dev.rawad.taxi.validation.phone.Phone;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
                @Email String email,
                @Phone String phone,
                @NotBlank @Size(min = 8) String password) {
}