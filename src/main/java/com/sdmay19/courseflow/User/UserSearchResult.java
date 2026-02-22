package com.sdmay19.courseflow.User;

public record UserSearchResult(
        long id,
        String username,
        String firstName,
        String lastName,
        String major,
        String profilePictureUrl) {
}
