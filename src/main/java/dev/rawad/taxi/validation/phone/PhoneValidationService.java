package dev.rawad.taxi.validation.phone;

import org.springframework.stereotype.Service;

import com.google.i18n.phonenumbers.NumberParseException;
import com.google.i18n.phonenumbers.PhoneNumberUtil;
import com.google.i18n.phonenumbers.Phonenumber;

@Service
public class PhoneValidationService {
    private final PhoneNumberUtil phoneUtil = PhoneNumberUtil.getInstance();

    public boolean isValid(String number, String countryCode) {
        try {
            Phonenumber.PhoneNumber proto = phoneUtil.parse(number, countryCode);
            return phoneUtil.isValidNumber(proto);
        } catch (NumberParseException e) {
            return false;
        }
    }
}