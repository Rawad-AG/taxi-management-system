package dev.rawad.taxi.shared.responder;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import org.springframework.context.annotation.ScopedProxyMode;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.validation.ObjectError;
import org.springframework.web.context.annotation.RequestScope;

import dev.rawad.taxi.shared.exception.AppException;
import dev.rawad.taxi.shared.exception.ValidationError;
import jakarta.servlet.http.Cookie;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.experimental.Accessors;

@Component
@RequestScope(proxyMode = ScopedProxyMode.TARGET_CLASS)
@RequiredArgsConstructor
@Data
@Accessors(fluent = true, chain = true)
public class Responder {
    private final Translator translator;

    private boolean success;
    private String message;
    private HttpStatus status;
    private Object data = null;
    private Map<String, Object> meta = new HashMap<>();
    private List<Cookie> cookies = new ArrayList<>();
    private MultiValueMap<String, String> headers = new LinkedMultiValueMap<>();

    public Responder validationErrors(BindingResult bindingResult) {
        List<ValidationError> errors = new ArrayList<>();

        for (FieldError error : bindingResult.getFieldErrors())
            errors.add(
                    new ValidationError(error.getField(), error.getDefaultMessage()));

        for (ObjectError error : bindingResult.getGlobalErrors())
            errors.add(
                    new ValidationError("_global", error.getDefaultMessage()));

        this.success = false;
        this.message = "Validation failed";
        this.data = errors;
        this.meta.put("errorCount", errors.size());

        return this;
    }

    // *============================================================
    // *= generals
    // *============================================================
    public ResponseEntity<ApiResponseTemplate> success() {
        this.success = true;
        if (status == null)
            this.status = HttpStatus.OK;
        return build("success");
    }

    public ResponseEntity<ApiResponseTemplate> error() {
        this.success = false;
        if (status == null)
            this.status = HttpStatus.INTERNAL_SERVER_ERROR;
        return build("error");
    }

    public ResponseEntity<ApiResponseTemplate> error(AppException e) {
        this.success = false;
        this.message = e.getMessage();
        this.status = e.getStatus();

        return build("error", e.getArgs());
    }

    // *============================================================
    // *= Success responses (2xx)
    // *============================================================
    public ResponseEntity<ApiResponseTemplate> ok() {
        this.status = HttpStatus.OK;
        this.success = true;
        return build("OK");
    }

    public ResponseEntity<ApiResponseTemplate> created() {
        this.status = HttpStatus.CREATED;
        this.success = true;
        return build("CREATED");
    }

    public ResponseEntity<ApiResponseTemplate> accepted() {
        this.status = HttpStatus.ACCEPTED;
        this.success = true;
        return build("ACCEPTED");
    }

    public ResponseEntity<ApiResponseTemplate> noContent() {
        this.status = HttpStatus.NO_CONTENT;
        this.success = true;
        return build("NO CONTENT");
    }

    // *============================================================
    // *= Client errors (4xx)
    // *============================================================
    public ResponseEntity<ApiResponseTemplate> badRequest() {
        this.status = HttpStatus.BAD_REQUEST;
        this.success = false;
        return build("BAD REQUEST");
    }

    public ResponseEntity<ApiResponseTemplate> unauthorized() {
        this.status = HttpStatus.UNAUTHORIZED;
        this.success = false;
        return build("UNAUTHORIZED");
    }

    public ResponseEntity<ApiResponseTemplate> forbidden() {
        this.status = HttpStatus.FORBIDDEN;
        this.success = false;
        return build("FORBIDDEN");
    }

    public ResponseEntity<ApiResponseTemplate> notFound() {
        this.status = HttpStatus.NOT_FOUND;
        this.success = false;
        return build("NOT FOUND");
    }

    public ResponseEntity<ApiResponseTemplate> methodNotAllowed() {
        this.status = HttpStatus.METHOD_NOT_ALLOWED;
        this.success = false;
        return build("METHOD NOT ALLOWED");
    }

    public ResponseEntity<ApiResponseTemplate> conflict() {
        this.status = HttpStatus.CONFLICT;
        this.success = false;
        return build("CONFLICT");
    }

    // *============================================================
    // *= Server errors (5xx)
    // *============================================================
    public ResponseEntity<ApiResponseTemplate> internalError() {
        this.status = HttpStatus.INTERNAL_SERVER_ERROR;
        this.success = false;
        return build("INTERNAL SERVER ERROR");
    }

    public ResponseEntity<ApiResponseTemplate> notImplemented() {
        this.status = HttpStatus.NOT_IMPLEMENTED;
        this.success = false;
        return build("NOT IMPLEMENTED");
    }

    public ResponseEntity<ApiResponseTemplate> serviceUnavailable() {
        this.status = HttpStatus.SERVICE_UNAVAILABLE;
        this.success = false;
        return build("SERVICE UNAVAILABLE");
    }

    // *============================================================
    // *= Setters
    // *============================================================
    public Responder data(Object object) {
        data = object;
        return this;
    }

    public Responder message(String message) {
        this.message = message;
        return this;
    }

    @SuppressWarnings("unchecked")
    public Responder addToData(String key, Object object) {
        if (data == null)
            data = new HashMap<String, Object>();
        if (data instanceof HashMap map)
            map.put(key, object);

        return this;
    }

    public Responder addMeta(String k, Object v) {
        if (null == k || v == null)
            return this;
        this.meta.put(k, v);
        return this;
    }

    public Responder addHeader(String k, String v) {
        if (null == k || v == null)
            return this;
        this.headers.add(k, v);
        return this;
    }

    public Responder addAllHeader(String key, Collection<String> v) {
        if (null == v || null == key)
            return this;
        v.forEach(val -> this.headers.add(key, val));
        return this;
    }

    // *============================================================
    // *= Internals
    // *============================================================
    private ResponseEntity<ApiResponseTemplate> build(String defaultMessage, Object... args) {
        var body = new ApiResponseTemplate(
                success,
                status.value(),
                status.name(),
                translator.translate(message != null && !message.isBlank() ? message : defaultMessage, args),
                data,
                meta,
                LocalDateTime.now());

        Objects.requireNonNull(this.status);
        var builder = ResponseEntity.status(this.status);
        addHeaders(builder);

        return builder.body(body);
    }

    private void addHeaders(ResponseEntity.BodyBuilder builder) {
        for (var entry : headers.entrySet()) {
            String header = entry.getKey();
            List<String> value = entry.getValue();

            if (header != null && value != null)
                value.forEach(s -> builder.header(header, s));
        }

        for (Cookie cookie : cookies) {
            builder.header("Set-Cookie", cookie.toString());
        }
    }
}
