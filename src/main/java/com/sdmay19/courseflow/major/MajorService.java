package com.sdmay19.courseflow.major;

import com.sdmay19.courseflow.degree_requirement.DegreeRequirement;
import com.sdmay19.courseflow.degree_requirement.DegreeRequirementRepository;
import com.sdmay19.courseflow.degree_requirement.DegreeRequirementService;
import com.sdmay19.courseflow.exception.major.MajorCreationException;
import com.sdmay19.courseflow.exception.major.MajorNotFoundException;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class MajorService {

    private final DegreeRequirementRepository degreeRequirementRepository;
    private final DegreeRequirementService degreeRequirementService;
    private final MajorRepository majorRepository;

    public MajorService(MajorRepository majorRepository, DegreeRequirementService degreeRequirementService, DegreeRequirementRepository degreeRequirementRepository) {
        this.majorRepository = majorRepository;
        this.degreeRequirementService = degreeRequirementService;
        this.degreeRequirementRepository = degreeRequirementRepository;
    }

    // CREATE
    public Major createMajor(MajorDTO majorDTO) {
        Major major = buildMajor(majorDTO);
        checkMajor(major);
        majorRepository.save(major);
        degreeRequirementService.addMajorRelationship(majorDTO.getDegreeRequirements(), major);
        return major;
    }
    public void checkMajor(Major major) throws MajorCreationException {
        if (major.getName() == null || major.getName().isEmpty()) {
            throw new MajorCreationException("Invalid Major Name");
        }
        if (major.getDescription() == null || major.getDescription().isEmpty()) {
            throw new MajorCreationException("Invalid Major Description");
        }
        if (major.getDegreeRequirements().isEmpty()) {
            throw new MajorCreationException("Invalid Major Degree Requirements");
        }
        if (major.getCollege() == null) {
            throw new MajorCreationException("Invalid Major College");
        }
    }
    public List<DegreeRequirement> getDegreeRequirements(List<String> requirementNames) {
        return degreeRequirementService.getAllByName(requirementNames);
    }
    public Major buildMajor(MajorDTO majorDTO) {
        List<DegreeRequirement> requirements = getDegreeRequirements(majorDTO.getDegreeRequirements());
        return new Major(majorDTO.getName(), majorDTO.getCollege(), majorDTO.getDescription(), requirements);
    }

    // READ
    public List<Major> getAllMajors() {
        return majorRepository.findAll();
    }
    public List<String> getAllMajorNames() {
        return majorRepository.findAllMajorNames();
    }
    public Major getMajorById(long id) {
        return majorRepository.findById(id)
                .orElseThrow(() -> new MajorNotFoundException("Major with Id " + id + " not found"));
    }
    public Major getMajorByName(String name) {
        return majorRepository.findByName(name)
                .orElseThrow(() -> new MajorNotFoundException("Major with name " + name + " not found"));
    }

    // UPDATE
    @Transactional
    public Major updateMajor(long id, MajorDTO updater) {
        Major major = majorRepository.findById(id)
                .orElseThrow(() -> new MajorNotFoundException("Major with Id " + id + " not found"));

        if (updater.getName() != null) {
            major.setName(updater.getName());
        }
        if (updater.getCollege() != null) {
            major.setCollege(updater.getCollege());
        }
        if (updater.getDescription() != null) {
            major.setDescription(updater.getDescription());
        }
        if (updater.getDegreeRequirements() != null) {
            List<DegreeRequirement> newRequirements =
                    degreeRequirementRepository.findAllByNameIn(updater.getDegreeRequirements());

            major.getDegreeRequirements().clear();
            major.getDegreeRequirements().addAll(newRequirements);
        }

        return majorRepository.save(major);
    }

    // Delete
    @Transactional
    public void deleteById(long id) { majorRepository.deleteById(id); }
}
