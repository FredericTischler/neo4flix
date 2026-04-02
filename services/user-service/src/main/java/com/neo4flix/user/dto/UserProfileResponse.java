package com.neo4flix.user.dto;

import java.util.List;

public record UserProfileResponse(
        String userId,
        String username,
        String email,
        boolean twoFactorEnabled,
        List<String> roles
) {
}