package dev.rawad.taxi.auth.entities;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.SequenceGenerator;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

@Entity(name = "Role")
@Table(name = "roles")
@AllArgsConstructor
@NoArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString(onlyExplicitlyIncluded = true)
@Getter
@Setter
@Builder
public class RoleEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "roles_seq_gen")
    @SequenceGenerator(name = "roles_seq_gen", sequenceName = "roles_seq_gen", allocationSize = 1)
    @ToString.Include
    @EqualsAndHashCode.Include
    private Long id;

    @Column(unique = true, nullable = false)
    private String name;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private Instant updatedAt;

    @OneToMany(mappedBy = "role", cascade = CascadeType.ALL)
    @Builder.Default
    private Set<RolePermission> permissions = new HashSet<>();

    public RoleEntity addPermission(PermissionEntity permission, Instant expires) {
        permissions.stream()
                .filter(rp -> rp.getPermission().equals(permission))
                .findAny()
                .ifPresentOrElse(
                        rp -> rp.setRevoked(false),
                        () -> permissions.add(RolePermission.builder()
                                .role(this)
                                .permission(permission)
                                .expiresAt(expires)
                                .build()));
        return this;

    }

    public RoleEntity removePermission(PermissionEntity permission) {
        permissions.stream()
                .filter(rp -> rp.getPermission().equals(permission))
                .findAny()
                .ifPresent(rp -> rp.setRevoked(true));
        return this;
    }
}