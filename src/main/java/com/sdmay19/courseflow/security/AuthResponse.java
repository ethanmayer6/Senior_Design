package com.sdmay19.courseflow.security;

import com.sdmay19.courseflow.user.AppUser;

public record AuthResponse(String token, AppUser user) {}
