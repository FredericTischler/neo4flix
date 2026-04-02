package com.neo4flix.user.dto;

import jakarta.validation.constraints.NotBlank;

public record TwoFactorVerifyRequest(
        @NotBlank(message = "Temporary token is required")
        String tempToken,

        @NotBlank(message = "TOTP code is required")
        String code
) {
}