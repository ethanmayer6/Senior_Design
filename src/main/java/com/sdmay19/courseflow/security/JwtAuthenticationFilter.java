package com.sdmay19.courseflow.security;

import java.io.IOException;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.sdmay19.courseflow.User.AppUser;
import com.sdmay19.courseflow.User.UserService;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/*
 *
 * This filter runs once per incoming HTTP request to validate JSON Web Tokens (JWTs)
 * included in the Authorization header. It performs the following steps:
 *
 * 1. Checks for an "Authorization" header that starts with "Bearer ".
 * 2. Extracts and parses the JWT using JwtService to obtain the username (usually the email).
 * 3. If no authentication is currently set in the SecurityContext, it loads the corresponding
 *    AppUser from the database via UserService.
 * 4. Validates the token (expiration, signature, etc.) using JwtService.
 * 5. If the token is valid, creates a UsernamePasswordAuthenticationToken and sets it in the
 *    SecurityContext, effectively authenticating the user for the current request.
 *
 * This ensures that protected endpoints can be accessed only by users with valid JWTs,
 * and it allows Spring Security to recognize the authenticated user throughout the request.
 */

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    @Autowired
    private JwtService jwtService;

    @Autowired
    @Lazy
    private UserService userDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        String path = request.getServletPath();
        if (path.startsWith("/api/users/login") ||
            path.startsWith("/api/users/register") ||
            path.startsWith("/api/ping") ||
            path.startsWith("/testdata")
        ) {
            filterChain.doFilter(request, response);
            return;
        }

        final String authHeader = request.getHeader("Authorization");
        final String jwt;
        final String email;

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        jwt = authHeader.substring(7);
        email = jwtService.extractEmail(jwt);

        if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {
           AppUser user = userDetailsService.getUserByEmail(email);
if (jwtService.isTokenValid(jwt, email)) {
    UsernamePasswordAuthenticationToken authToken =
            new UsernamePasswordAuthenticationToken(
                    user, null, List.of());
                authToken.setDetails(
                        new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authToken);
            }
        }
        filterChain.doFilter(request, response);
    }
}
