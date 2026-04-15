package dev.rawad.taxi.notification;

public interface Notifier {
    void send(String to, String message);
}
