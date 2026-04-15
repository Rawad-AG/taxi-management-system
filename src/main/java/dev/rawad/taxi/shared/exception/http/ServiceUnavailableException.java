package dev.rawad.taxi.shared.exception.http;

import org.springframework.http.HttpStatus;

import dev.rawad.taxi.shared.exception.AppException;

public class ServiceUnavailableException extends AppException {

    public ServiceUnavailableException(String message, Object... args) {
        super(message, HttpStatus.SERVICE_UNAVAILABLE, args);
    }

}
