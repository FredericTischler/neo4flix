package com.neo4flix.user.dto;

import jakarta.validation.constraints.NotBlank;

public record TwoFactorConfirmRequest(
        @NotBlank(message = "TOTP code is required")
        String code
) {
}