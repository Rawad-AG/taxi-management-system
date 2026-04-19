package dev.rawad.taxi.driver.services;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import dev.rawad.taxi.driver.entities.car.CarManufacturerEntity;
import dev.rawad.taxi.driver.repositories.CarManufacturerRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CareModelService {
    private final CarManufacturerRepository repo;

    public Page<CarManufacturerEntity> getCarModels(Pageable pageable) {
        return repo.findAll(pageable);
    }

}
