package com.sdmay19.courseflow.major;

import com.sdmay19.courseflow.degree_requirement.DegreeRequirement;
import com.sdmay19.courseflow.degree_requirement.DegreeRequirementService;
import com.sdmay19.courseflow.exception.major.MajorCreationException;
import com.sdmay19.courseflow.exception.major.MajorNotFoundException;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class MajorService {

    private MajorRepository majorRepository;
    private DegreeRequirementService degreeRequirementService;

    public MajorService(MajorRepository majorRepository, DegreeRequirementService degreeRequirementService) {
        this.majorRepository = majorRepository;
        this.degreeRequirementService = degreeRequirementService;
    }

    // CREATE
    public Major createMajor(MajorDTO majorDTO) {
        checkMajor(majorDTO);
        return majorRepository.save(new Major(majorDTO.getName(), majorDTO.getCollege(), majorDTO.getDescription(), getDegreeRequirements(majorDTO.getDegreeRequirements())));
    }
    public void checkMajor(MajorDTO majorDTO) throws MajorCreationException {
        if (majorDTO.getName() == null || majorDTO.getName().isEmpty()) {
            throw new MajorCreationException("Invalid Major Name");
        }
        if (majorDTO.getDescription() == null || majorDTO.getDescription().isEmpty()) {
            throw new MajorCreationException("Invalid Major Description");
        }
        if (majorDTO.getDegreeRequirements().isEmpty()) {
            throw new MajorCreationException("Invalid Major Degree Requirements");
        }
        if (majorDTO.getCollege() == null) {
            throw new MajorCreationException("Invalid Major College");
        }
    }
    public List<DegreeRequirement> getDegreeRequirements(List<String> requirementNames) {
        return degreeRequirementService.getAllByName(requirementNames);
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

    // UPDATE
//    public Major updateMajor(MajorUpdator updator) {
//
//    }

}
