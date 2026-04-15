package dev.rawad.taxi.shared.exception;

import org.springframework.http.HttpStatus;

import lombok.Getter;

@Getter
public class AppException extends RuntimeException {

    protected String message = "errors.default";
    protected HttpStatus status = HttpStatus.INTERNAL_SERVER_ERROR;
    protected Object[] args;

    public AppException(String message, Object... args) {
        super(message);
        this.message = message;
        this.args = args;
    }

    public AppException(String message, HttpStatus status, Object... args) {
        super(message);
        this.message = message;
        this.status = status;
        this.args = args;
    }

    public AppException(String message, int code, Object... args) {
        super(message);
        this.message = message;
        this.status = HttpStatus.valueOf(code);
        this.args = args;
    }

}
