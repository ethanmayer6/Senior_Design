package com.sdmay19.courseflow.security;

import com.sdmay19.courseflow.user.User;

public record AuthResponse(String token, User user) {}
