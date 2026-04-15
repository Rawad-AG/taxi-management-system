# Agent Instructions for taxi-management-system

## Project Overview

This is a Spring Boot 4.0.5 (Java 21) application for managing a taxi system. It uses PostgreSQL, Redis, and RabbitMQ via Docker Compose.

## Build / Lint / Test Commands

### Maven Wrapper

```bash
./mvnw <command>
```

### Build

```bash
./mvnw clean package              # Full build with tests
./mvnw clean package -DskipTests   # Build without running tests
```

### Run

```bash
./mvnw spring-boot:run             # Run the application
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev  # With profile
```

### Test

```bash
./mvnw test                                    # Run all tests
./mvnw test -Dtest=ClassName                  # Run single test class
./mvnw test -Dtest=ClassName#methodName         # Run single test method
./mvnw test -Dtest=ClassName#method1+method2    # Run multiple test methods
./mvnw verify                                  # Run tests and verify
```

### Code Quality

```bash
./mvnw compile                                 # Compile only
./mvnw dependency:tree                         # Show dependency tree
./mvnw dependency:analyze                      # Analyze dependencies
```

## Dependencies & Infrastructure

- **PostgreSQL**: Port 5432 (configured in `compose.yaml`)
- **Redis**: Port 6379
- **RabbitMQ**: Ports 5672 (AMQP), 15672 (Management UI)
- **Swagger UI**: `/swagger-ui.html`
- **OpenAPI Docs**: `/v3/api-docs`

### Docker Compose

```bash
docker compose up -d          # Start infrastructure
docker compose down           # Stop infrastructure
```

## Code Style Guidelines

### Java Version & Annotations

- Use **Java 21** features where appropriate
- Use **jakarta.\*** annotations (not javax.\*) for JPA, validation, and security
- Use Lombok annotations (`@Getter`, `@Setter`, `@NoArgsConstructor`, `@AllArgsConstructor`, etc.)

### Project Structure

```
src/main/java/dev/rawad/taxi/
├── TaxiApplication.java           # Main entry point
├── auth/                          # Authentication module
│   ├── config/                    # Configuration classes
│   ├── entities/                  # JPA entities
│   │   └── ids/                   # Composite key classes (@Embeddable)
│   ├── repositories/              # Spring Data JPA repositories
│   └── user/                      # UserDetails implementation
└── validation/phone/             # Custom validation
    ├── PhoneValidationService.java
    ├── PhoneValidator.java
    └── ValidPhone.java           # Custom @Constraint annotation
```

### Naming Conventions

| Element                | Convention                          | Example                        |
| ---------------------- | ----------------------------------- | ------------------------------ |
| Packages               | lowercase, single words or module   | `dev.rawad.taxi.auth.entities` |
| Classes                | PascalCase                          | `UserEntity`, `AppUserDetails` |
| Entities (JPA @Entity) | PascalCase, singular noun           | `@Entity(name = "User")`       |
| Tables (JPA @Table)    | snake_case, plural                  | `@Table(name = "users")`       |
| Columns                | snake_case                          | `@Column(name = "user_id")`    |
| Sequences              | `<table>_seq_gen`                   | `users_seq_gen`                |
| Methods                | camelCase                           | `isValid()`, `findByEmail()`   |
| Boolean methods        | `is*` or `has*` prefix              | `isEnabled()`, `isDeleted()`   |
| ID classes             | PascalCase with `Id` suffix         | `UserRoleId`                   |
| Repositories           | PascalCase with `Repository` suffix | `UserRepository`               |
| Services               | PascalCase with `Service` suffix    | `PhoneValidationService`       |
| Validators             | PascalCase with `Validator` suffix  | `PhoneValidator`               |
| Annotations            | PascalCase                          | `@ValidPhone`, `@Entity`       |

### JPA Entity Standards

- Always use `@Id` with SEQUENCE generator: `@GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "table_seq_gen")`
- Embeddable IDs must implement `Serializable`
- Use `@EqualsAndHashCode(onlyExplicitlyIncluded = true)` on JPA entities
- Use `@ToString(onlyExplicitlyIncluded = true)` to prevent lazy loading issues
- Include `createdAt` and `updatedAt` with `@CreatedDate` and `@LastModifiedDate`
- Include `deletedAt` for soft deletes
- Boolean fields: use `Boolean` wrapper (nullable) with default values where appropriate

### Repository Standards

- Use Spring Data JPA (`JpaRepository`)
- JPQL queries should use the entity class name (e.g., `UserRoleEntity ur`)
- Use `@Param` for named parameters in queries
- Use multi-line text blocks for JPQL queries (preferred):

```java
@Query("""
    SELECT ur FROM UserRoleEntity ur
    JOIN FETCH ur.role WHERE ur.id.userId=:userId
""")
List<UserRoleEntity> findUserRolesByUserId(@Param("userId") Long userId);
```

### Service & Business Logic

- Use `@Service` annotation for service classes
- Use `@RequiredArgsConstructor` for constructor injection (preferred over `@Autowired` fields)
- Keep business logic in service layer, not in entities

### Validation

- Use Jakarta Validation (`jakarta.validation.constraints.*`)
- Custom constraints follow this pattern:
  1. Annotation interface with `@Constraint(validatedBy = ...)`
  2. Validator class implementing `ConstraintValidator<Annotation, Type>`
  3. Service class for complex validation logic

### Security

- Use `org.jspecify.annotations.Nullable` for nullable annotations (not `@Nullable` from Spring)
- Use `BCryptPasswordEncoder` for password hashing
- Stateless session management with JWT via OAuth2 Resource Server

### Configuration

- Use `application.yaml` for Spring configuration
- Environment variables with defaults: `${ENV_VAR:default_value}`
- Structure config with section comments: `# ============================================`

### Import Organization

Imports should follow this order (blank line between groups):

1. `java.*` imports
2. Third-party imports (`org.*`, `com.*`)
3. Spring imports (`org.springframework.*`)
4. Project imports (`dev.rawad.taxi.*`)

### Error Handling

- Use `@Nullable` annotations for methods that may return null
- Throw appropriate exceptions (e.g., `UsernameNotFoundException` in `UserDetailsService`)
- Consider custom exceptions for domain-specific errors

### Testing

- Use `@SpringBootTest` for integration tests
- Use `@Test` from `org.junit.jupiter.api.Test`
- Test class naming: `<ClassName>Tests` or `<ClassName>IT` for integration tests

## Important Notes

- **Hibernate DDL**: Set to `validate` in application.yaml - migrations managed by Flyway
- **Package scanning**: Ensure new packages are under `dev.rawad.taxi` for component scanning
- **No existing migrations**: The `db/migration/` directory is empty; create Flyway migrations as needed
