package com.sdmay19.courseflow.security;


import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;

/*
 *
 * This service handles all operations related to JSON Web Tokens (JWTs) for user authentication.
 * It is responsible for generating, parsing, and validating tokens used to securely identify users.
 *
 * Main responsibilities:
 * 1. **Token Generation** — Creates signed JWTs containing the username (subject) and optional claims.
 * 2. **Token Validation** — Verifies the token’s signature, checks expiration, and ensures it matches the user.
 * 3. **Claim Extraction** — Retrieves data (like the username or expiration date) embedded within the token.
 *
 * This service is used by authentication and filter components (e.g., JwtAuthenticationFilter)
 * to issue and verify tokens for stateless, sessionless authentication in the API.
 *
 */

@Service
public class JwtService {

    private static final String DEFAULT_SECRET_KEY = "supersecretkey123456789supersecretkey123456789";
    private final String secretKey;

    public JwtService() {
        this(DEFAULT_SECRET_KEY);
    }

    public JwtService(@Value("${app.jwt.secret:" + DEFAULT_SECRET_KEY + "}") String secretKey) {
        this.secretKey = secretKey;
    }

    private Key getSignKey() {
        return Keys.hmacShaKeyFor(secretKey.getBytes());
    }

    public String generateToken(long id) {
      Map<String, Object> claims = new HashMap<>();
      return createToken(claims, String.valueOf(id)); // convert id → string
  }


    private String createToken(Map<String, Object> claims, String subject) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .setClaims(claims)
                .setSubject(subject)
                .setIssuedAt(new Date(now))
                .setExpiration(new Date(now + 1000 * 60 * 60 * 10)) // 10 h
                .signWith(getSignKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public long extractUserId(String token) {
      String subject = extractClaim(token, Claims::getSubject);
      return Long.parseLong(subject);
  }


    public <T> T extractClaim(String token, Function<Claims, T> resolver) {
        final Claims claims = Jwts.parserBuilder()
                .setSigningKey(getSignKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
        return resolver.apply(claims);
    }

    public boolean isTokenValid(String token, long id) {
      final long extracted = extractUserId(token);
      return (extracted == id && !isTokenExpired(token));
  }


    private boolean isTokenExpired(String token) {
        return extractClaim(token, Claims::getExpiration).before(new Date());
    }
}
