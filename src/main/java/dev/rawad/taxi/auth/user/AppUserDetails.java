package dev.rawad.taxi.auth.user;

import java.util.Collection;
import java.util.HashSet;
import java.util.Set;

import org.jspecify.annotations.Nullable;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import dev.rawad.taxi.auth.entities.RolePermission;
import dev.rawad.taxi.auth.entities.UserEntity;
import dev.rawad.taxi.auth.entities.UserPermissionEntity;
import dev.rawad.taxi.auth.entities.UserRoleEntity;
import dev.rawad.taxi.auth.repositories.UserRepository;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
@Getter
public class AppUserDetails implements UserDetails {
    private final UserEntity user;
    private final UserRepository repo;

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        Set<SimpleGrantedAuthority> authorities = new HashSet<>();

        user.getPermissions().stream()
                .filter(UserPermissionEntity::isValid)
                .map(up -> new SimpleGrantedAuthority(up.getPermission().getName()))
                .forEach(authorities::add);

        user.getRoles().stream()
                .filter(UserRoleEntity::isValid)
                .forEach(ur -> {
                    ur.getRole().getPermissions().stream()
                            .filter(RolePermission::isValid)
                            .map(rp -> new SimpleGrantedAuthority(rp.getPermission().getName()))
                            .forEach(authorities::add);
                });

        return authorities;
    }

    @Override
    public @Nullable String getPassword() {
        return user.getPassword();
    }

    @Override
    public String getUsername() {
        return user.getUsername();
    }

    @Override
    public boolean isEnabled() {
        return user.isEnabled();
    }

    @Override
    public boolean isAccountNonLocked() {
        return !user.isLocked();
    }

    @Override
    public boolean isAccountNonExpired() {
        return !user.isDeleted();
    }
}
