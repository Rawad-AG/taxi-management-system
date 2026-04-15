package dev.rawad.taxi.shared.exception.http;

import org.springframework.http.HttpStatus;

import dev.rawad.taxi.shared.exception.AppException;

public class MethodNotAllowedException extends AppException {

    public MethodNotAllowedException(String message, Object... args) {
        super(message, HttpStatus.METHOD_NOT_ALLOWED, args);
    }

}
