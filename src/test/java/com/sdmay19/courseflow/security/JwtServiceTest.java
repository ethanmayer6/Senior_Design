package com.sdmay19.courseflow.security;

import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.Test;

import java.util.Date;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {

    private final JwtService jwtService = new JwtService("dev-only-courseflow-jwt-secret-change-me-2026");

    @Test
    void generateToken_extractsMatchingUserId_andIsValidForThatUser() {
        String token = jwtService.generateToken(42L);

        long extractedUserId = jwtService.extractUserId(token);
        Date expiration = jwtService.extractClaim(token, Claims::getExpiration);

        assertThat(extractedUserId).isEqualTo(42L);
        assertThat(jwtService.isTokenValid(token, 42L)).isTrue();
        assertThat(expiration).isAfter(new Date());
    }

    @Test
    void isTokenValid_returnsFalseForDifferentUserId() {
        String token = jwtService.generateToken(42L);

        assertThat(jwtService.isTokenValid(token, 7L)).isFalse();
    }

    @Test
    void extractUserId_throwsForMalformedToken() {
        assertThatThrownBy(() -> jwtService.extractUserId("not-a-real-token"))
                .isInstanceOf(RuntimeException.class);
    }
}
