package dev.rawad.taxi.seeders;

import java.util.List;

import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

import dev.rawad.taxi.auth.entities.PermissionEntity;
import dev.rawad.taxi.auth.entities.RoleEntity;
import dev.rawad.taxi.auth.entities.UserEntity;
import dev.rawad.taxi.auth.enums.RegisteredWith;
import dev.rawad.taxi.auth.repositories.PermissionRepository;
import dev.rawad.taxi.auth.repositories.RoleRepository;
import dev.rawad.taxi.auth.repositories.UserRepository;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class AuthSeeder implements CommandLineRunner {
        private final UserRepository userRepository;
        private final BCryptPasswordEncoder encoder;
        private final RoleRepository roleRepository;
        private final PermissionRepository permissionRepository;

        @Override
        public void run(String... args) throws Exception {
                var write_ride = permissionRepository.save(PermissionEntity.builder().name("write:ride").build());
                var read_ride = permissionRepository.save(PermissionEntity.builder().name("read:ride").build());

                var write_driver = permissionRepository.save(PermissionEntity.builder().name("write:driver").build());
                var read_driver = permissionRepository.save(PermissionEntity.builder().name("read:driver").build());

                var admin_role = roleRepository.save(RoleEntity.builder().name("ADMIN").build());
                var customer_role = roleRepository.save(RoleEntity.builder().name("CUSTOMER").build());
                var emloyee_role = roleRepository.save(RoleEntity.builder().name("EMPLOYEE").build());
                var driver_role = roleRepository.save(RoleEntity.builder().name("DRIVER").build());

                admin_role
                                .addPermission(read_driver, null)
                                .addPermission(write_driver, null)
                                .addPermission(read_ride, null)
                                .addPermission(write_ride, null);

                customer_role
                                .addPermission(read_driver, null)
                                .addPermission(read_ride, null)
                                .addPermission(write_ride, null);

                emloyee_role
                                .addPermission(read_driver, null)
                                .addPermission(write_driver, null);

                driver_role
                                .addPermission(read_ride, null);

                roleRepository.saveAll(List.of(admin_role, customer_role, emloyee_role, driver_role));

                var customer = UserEntity.builder()
                                .email("test@example.com")
                                .enabledViaEmail(true)
                                .firstRegisteredWith(RegisteredWith.EMAIL)
                                .password(encoder.encode("password"))
                                .build();

                customer.addPermission(
                                permissionRepository.save(PermissionEntity.builder().name("read:profile").build()));

                customer.addRole(customer_role);

                userRepository.save(customer);
        }

}
