package dev.rawad.taxi.driver.services;

import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import dev.rawad.taxi.auth.dto.RegisterRequest;
import dev.rawad.taxi.auth.user.AppUserDetailsService;
import dev.rawad.taxi.cache.driver.entities.DriverRegisterCache;
import dev.rawad.taxi.cache.driver.repositories.DriverRegisterCacheRepository;
import dev.rawad.taxi.driver.dto.DriverMapper;
import dev.rawad.taxi.driver.dto.RegisterDriverRequest;
import dev.rawad.taxi.driver.repositories.CarModelRepository;
import dev.rawad.taxi.driver.repositories.DriverRepository;
import dev.rawad.taxi.events.auth.UserRegisteredEvent;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class DriverService {
    private final DriverRepository repo;
    private final AppUserDetailsService service;
    private final CarModelRepository carModelRepository;
    private final DriverMapper mapper;
    private final DriverRegisterCacheRepository cacheRepository;

    public Long register(RegisterDriverRequest dto) {
        var user = service.register(new RegisterRequest(null, dto.phone(), dto.password()));

        var driver = mapper.map(dto);

        var car = mapper.map(dto.car());
        car.setModel(carModelRepository.findById(dto.car().modelId()).orElseThrow());

        driver.setUser(user);
        driver.setCar(car);

        repo.save(driver);

        cacheRepository.save(DriverRegisterCache.builder()
                .userId(user.getId())
                .build());

        return user.getId();
    }

    @EventListener
    public void driverRegistered(UserRegisteredEvent event) {
        cacheRepository.findById(event.user().getId()).ifPresent(cache -> {
            var driver = repo.findByUserId(cache.getUserId()).orElseThrow();
            driver.getUser().setEnabledViaPhone(false);
        });
    }

}
