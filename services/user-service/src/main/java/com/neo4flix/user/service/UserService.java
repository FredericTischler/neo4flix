package com.neo4flix.user.service;

import com.neo4flix.user.dto.*;
import com.neo4flix.user.exception.*;
import com.neo4flix.user.model.UserEntity;
import com.neo4flix.user.repository.UserRepository;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final TotpService totpService;

    public UserService(UserRepository userRepository, TotpService totpService) {
        this.userRepository = userRepository;
        this.totpService = totpService;
    }

    public UserProfileResponse getProfile(String userId) {
        UserEntity user = findByUserId(userId);
        return toProfileResponse(user);
    }

    public UserProfileResponse updateProfile(String userId, UpdateProfileRequest request) {
        UserEntity user = findByUserId(userId);

        if (request.username() != null && !request.username().isBlank()
                && !request.username().equals(user.getUsername())) {
            if (userRepository.existsByUsername(request.username())) {
                throw new UsernameAlreadyExistsException(request.username());
            }
            user.setUsername(request.username());
        }

        if (request.email() != null && !request.email().isBlank()
                && !request.email().equals(user.getEmail())) {
            if (userRepository.existsByEmail(request.email())) {
                throw new EmailAlreadyExistsException(request.email());
            }
            user.setEmail(request.email());
        }

        userRepository.save(user);
        return toProfileResponse(user);
    }

    public UserPublicResponse getPublicProfile(String userId) {
        UserEntity user = findByUserId(userId);
        return new UserPublicResponse(user.getUserId(), user.getUsername());
    }

    public TwoFactorSetupResponse enableTwoFactor(String userId) {
        UserEntity user = findByUserId(userId);
        String secret = totpService.generateSecret();
        user.setTotpSecret(secret);
        userRepository.save(user);

        String qrCodeUri = totpService.generateQrCodeUri(secret, user.getUsername());
        return new TwoFactorSetupResponse(secret, qrCodeUri);
    }

    public void confirmTwoFactor(String userId, String code) {
        UserEntity user = findByUserId(userId);

        if (user.getTotpSecret() == null) {
            throw new InvalidTokenException("2FA not initiated. Call enable-2fa first.");
        }

        if (!totpService.verifyCode(user.getTotpSecret(), code)) {
            throw new InvalidCredentialsException("Invalid 2FA code");
        }

        user.setTwoFactorEnabled(true);
        userRepository.save(user);
    }

    public void disableTwoFactor(String userId) {
        UserEntity user = findByUserId(userId);
        user.setTotpSecret(null);
        user.setTwoFactorEnabled(false);
        userRepository.save(user);
    }

    private UserEntity findByUserId(String userId) {
        return userRepository.findByUserId(userId)
                .orElseThrow(() -> new UserNotFoundException(userId));
    }

    private UserProfileResponse toProfileResponse(UserEntity user) {
        return new UserProfileResponse(
                user.getUserId(),
                user.getUsername(),
                user.getEmail(),
                user.isTwoFactorEnabled(),
                user.getRoles()
        );
    }
}