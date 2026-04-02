package com.neo4flix.user.dto;

public record RegisterResponse(
        String userId,
        String username,
        String email
) {
}