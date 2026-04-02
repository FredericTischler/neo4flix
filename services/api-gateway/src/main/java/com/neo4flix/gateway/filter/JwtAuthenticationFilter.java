package com.neo4flix.gateway.filter;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.List;

@Component
public class JwtAuthenticationFilter implements GlobalFilter, Ordered {

    private static final List<String> PUBLIC_PATHS = List.of("/api/auth/");

    private final SecretKey secretKey;

    public JwtAuthenticationFilter() {
        String secret = System.getenv("JWT_SECRET");
        if (secret == null || secret.isBlank()) {
            secret = "neo4flix-secret-key-change-in-production";
        }
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String path = exchange.getRequest().getURI().getPath();

        if (isPublicPath(path)) {
            return chain.filter(exchange);
        }

        String authHeader = exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION);

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return onError(exchange, "Missing or invalid Authorization header");
        }

        String token = authHeader.substring(7);

        try {
            Claims claims = Jwts.parser()
                    .verifyWith(secretKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

            String userId = claims.get("userId", String.class);
            if (userId == null) {
                return onError(exchange, "Token missing userId claim");
            }

            ServerHttpRequest mutatedRequest = exchange.getRequest().mutate()
                    .header("X-User-Id", userId)
                    .build();

            return chain.filter(exchange.mutate().request(mutatedRequest).build());
        } catch (Exception e) {
            return onError(exchange, "Invalid or expired token");
        }
    }

    @Override
    public int getOrder() {
        return -1;
    }

    private boolean isPublicPath(String path) {
        return PUBLIC_PATHS.stream().anyMatch(path::startsWith);
    }

    private Mono<Void> onError(ServerWebExchange exchange, String message) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(HttpStatus.UNAUTHORIZED);
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);

        String body = """
                {"status":401,"error":"Unauthorized","message":"%s"}""".formatted(message);

        DataBuffer buffer = response.bufferFactory().wrap(body.getBytes(StandardCharsets.UTF_8));
        return response.writeWith(Mono.just(buffer));
    }
}