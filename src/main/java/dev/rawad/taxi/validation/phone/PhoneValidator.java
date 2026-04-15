package dev.rawad.taxi.validation.phone;

import org.springframework.beans.factory.annotation.Autowired;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class PhoneValidator implements ConstraintValidator<Phone, String> {

    @Autowired
    private PhoneValidationService phoneValidationService;

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null || value.isBlank())
            return true;

        if (phoneValidationService == null)
            return false;

        return phoneValidationService.isValid(value, "SY");
    }
}