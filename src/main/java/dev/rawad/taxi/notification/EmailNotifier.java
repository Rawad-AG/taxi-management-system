package dev.rawad.taxi.notification;

import org.springframework.stereotype.Service;

import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class EmailNotifier implements Notifier {

    @Override
    public void send(String email, String message) {
        log.info("Email (" + email + "): " + message);
    }

}
