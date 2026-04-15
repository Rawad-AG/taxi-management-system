package dev.rawad.taxi.shared.exception;

public record ValidationError(String field, String message) {
}
