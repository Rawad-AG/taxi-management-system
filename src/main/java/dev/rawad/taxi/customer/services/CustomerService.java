package dev.rawad.taxi.customer.services;

import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import dev.rawad.taxi.auth.dto.RegisterRequest;
import dev.rawad.taxi.auth.user.AppUserDetailsService;
import dev.rawad.taxi.customer.dto.CustomerMapper;
import dev.rawad.taxi.customer.dto.CustomerUpdateProfileRequest;
import dev.rawad.taxi.customer.dto.RegisterCustomerRequest;
import dev.rawad.taxi.customer.entities.CustomerEntity;
import dev.rawad.taxi.customer.repositories.CustomerRepository;
import dev.rawad.taxi.events.auth.UserRegisteredEvent;
import dev.rawad.taxi.notification.EmailNotifier;
import dev.rawad.taxi.notification.SMSNotifier;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CustomerService {
    private final CustomerRepository repo;
    private final AppUserDetailsService service;
    private final EmailNotifier emailNotifier;
    private final SMSNotifier smsNotifier;
    private final CustomerMapper mapper;

    public Long register(RegisterCustomerRequest dto) {
        var user = service.register(new RegisterRequest(dto.email(), dto.phone(), dto.password()));
        repo.save(CustomerEntity.builder()
                .user(user)
                .firstName(dto.firstName())
                .lastName(dto.lastName())
                .build());

        return user.getId();
    }

    @EventListener
    public void customerRegistered(UserRegisteredEvent event) {
        switch (event.user().getFirstRegisteredWith()) {
            case EMAIL -> emailNotifier.send(event.user().getEmail(), "welcome");
            case PHONE -> smsNotifier.send(event.user().getPhone(), "welcome");
        }
    }

    public Object updateProfile(Long id, CustomerUpdateProfileRequest dto) {
        var customer = repo.findById(id).orElseThrow();
        if (dto.firstName() != null)
            customer.setFirstName(dto.firstName());

        if (dto.lastName() != null)
            customer.setLastName(dto.lastName());

        if (dto.location() != null)
            customer.setLocation(dto.location());

        return mapper.map(repo.save(customer));

    }

}
