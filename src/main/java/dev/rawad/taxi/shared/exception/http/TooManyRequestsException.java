package dev.rawad.taxi.shared.exception.http;

import org.springframework.http.HttpStatus;

import dev.rawad.taxi.shared.exception.AppException;

public class TooManyRequestsException extends AppException {

    public TooManyRequestsException(String message, Object... args) {
        super(message, HttpStatus.TOO_MANY_REQUESTS, args);
    }

}
