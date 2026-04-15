package dev.rawad.taxi.shared.exception.http;

import org.springframework.http.HttpStatus;

import dev.rawad.taxi.shared.exception.AppException;

public class ForbiddenException extends AppException {

    public ForbiddenException(String message, Object... args) {
        super(message, HttpStatus.FORBIDDEN, args);
    }

}
