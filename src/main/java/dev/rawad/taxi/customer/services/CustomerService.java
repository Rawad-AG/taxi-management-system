package dev.rawad.taxi.customer.services;

import org.springframework.stereotype.Service;

import dev.rawad.taxi.auth.dto.RegisterRequest;
import dev.rawad.taxi.auth.user.AppUserDetailsService;
import dev.rawad.taxi.customer.dto.RegisterCustomerRequest;
import dev.rawad.taxi.customer.entities.CustomerEntity;
import dev.rawad.taxi.customer.repositories.CustomerRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CustomerService {
    private final CustomerRepository repo;
    private final AppUserDetailsService service;

    public Long register(RegisterCustomerRequest dto) {
        var user = service.register(new RegisterRequest(dto.email(), dto.phone(), dto.password()));
        repo.save(CustomerEntity.builder()
                .user(user)
                .firstName(dto.firstName())
                .lastName(dto.lastName())
                .build());

        return user.getId();
    }

}
