package dev.rawad.taxi.notification;

import org.springframework.stereotype.Service;

import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class SMSNotifier implements Notifier {

    @Override
    public void send(String phone, String message) {
        log.info("Phone (" + phone + "): " + message);
    }

}
