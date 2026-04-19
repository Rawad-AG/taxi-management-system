package dev.rawad.taxi.driver.controllers;

import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import dev.rawad.taxi.driver.entities.car.CarManufacturerEntity;
import dev.rawad.taxi.driver.services.CareModelService;
import dev.rawad.taxi.shared.responder.ApiResponseTemplate;
import dev.rawad.taxi.shared.responder.Responder;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/public/car")
@RequiredArgsConstructor
@Tag(name = "Car Models", description = "this controller is *backend for frontend*")
public class CarModelsController {
    private final Responder responder;
    private final CareModelService service;

    @Operation(summary = "fetch available car models")
    @ApiResponses(@ApiResponse(responseCode = "200", content = @Content(schema = @Schema(implementation = CarManufacturerEntity.class))))
    @GetMapping
    public ResponseEntity<ApiResponseTemplate> getCarModels(Pageable pageable) {
        return responder.data(service.getCarModels(pageable)).ok();
    }

}
