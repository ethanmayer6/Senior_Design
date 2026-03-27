package com.sdmay19.courseflow.File;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

class FileStorageServiceTest {

    @TempDir
    Path tempDir;

    @Test
    void saveProfilePicture_persistsFileAndReturnsPublicUploadPath() throws Exception {
        FileStorageService service = new FileStorageService();
        ReflectionTestUtils.setField(service, "uploadDir", tempDir.toString());

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "avatar.png",
                "image/png",
                "image-bytes".getBytes(StandardCharsets.UTF_8));

        String savedPath = service.saveProfilePicture(file, 42L);

        assertThat(savedPath)
                .startsWith("/uploads/profile-pictures/user_42_")
                .endsWith(".png");

        Path storedFile = tempDir.resolve(savedPath.substring(savedPath.lastIndexOf('/') + 1));
        assertThat(storedFile).exists();
        assertThat(Files.readString(storedFile)).isEqualTo("image-bytes");
    }
}
