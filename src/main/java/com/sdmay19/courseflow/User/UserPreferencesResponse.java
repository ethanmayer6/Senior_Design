package com.sdmay19.courseflow.User;

public record UserPreferencesResponse(
        boolean darkMode,
        String themePreset,
        String fontScale,
        boolean reducedMotion) {
}
