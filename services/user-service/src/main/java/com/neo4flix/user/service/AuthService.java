package com.neo4flix.user.service;

import com.neo4flix.user.dto.*;
import com.neo4flix.user.exception.*;
import com.neo4flix.user.model.UserEntity;
import com.neo4flix.user.repository.UserRepository;
import com.neo4flix.user.validation.PasswordValidator;
import io.jsonwebtoken.Claims;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final TotpService totpService;
    private final PasswordValidator passwordValidator;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       TotpService totpService,
                       PasswordValidator passwordValidator) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.totpService = totpService;
        this.passwordValidator = passwordValidator;
    }

    public RegisterResponse register(RegisterRequest request) {
        List<String> violations = passwordValidator.validate(request.password());
        if (!violations.isEmpty()) {
            throw new PasswordValidationException(violations);
        }

        if (userRepository.existsByUsername(request.username())) {
            throw new UsernameAlreadyExistsException(request.username());
        }

        if (userRepository.existsByEmail(request.email())) {
            throw new EmailAlreadyExistsException(request.email());
        }

        UserEntity user = new UserEntity();
        user.setUserId(UUID.randomUUID().toString());
        user.setUsername(request.username());
        user.setEmail(request.email());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setTwoFactorEnabled(false);
        user.setRoles(List.of("USER"));

        userRepository.save(user);

        return new RegisterResponse(user.getUserId(), user.getUsername(), user.getEmail());
    }

    public LoginResponse login(LoginRequest request) {
        UserEntity user = userRepository.findByUsername(request.username())
                .orElseThrow(InvalidCredentialsException::new);

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new InvalidCredentialsException();
        }

        if (user.isTwoFactorEnabled()) {
            String tempToken = jwtService.generateTempToken(user);
            return LoginResponse.twoFactorRequired(tempToken);
        }

        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);
        return LoginResponse.tokens(accessToken, refreshToken);
    }

    public AuthResponse verifyTwoFactor(TwoFactorVerifyRequest request) {
        Claims claims;
        try {
            claims = jwtService.validateTempToken(request.tempToken());
        } catch (Exception e) {
            throw new InvalidTokenException("Invalid or expired temporary token");
        }

        String userId = claims.get("userId", String.class);
        UserEntity user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new InvalidTokenException("User not found"));

        if (!totpService.verifyCode(user.getTotpSecret(), request.code())) {
            throw new InvalidCredentialsException("Invalid 2FA code");
        }

        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);
        return new AuthResponse(accessToken, refreshToken);
    }

    public AuthResponse refresh(RefreshRequest request) {
        String userId;
        try {
            userId = jwtService.extractUserId(request.refreshToken());
        } catch (Exception e) {
            throw new InvalidTokenException("Invalid or expired refresh token");
        }

        UserEntity user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new InvalidTokenException("User not found"));

        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);
        return new AuthResponse(accessToken, refreshToken);
    }
}