package com.neo4flix.user.dto;

public record AuthResponse(
        String accessToken,
        String refreshToken
) {
}