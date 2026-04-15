package dev.rawad.taxi.driver.controllers;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import dev.rawad.taxi.driver.dto.RegisterDriverRequest;
import dev.rawad.taxi.driver.services.DriverService;
import dev.rawad.taxi.shared.responder.ApiResponseTemplate;
import dev.rawad.taxi.shared.responder.Responder;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/driver")
@RequiredArgsConstructor
@Tag(name = "Driver Management", description = "this controller holds the APIs related to the driver management, please note that driver actions like accepting a ride are placed in specialized controllers")
public class DriverController {
    private final Responder responder;
    private final DriverService service;

    @Operation(summary = "Register Driver", description = "Signup drivers via phone number **only**, returns the user id in case of correctly signed up")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Successfully registered"),
    })
    @PostMapping("/register")
    public ResponseEntity<ApiResponseTemplate> register(@Valid @RequestBody RegisterDriverRequest dto) {
        return responder.addToData("userId", service.register(dto)).created();
    }

}
