package com.sdmay19.courseflow.User;

public record UserSearchResult(
        long id,
        String username,
        String firstName,
        String lastName,
        String preferredName,
        String displayName,
        String major,
        String email,
        String phone,
        String profileHeadline,
        String bio,
        String accentColor,
        String profilePictureUrl) {
}
