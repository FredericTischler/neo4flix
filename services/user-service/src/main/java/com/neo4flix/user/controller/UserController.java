package com.neo4flix.user.controller;

import com.neo4flix.user.dto.*;
import com.neo4flix.user.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/me")
    public ResponseEntity<UserProfileResponse> getProfile(@RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.ok(userService.getProfile(userId));
    }

    @PutMapping("/me")
    public ResponseEntity<UserProfileResponse> updateProfile(
            @RequestHeader("X-User-Id") String userId,
            @Valid @RequestBody UpdateProfileRequest request) {
        return ResponseEntity.ok(userService.updateProfile(userId, request));
    }

    @PostMapping("/me/enable-2fa")
    public ResponseEntity<TwoFactorSetupResponse> enableTwoFactor(@RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.ok(userService.enableTwoFactor(userId));
    }

    @PostMapping("/me/confirm-2fa")
    public ResponseEntity<Void> confirmTwoFactor(
            @RequestHeader("X-User-Id") String userId,
            @Valid @RequestBody TwoFactorConfirmRequest request) {
        userService.confirmTwoFactor(userId, request.code());
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/me/disable-2fa")
    public ResponseEntity<Void> disableTwoFactor(@RequestHeader("X-User-Id") String userId) {
        userService.disableTwoFactor(userId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{userId}")
    public ResponseEntity<UserPublicResponse> getPublicProfile(@PathVariable String userId) {
        return ResponseEntity.ok(userService.getPublicProfile(userId));
    }
}