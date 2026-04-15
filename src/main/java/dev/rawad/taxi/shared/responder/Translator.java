package dev.rawad.taxi.shared.responder;

import org.springframework.context.MessageSource;
import org.springframework.context.annotation.Scope;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.WebApplicationContext;

@Component
@Scope(WebApplicationContext.SCOPE_REQUEST)
public class Translator {

    private final MessageSource messageSource;

    public Translator(MessageSource messageSource) {
        this.messageSource = messageSource;
    }

    public String translate(String code, Object... args) {
        if (code == null)
            return null;

        return messageSource.getMessage(
                code,
                args,
                code,
                LocaleContextHolder.getLocale());
    }
}
