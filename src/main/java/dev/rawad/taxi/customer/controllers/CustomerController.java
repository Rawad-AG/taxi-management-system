package dev.rawad.taxi.customer.controllers;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import dev.rawad.taxi.customer.dto.RegisterCustomerRequest;
import dev.rawad.taxi.customer.services.CustomerService;
import dev.rawad.taxi.shared.responder.ApiResponseTemplate;
import dev.rawad.taxi.shared.responder.Responder;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/customer")
@RequiredArgsConstructor
@Tag(name = "Customer Management", description = "this controller holds the APIs related to the customer management, please note that customer actions like booking a ride are placed in specialized controllers")
public class CustomerController {
    private final Responder responder;
    private final CustomerService service;

    @Operation(summary = "Register Customer", description = "Signup customers via (email or phone), returns the user id in case of correctly signed up")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Successfully registered"),
    })
    @PostMapping("/register")
    public ResponseEntity<ApiResponseTemplate> register(@Valid @RequestBody RegisterCustomerRequest dto) {
        return responder.addToData("userId", service.register(dto)).created();
    }

}
