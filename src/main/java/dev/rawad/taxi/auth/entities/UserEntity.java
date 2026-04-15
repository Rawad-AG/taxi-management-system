package dev.rawad.taxi.auth.entities;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;

import dev.rawad.taxi.auth.enums.RegisteredWith;
import dev.rawad.taxi.validation.phone.Phone;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.SequenceGenerator;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

@Entity(name = "User")
@Table(name = "users")
@AllArgsConstructor
@NoArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString(onlyExplicitlyIncluded = true)
@Getter
@Setter
@Builder
public class UserEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "users_seq_gen")
    @SequenceGenerator(name = "users_seq_gen", sequenceName = "users_seq_gen", allocationSize = 1)
    @ToString.Include
    @EqualsAndHashCode.Include
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "first_registered_with", updatable = false, nullable = false)
    private RegisteredWith firstRegisteredWith;

    @Email
    @Column(unique = true)
    private String email;

    @Phone
    @Column(unique = true)
    private String phone;

    @Size(min = 8)
    private String password;
    private Instant passwordUpdatedAt;

    @Column(name = "enabled_via_phone")
    @Builder.Default
    private Boolean enabledViaPhone = false;

    @Column(name = "enabled_via_email")
    @Builder.Default
    private Boolean enabledViaEmail = false;

    @Builder.Default
    private Boolean locked = false;
    private String lockedFor;
    private Instant lockedUntil;

    @Builder.Default
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
    private Set<UserPermissionEntity> permissions = new HashSet<>();

    @Builder.Default
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
    private Set<UserRoleEntity> roles = new HashSet<>();

    private Instant deletedAt;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private Instant updatedAt;

    public boolean isDeleted() {
        return deletedAt != null;
    }

    public boolean isEnabled() {
        if (isDeleted())
            return false;

        return enabledViaEmail || enabledViaPhone;
    }

    public boolean isLocked() {
        if (lockedUntil != null)
            return lockedUntil.isAfter(Instant.now());

        return locked;
    }

    public String getUsername() {
        return switch (firstRegisteredWith) {
            case EMAIL -> email;
            case PHONE -> phone;
        };
    }

    public UserEntity addRole(RoleEntity role) {
        roles.stream()
                .filter(ur -> ur.getRole().equals(role))
                .findAny()
                .ifPresentOrElse(
                        ur -> ur.setRevoked(false),
                        () -> roles.add(UserRoleEntity.builder().user(this).role(role).build()));

        return this;
    }

    public UserEntity revokeRole(RoleEntity role) {
        roles.stream().filter(ur -> ur.getRole().equals(role)).findAny().ifPresent(ur -> ur.setRevoked(true));
        return this;
    }

    public UserEntity addPermission(PermissionEntity permission) {
        permissions.stream()
                .filter(ur -> ur.getPermission().equals(permission))
                .findAny()
                .ifPresentOrElse(
                        ur -> ur.setRevoked(false),
                        () -> permissions
                                .add(UserPermissionEntity.builder().user(this).permission(permission).build()));

        return this;
    }

    public UserEntity revokePermission(PermissionEntity permission) {
        permissions.stream().filter(ur -> ur.getPermission().equals(permission)).findAny()
                .ifPresent(ur -> ur.setRevoked(true));
        return this;
    }

}