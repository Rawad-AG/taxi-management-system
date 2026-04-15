package dev.rawad.taxi.shared.exception.http;

import org.springframework.http.HttpStatus;

import dev.rawad.taxi.shared.exception.AppException;

public class NotFoundException extends AppException {

    public NotFoundException(String message, Object... args) {
        super(message, HttpStatus.NOT_FOUND, args);
    }

}
