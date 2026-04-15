package dev.rawad.taxi.shared.exception.http;

import org.springframework.http.HttpStatus;

import dev.rawad.taxi.shared.exception.AppException;

public class UnauthorizedException extends AppException {

    public UnauthorizedException(String message, Object... args) {
        super(message, HttpStatus.UNAUTHORIZED, args);
    }

}
