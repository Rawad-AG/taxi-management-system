package dev.rawad.taxi.seeders;

import java.util.ArrayList;
import java.util.List;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import dev.rawad.taxi.driver.entities.car.CarManufacturerEntity;
import dev.rawad.taxi.driver.entities.car.CarModelEntity;
import dev.rawad.taxi.driver.repositories.CarManufacturerRepository;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class CarSeeder implements CommandLineRunner {
    private final CarManufacturerRepository repo;

    @Override
    public void run(String... args) throws Exception {
        if (repo.count() > 0)
            return;

        List<CarManufacturerEntity> manufacturers = new ArrayList<>();

        // --- TOYOTA ---
        var toyota = createManufacturer("Toyota");
        addModel(toyota, "GR Supra", 2024, "3.0L Turbo I6", 382, 2);
        addModel(toyota, "Land Cruiser 300", 2023, "3.3L V6 Diesel", 304, 7);
        manufacturers.add(toyota);

        // --- TESLA ---
        var tesla = createManufacturer("Tesla");
        addModel(tesla, "Model S Plaid", 2026, "Tri-Motor Electric", 1020, 5);
        addModel(tesla, "Model X", 2026, "Dual-Motor Electric", 670, 7);
        manufacturers.add(tesla);

        // --- BMW ---
        var bmw = createManufacturer("BMW");
        addModel(bmw, "M4 Competition xDrive", 2026, "3.0L Twin-Turbo I6", 523, 4);
        addModel(bmw, "i3 (Neue Klasse)", 2026, "Single-Motor Electric", 463, 5);
        manufacturers.add(bmw);

        // --- PORSCHE ---
        var porsche = createManufacturer("Porsche");
        addModel(porsche, "911 GT3", 2026, "4.0L Flat-6", 502, 2);
        addModel(porsche, "Taycan Turbo S", 2025, "Dual-Motor Electric", 938, 4);
        manufacturers.add(porsche);

        repo.saveAll(manufacturers);
    }

    private CarManufacturerEntity createManufacturer(String name) {
        return CarManufacturerEntity.builder()
                .name(name)
                .build();
    }

    private void addModel(CarManufacturerEntity m, String name, Integer year, String engine, Integer hp,
            Integer seats) {
        var model = CarModelEntity.builder()
                .name(name)
                .releaseYear(year)
                .engineType(engine)
                .motorPower(hp)
                .seats(seats)
                .manufacturer(m)
                .build();
        m.getModels().add(model);
    }
}