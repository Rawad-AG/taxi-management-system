package dev.rawad.taxi.config;

import org.springframework.boot.hibernate.autoconfigure.HibernatePropertiesCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import jakarta.validation.Validator;

@Configuration
public class ValidationConfig {

    @Bean
    public HibernatePropertiesCustomizer hibernatePropertiesCustomizer(Validator validator) {
        return hibernateProperties -> hibernateProperties.put("jakarta.persistence.validation.factory", validator);
    }
}