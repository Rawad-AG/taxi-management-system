package dev.rawad.taxi.auth.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;

import dev.rawad.taxi.auth.token.TokenService;
import dev.rawad.taxi.auth.user.AppUserDetails;
import dev.rawad.taxi.auth.user.AppUserDetailsService;
import lombok.RequiredArgsConstructor;

@Configuration
@RequiredArgsConstructor
public class AuthenticationSuccessHandlerConfiguration {
    private final AppUserDetailsService appUserDetailsService;
    private final TokenService tokenService;

    @Value("${spring.security.oauth2.default-redirect-uri}")
    private String oauth2redirectUrl;

    @Bean
    public AuthenticationSuccessHandler oAuth2AuthenticationSuccessHandler() {
        return (request, response, authentication) -> {
            DefaultOidcUser oidcUser = (DefaultOidcUser) authentication.getPrincipal();
            String email = oidcUser.getEmail();

            AppUserDetails user = appUserDetailsService.processOAuth2User(email);

            String token = tokenService.generateToken(user);

            String targetUrl = oauth2redirectUrl + "?token=" + token;
            response.sendRedirect(targetUrl);
        };
    }
}
