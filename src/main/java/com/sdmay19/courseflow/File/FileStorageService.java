package com.sdmay19.courseflow.File;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Objects;

@Service
public class FileStorageService {

    @Value("${file.upload-dir:./uploads/profile-pictures}")
    private String uploadDir;

    public String saveProfilePicture(MultipartFile file, Long userId) throws IOException {

        String filename = "user_" + userId + "_" + System.currentTimeMillis() +
                "." + Objects.requireNonNull(file.getOriginalFilename())
                .split("\\.")[1];

        Path savePath = Paths.get(uploadDir).resolve(filename);
        Files.copy(file.getInputStream(), savePath, StandardCopyOption.REPLACE_EXISTING);

        // Return relative URL for frontend
        return "/uploads/profile-pictures/" + filename;
    }
}
