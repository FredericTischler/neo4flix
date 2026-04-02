package com.neo4flix.user.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record LoginResponse(
        String accessToken,
        String refreshToken,
        Boolean requiresTwoFactor,
        String tempToken
) {
    public static LoginResponse tokens(String accessToken, String refreshToken) {
        return new LoginResponse(accessToken, refreshToken, null, null);
    }

    public static LoginResponse twoFactorRequired(String tempToken) {
        return new LoginResponse(null, null, true, tempToken);
    }
}