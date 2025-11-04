package com.sdmay19.courseflow.major;

import com.sdmay19.courseflow.exception.major.MajorNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class MajorService {

    private MajorRepository majorRepository;

    public MajorService(MajorRepository majorRepository) {
        this.majorRepository = majorRepository;
    }

    // CREATE
    public Major createMajor(Major major) {
        return major;
    }

    // READ
    public List<Major> getAllMajors() {
        return majorRepository.findAll();
    }
    public Major getMajorById(long id) {
        return majorRepository.findById(id)
                .orElseThrow(() -> new MajorNotFoundException("Majors not found"));
    }
    public Major getMajorByName(String name) {
        return majorRepository.findByName(name)
                .orElseThrow(() -> new MajorNotFoundException("Major" + name + "not found"));
    }

}
