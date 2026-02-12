package com.sdmay19.courseflow.User;

public class UserPreferencesUpdateRequest {
    private Boolean darkMode;
    private String themePreset;
    private String fontScale;
    private Boolean reducedMotion;

    public Boolean getDarkMode() {
        return darkMode;
    }

    public void setDarkMode(Boolean darkMode) {
        this.darkMode = darkMode;
    }

    public String getThemePreset() {
        return themePreset;
    }

    public void setThemePreset(String themePreset) {
        this.themePreset = themePreset;
    }

    public String getFontScale() {
        return fontScale;
    }

    public void setFontScale(String fontScale) {
        this.fontScale = fontScale;
    }

    public Boolean getReducedMotion() {
        return reducedMotion;
    }

    public void setReducedMotion(Boolean reducedMotion) {
        this.reducedMotion = reducedMotion;
    }
}
