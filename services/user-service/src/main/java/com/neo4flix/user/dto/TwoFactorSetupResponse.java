package com.neo4flix.user.dto;

public record TwoFactorSetupResponse(
        String secret,
        String qrCodeUri
) {
}