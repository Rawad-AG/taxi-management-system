package dev.rawad.taxi.shared.exception.http;

import org.springframework.http.HttpStatus;

import dev.rawad.taxi.shared.exception.AppException;

public class BadRequestException extends AppException {

    public BadRequestException(String message, Object... args) {
        super(message, HttpStatus.BAD_REQUEST, args);
    }

}
