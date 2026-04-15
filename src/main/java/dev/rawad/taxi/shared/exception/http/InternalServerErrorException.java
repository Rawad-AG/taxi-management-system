package dev.rawad.taxi.shared.exception.http;

import org.springframework.http.HttpStatus;

import dev.rawad.taxi.shared.exception.AppException;

public class InternalServerErrorException extends AppException {

    public InternalServerErrorException(String message, Object... args) {
        super(message, HttpStatus.INTERNAL_SERVER_ERROR, args);
    }

}
