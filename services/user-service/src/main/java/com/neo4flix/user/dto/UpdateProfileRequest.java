package com.neo4flix.user.dto;

import jakarta.validation.constraints.Email;

public record UpdateProfileRequest(
        String username,

        @Email(message = "Invalid email format")
        String email
) {
}