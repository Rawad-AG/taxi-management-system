package dev.rawad.taxi.config;

import java.util.Optional;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.data.domain.AuditorAware;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import dev.rawad.taxi.auth.user.AppUserDetails;

@Configuration
@EnableJpaAuditing
public class AuditConfig {

    @Bean
    @Primary
    AuditorAware<Long> appAuditorAware() {
        return () -> {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

            if (authentication == null
                    || !authentication.isAuthenticated()
                    || authentication instanceof AnonymousAuthenticationToken)
                return Optional.empty();

            var principal = (AppUserDetails) authentication.getPrincipal();

            return Optional.ofNullable(principal.getUser().getId());
        };
    }
}