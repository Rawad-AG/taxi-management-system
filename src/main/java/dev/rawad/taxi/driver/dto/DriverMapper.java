package dev.rawad.taxi.driver.dto;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

import dev.rawad.taxi.driver.entities.CarEntity;
import dev.rawad.taxi.driver.entities.DriverEntity;

@Mapper(unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface DriverMapper {

    @Mapping(target = "car", ignore = true)
    DriverEntity map(RegisterDriverRequest dto);

    @Mapping(target = "model", ignore = true)
    CarEntity map(RegisterDriverRequest.CarDTO dto);

    @Mapping(target = "phone", source = "user.phone")
    @Mapping(target = "car.model.manufacturer", source = "car.model.manufacturer.name")
    DriverResponse map(DriverEntity entity);
}
