package dev.rawad.taxi.auth.controllers;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import dev.rawad.taxi.auth.dto.ChangePasswordRequest;
import dev.rawad.taxi.auth.dto.LoginRequest;
import dev.rawad.taxi.auth.dto.RegisterRequest;
import dev.rawad.taxi.auth.dto.UpdatePasswordRequest;
import dev.rawad.taxi.auth.user.AppUserDetails;
import dev.rawad.taxi.auth.user.AppUserDetailsService;
import dev.rawad.taxi.shared.responder.ApiResponseTemplate;
import dev.rawad.taxi.shared.responder.Responder;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.headers.Header;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication Management", description = "contains all the APIs related to authentication for users")
public class AuthController {
        private final AppUserDetailsService service;
        private final Responder responder;

        // ================================
        @Operation(summary = "Register User", description = "Signup users via (email or phone), returns the user id in case of correctly signed up", deprecated = true)
        @ApiResponses(value = {
                        @ApiResponse(responseCode = "200", description = "Successfully registered"),
        })
        @PostMapping("/register")
        public ResponseEntity<ApiResponseTemplate> register(@Valid @RequestBody RegisterRequest dto) {
                Long id = service.register(dto).getId();
                return responder.addToData("userId", id).message("auth.new.register").ok();
        }
        // ================================

        // ================================
        @Operation(summary = "Validate OTP codes", description = "after register the user, and OTP code will be sent, after validating it the user becomes enabled and able to login")
        @ApiResponses(value = {
                        @ApiResponse(responseCode = "200", description = "Successfully validated, and OTP code is sent"),
        })
        @GetMapping("/otp/validate")
        public ResponseEntity<ApiResponseTemplate> validateOTP(@RequestParam String otp, @RequestParam Long id) {
                service.validateOTP(otp, id);
                return responder.message("auth.otp.validated").ok();
        }
        // ================================

        // ================================
        @Operation(summary = "Login User", description = "login with username(email or phone) and password, a refresh token is sent back")
        @ApiResponses(value = {
                        @ApiResponse(responseCode = "200", description = "Successfully Logged in", headers = {
                                        @Header(name = "authorization", description = "refresh token for exchange with access tokens")
                        }),
        })
        @PostMapping("/login")
        public ResponseEntity<ApiResponseTemplate> login(@Valid @RequestBody LoginRequest dto) {
                return responder.addHeader("authorization", service.login(dto)).ok();
        }
        // ================================

        // ================================
        @Operation(summary = "Refresh Token", description = "exchange the refresh token with new access tokens")
        @ApiResponses(value = {
                        @ApiResponse(responseCode = "200", description = "Successfully Validated", headers = {
                                        @Header(name = "token", description = "access token used to access protected APIs")
                        }),
        })
        @GetMapping("/refresh")
        public ResponseEntity<ApiResponseTemplate> refresh(@RequestHeader("x-refresh-token") String token) {
                return responder.addHeader("token", service.refresh(token)).ok();
        }
        // ================================

        // ================================
        @Operation(summary = "Forget Password", description = "for forget password cases, hit this url with the username provided to launch forget password flow")
        @ApiResponses(value = {
                        @ApiResponse(responseCode = "200", description = "a code is sent to the user main registration way (email or phone)", content = @Content(mediaType = "application/json", schema = @Schema(name = "userId", description = "the id of the user, this id is used for validating the code in the next step")))
        })
        @GetMapping("/password/forget")
        public ResponseEntity<ApiResponseTemplate> forgetPassword(@RequestParam String username) {
                Long userId = service.forgetPassword(username);
                return responder.addToData("userId", userId).ok();
        }
        // ================================

        // ================================
        @Operation(summary = "Reset password", description = "after forgetting the password use this API to validate the code and receive a reset password token")
        @ApiResponses(value = {
                        @ApiResponse(responseCode = "200", description = "Successfully Validated", headers = @Header(name = "token", description = "password reset token used to change the password")),
        })
        @PostMapping("/password/reset")
        public ResponseEntity<ApiResponseTemplate> resetPassword(@RequestParam Long userId, @RequestParam String code) {
                return responder.addHeader("token", service.resetPassword(userId, code)).ok();
        }
        // ================================

        // ================================
        @Operation(summary = "Change password", description = "to change the password use this API to receive a reset password token")
        @ApiResponses(value = {
                        @ApiResponse(responseCode = "200", description = "Successfully Validated", headers = @Header(name = "token", description = "password reset token used to change the password")),
        })
        @PostMapping("/password/change")
        public ResponseEntity<ApiResponseTemplate> changePassword(@AuthenticationPrincipal AppUserDetails user,
                        @Valid @RequestBody ChangePasswordRequest dto) {
                return responder.addHeader("token", service.changePassword(dto, user)).ok();
        }
        // ================================

        // ================================
        @Operation(summary = "Update password", description = "the last step of the password changing/forgetting flow")
        @ApiResponses(value = {
                        @ApiResponse(responseCode = "200", description = "Successfully Validated (NOTE: the user is logged out from all his sessions)"),
        })
        @PostMapping("/password/update")
        public ResponseEntity<ApiResponseTemplate> updatePassword(
                        @RequestHeader("x-reset-password") String token,
                        @Valid @RequestBody UpdatePasswordRequest dto) {
                service.updatePassword(dto, token);
                return responder.ok();
        }
        // ================================

}
