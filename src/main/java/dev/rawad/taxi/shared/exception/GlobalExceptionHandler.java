package dev.rawad.taxi.shared.exception;

import java.util.NoSuchElementException;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.authorization.AuthorizationDeniedException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.security.oauth2.jwt.JwtValidationException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import dev.rawad.taxi.shared.responder.ApiResponseTemplate;
import dev.rawad.taxi.shared.responder.Responder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestControllerAdvice
@RequiredArgsConstructor
@Slf4j
public class GlobalExceptionHandler {

    private final Responder responder;

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponseTemplate> handleMethodArgumentNotValidException(
            MethodArgumentNotValidException ex) {
        return responder.validationErrors(ex.getBindingResult()).badRequest();
    }

    // --- Bad Request ---
    @ExceptionHandler({
            DataIntegrityViolationException.class,
            MissingServletRequestParameterException.class,
            HttpMessageNotReadableException.class
    })
    public ResponseEntity<ApiResponseTemplate> handleBadRequestExceptions(Exception ex) {
        return responder.message(ex.getMessage()).badRequest();
    }

    // --- Not Found ---
    @ExceptionHandler({
            NoSuchElementException.class,
            NoResourceFoundException.class
    })
    public ResponseEntity<ApiResponseTemplate> handleNotFoundExceptions(Exception ex) {
        return responder.message(ex.getMessage()).notFound();
    }

    // --- Unauthorized ---
    @ExceptionHandler({
            UsernameNotFoundException.class,
            JwtValidationException.class,
            AuthorizationDeniedException.class,
            BadJwtException.class
    })
    public ResponseEntity<ApiResponseTemplate> handleUnauthorizedExceptions(Exception ex) {
        return responder.message(ex.getMessage()).unauthorized();
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ApiResponseTemplate> handleHttpRequestMethodNotSupportedException(
            HttpRequestMethodNotSupportedException ex) {
        return responder.message(ex.getMessage()).methodNotAllowed();
    }

    @ExceptionHandler(AppException.class)
    public ResponseEntity<ApiResponseTemplate> handleAppException(AppException ex) {
        return responder.error(ex);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponseTemplate> handleFallback(Exception ex) {
        log.error("Unhandled exception", ex);
        return responder.internalError();
    }

}