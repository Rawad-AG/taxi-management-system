package dev.rawad.taxi.openAPI;

import java.util.Map;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Taxi System API")
                        .version("1.0")
                        .contact(new Contact()
                                .name("Rawad-AG")
                                .email("rawadaboughanem0@gmail.com")
                                .extensions(Map.of("phone number", "+963 951 334 761")))
                        .description("a documentation for taxi system api"));
    }
}