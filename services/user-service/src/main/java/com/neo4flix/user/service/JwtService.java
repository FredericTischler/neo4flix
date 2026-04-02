package com.neo4flix.user.service;

import com.neo4flix.user.model.UserEntity;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Service
public class JwtService {

    private static final long ACCESS_TOKEN_EXPIRATION = 15 * 60 * 1000L;       // 15 min
    private static final long REFRESH_TOKEN_EXPIRATION = 7 * 24 * 60 * 60 * 1000L; // 7 days

    private final SecretKey secretKey;

    public JwtService() {
        String secret = System.getenv("JWT_SECRET");
        if (secret == null || secret.isBlank()) {
            secret = "neo4flix-secret-key-change-in-production";
        }
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public String generateAccessToken(UserEntity user) {
        return Jwts.builder()
                .subject(user.getUserId())
                .claim("userId", user.getUserId())
                .claim("username", user.getUsername())
                .claim("roles", user.getRoles())
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + ACCESS_TOKEN_EXPIRATION))
                .signWith(secretKey)
                .compact();
    }

    public String generateRefreshToken(UserEntity user) {
        return Jwts.builder()
                .subject(user.getUserId())
                .claim("userId", user.getUserId())
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + REFRESH_TOKEN_EXPIRATION))
                .signWith(secretKey)
                .compact();
    }

    public Claims validateToken(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public String extractUserId(String token) {
        return validateToken(token).get("userId", String.class);
    }
}