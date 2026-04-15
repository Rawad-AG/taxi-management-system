package dev.rawad.taxi.customer.dto;

import dev.rawad.taxi.validation.phone.Phone;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterCustomerRequest(
        @Email String email,
        @Phone String phone,
        @NotBlank @Size(min = 8) String password,
        @NotBlank String firstName,
        String lastName) {

}
