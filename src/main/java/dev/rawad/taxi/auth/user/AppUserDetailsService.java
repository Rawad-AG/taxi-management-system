package dev.rawad.taxi.auth.user;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.rawad.taxi.auth.dto.ChangePasswordRequest;
import dev.rawad.taxi.auth.dto.LoginRequest;
import dev.rawad.taxi.auth.dto.RegisterRequest;
import dev.rawad.taxi.auth.dto.UpdatePasswordRequest;
import dev.rawad.taxi.auth.dto.UserMapper;
import dev.rawad.taxi.auth.entities.UserEntity;
import dev.rawad.taxi.auth.entities.redis.AuthRedis;
import dev.rawad.taxi.auth.enums.AuthRedisType;
import dev.rawad.taxi.auth.enums.RegisteredWith;
import dev.rawad.taxi.auth.repositories.UserRepository;
import dev.rawad.taxi.auth.repositories.redis.AuthRedisRepository;
import dev.rawad.taxi.auth.token.OtpGenerator;
import dev.rawad.taxi.auth.token.TokenService;
import dev.rawad.taxi.notification.EmailNotifier;
import dev.rawad.taxi.notification.SMSNotifier;
import dev.rawad.taxi.shared.exception.http.BadRequestException;
import dev.rawad.taxi.shared.exception.http.UnauthorizedException;
import dev.rawad.taxi.validation.phone.PhoneValidationService;
import lombok.RequiredArgsConstructor;

@Service
@Transactional
@RequiredArgsConstructor
public class AppUserDetailsService implements UserDetailsService {
    private final UserRepository userRepository;
    private final PhoneValidationService phoneValidationService;
    private final UserMapper mapper;
    private final BCryptPasswordEncoder encoder;
    private final OtpGenerator otpGenerator;
    private final EmailNotifier emailNotifier;
    private final SMSNotifier smsNotifier;
    private final TokenService tokenService;
    private final AuthRedisRepository authRedisRepository;

    @Qualifier("defaultDecoder")
    @Autowired
    private JwtDecoder jwtDecoder;

    @Override
    public AppUserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        UserEntity user = null;
        if (username.contains("@"))
            user = userRepository.findByEmail(username).get();

        else if (phoneValidationService.isValid(username, "sy"))
            user = userRepository.findByPhone(username).get();

        if (user == null)
            throw new UsernameNotFoundException(username);

        var appUser = new AppUserDetails(user, userRepository);
        validateUser(appUser);
        return appUser;
    }

    private void validateUser(AppUserDetails user) {
        if (!user.isEnabled())
            throw new UnauthorizedException("auth.login.disabled");
        if (!user.isAccountNonLocked())
            throw new UnauthorizedException("auth.login.locked", user.getUser().getLockedUntil());
        if (!user.isAccountNonExpired())
            throw new UnauthorizedException("auth.login.deleted", user.getUser());
    }

    public AppUserDetails processOAuth2User(String email) {
        var user = userRepository.findByEmail(email)
                .map(existingUser -> userRepository.save(existingUser))
                .orElseGet(() -> {
                    UserEntity newUser = new UserEntity();
                    newUser.setEmail(email);
                    newUser.setFirstRegisteredWith(RegisteredWith.EMAIL);
                    return userRepository.save(newUser);
                });

        return new AppUserDetails(user, userRepository);
    }

    public UserEntity register(RegisterRequest dto) {
        var user = mapper.map(dto);
        if (user.getEmail() != null)
            return registerWithEmail(user);

        if (user.getPhone() != null)
            return registerWithPhone(user);

        throw new BadRequestException("error.auth.register.missing.username");
    }

    private UserEntity registerWithPhone(UserEntity user) {
        return userRepository.findByPhone(user.getPhone())
                .map(u -> {
                    if (u.isEnabled())
                        throw new BadRequestException("error.auth.register.user.enabled", u.getPhone());

                    var code = otpGenerator.generateOTP(u, RegisteredWith.PHONE);
                    smsNotifier.send(u.getPhone(), code);
                    return u;
                })
                .orElseGet(() -> {
                    user.setPassword(encoder.encode(user.getPassword()));
                    user.setFirstRegisteredWith(RegisteredWith.PHONE);

                    var savedUser = userRepository.save(user);
                    var code = otpGenerator.generateOTP(savedUser, RegisteredWith.PHONE);
                    smsNotifier.send(savedUser.getPhone(), code);
                    return savedUser;
                });
    }

    private UserEntity registerWithEmail(UserEntity user) {
        return userRepository.findByEmail(user.getEmail())
                .map(u -> {
                    if (u.isEnabled())
                        throw new BadRequestException("error.auth.register.user.enabled", u.getEmail());

                    String code = otpGenerator.generateOTP(u, RegisteredWith.EMAIL);
                    emailNotifier.send(u.getEmail(), code);
                    return u;
                })
                .orElseGet(() -> {
                    user.setPassword(encoder.encode(user.getPassword()));
                    user.setFirstRegisteredWith(RegisteredWith.EMAIL);

                    var savedUser = userRepository.save(user);
                    var code = otpGenerator.generateOTP(savedUser, RegisteredWith.EMAIL);
                    emailNotifier.send(savedUser.getEmail(), code);
                    return savedUser;
                });
    }

    public void validateOTP(String code, Long id) {
        var user = userRepository.findById(id).orElseThrow();
        if (user.isEnabled())
            throw new BadRequestException("error.auth.register.user.enabled", user.getId());

        var otp = authRedisRepository.findByUserIdAndType(user.getId(), AuthRedisType.OTP).orElseThrow();

        if (!otp.getCode().equals(code)) {
            if (otp.getTries() > 2) {
                authRedisRepository.delete(otp);
                throw new BadRequestException("error.auth.otp.to-many-tries");
            }

            otp.setTries(otp.getTries() + 1);
            throw new BadRequestException("error.auth.otp.incorrect");
        }

        if (otp.getVia() == RegisteredWith.EMAIL)
            user.setEnabledViaEmail(true);

        if (otp.getVia() == RegisteredWith.PHONE)
            user.setEnabledViaPhone(true);
    }

    public String login(LoginRequest dto) {
        var user = loadUserByUsername(dto.username());

        authRedisRepository.findByUserIdAndType(user.getUser().getId(),
                AuthRedisType.LOGIN_TRIES)
                .ifPresent(l -> {
                    if (l.getTries() > 2)
                        throw new UnauthorizedException("error.auth.login.to-many-tries");
                });

        if (!encoder.matches(dto.password(), user.getPassword())) {
            authRedisRepository.findByUserIdAndType(user.getUser().getId(), AuthRedisType.LOGIN_TRIES)
                    .ifPresentOrElse(
                            l -> {
                                l.setTries(l.getTries() + 1);
                                authRedisRepository.save(l);
                            },
                            () -> {
                                authRedisRepository.save(AuthRedis.builder()
                                        .userId(user.getUser().getId())
                                        .type(AuthRedisType.LOGIN_TRIES)
                                        .tries(1)
                                        .build());
                            });
            throw new UnauthorizedException("error.auth.login.invalid-credentials", user.getUser().getLockedUntil());
        }

        return tokenService.generateToken(user);
    }

    public String refresh(String token) {
        Jwt jwt = jwtDecoder.decode(token);
        if (!"refresh".equals(jwt.getClaim("type")))
            throw new UnauthorizedException("error.auth.login.token.invalid");

        var user = loadUserByUsername(jwt.getSubject());
        Long userId = user.getUser().getId();
        var cache = authRedisRepository.findByUserIdAndType(userId, AuthRedisType.REFRESH_TOKEN).orElseThrow();

        if (!cache.getIssuedAt().truncatedTo(ChronoUnit.SECONDS).equals(jwt.getIssuedAt()))
            throw new UnauthorizedException("error.auth.login.token.invalid", userId);

        return tokenService.generateAccessToken(user);
    }

    public Long forgetPassword(String username) {
        var user = loadUserByUsername(username);
        String code = otpGenerator.generateForgetPasswordCode(user.getUser());

        switch (user.getUser().getFirstRegisteredWith()) {
            case PHONE -> smsNotifier.send(username, code);
            case EMAIL -> emailNotifier.send(username, code);
        }

        return user.getUser().getId();
    }

    public String resetPassword(Long userId, String code) {
        var user = userRepository.findById(userId).orElseThrow();

        var ctx = authRedisRepository.findByUserIdAndType(userId, AuthRedisType.FORGET_PASSWORD).orElseThrow();

        if (!ctx.getCode().equals(code)) {
            if (ctx.getTries() > 2) {
                throw new BadRequestException("error.auth.forget-password.to-many-tries");
            }

            ctx.setTries(ctx.getTries() + 1);
            throw new BadRequestException("error.auth.forget-password.incorrect");
        }

        authRedisRepository.deleteById(userId);
        return tokenService.generateUpdatePasswordToken(user.getUsername());
    }

    public String changePassword(ChangePasswordRequest dto, AppUserDetails user) {
        if (user == null)
            throw new UnauthorizedException("error.unauthorized");

        return tokenService.generateUpdatePasswordToken(user.getUsername());
    }

    public void updatePassword(UpdatePasswordRequest dto, String token) {
        Jwt jwt = jwtDecoder.decode(token);
        if (!"update-password".equals(jwt.getClaim("type")))
            throw new UnauthorizedException("error.auth.login.token.invalid");

        var user = loadUserByUsername(jwt.getSubject());

        authRedisRepository.deleteById(user.getUser().getId());
        user.getUser().setPassword(encoder.encode(dto.newPass()));
        user.getUser().setPasswordUpdatedAt(Instant.now());
    }
}
