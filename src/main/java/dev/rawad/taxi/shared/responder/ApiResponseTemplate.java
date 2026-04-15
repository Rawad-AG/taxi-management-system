package dev.rawad.taxi.shared.responder;

import java.time.LocalDateTime;
import java.util.Map;

import com.fasterxml.jackson.annotation.JsonInclude;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponseTemplate {
    private boolean success;
    private int code;
    private String status;
    private String message;
    private Object data;
    private Map<String, Object> meta;
    private LocalDateTime timestamp;
}