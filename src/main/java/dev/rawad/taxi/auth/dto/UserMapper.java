package dev.rawad.taxi.auth.dto;

import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

import dev.rawad.taxi.auth.entities.UserEntity;

@Mapper(unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface UserMapper {

    UserEntity map(RegisterRequest dto);

}
