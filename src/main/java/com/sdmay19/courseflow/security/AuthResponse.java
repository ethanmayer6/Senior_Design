package com.sdmay19.courseflow.security;

import com.sdmay19.courseflow.User.AppUser;

/*
 *
 * This record represents the response object returned after a successful authentication
 * (such as login or token refresh). It bundles together:
 *
 * 1. `token` — the generated JWT used for authorizing subsequent requests.
 * 2. `user`  — the authenticated user's information (AppUser), typically excluding the password.
 *
 */

public record AuthResponse(String token, AppUser user) {}
