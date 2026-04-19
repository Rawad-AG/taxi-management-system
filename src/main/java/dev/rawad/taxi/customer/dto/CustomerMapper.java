package dev.rawad.taxi.customer.dto;

import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

import dev.rawad.taxi.customer.entities.CustomerEntity;

@Mapper(unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface CustomerMapper {

    CustomerResponse map(CustomerEntity save);
}
