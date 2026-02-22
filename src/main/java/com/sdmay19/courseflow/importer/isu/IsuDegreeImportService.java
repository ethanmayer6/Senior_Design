package com.sdmay19.courseflow.importer.isu;

import com.sdmay19.courseflow.course.Course;
import com.sdmay19.courseflow.course.CourseRepository;
import com.sdmay19.courseflow.degree_requirement.DegreeRequirement;
import com.sdmay19.courseflow.degree_requirement.DegreeRequirementRepository;
import com.sdmay19.courseflow.major.College;
import com.sdmay19.courseflow.major.Major;
import com.sdmay19.courseflow.major.MajorRepository;
import com.sdmay19.courseflow.requirement_group.RequirementGroup;
import com.sdmay19.courseflow.requirement_group.RequirementGroupRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Service
public class IsuDegreeImportService {
    private final CourseRepository courseRepository;
    private final MajorRepository majorRepository;
    private final DegreeRequirementRepository degreeRequirementRepository;
    private final RequirementGroupRepository requirementGroupRepository;

    public IsuDegreeImportService(
            CourseRepository courseRepository,
            MajorRepository majorRepository,
            DegreeRequirementRepository degreeRequirementRepository,
            RequirementGroupRepository requirementGroupRepository) {
        this.courseRepository = courseRepository;
        this.majorRepository = majorRepository;
        this.degreeRequirementRepository = degreeRequirementRepository;
        this.requirementGroupRepository = requirementGroupRepository;
    }

    @Transactional
    public IsuDegreeImportResult importDataset(IsuDegreeDataset dataset) {
        if (dataset == null) {
            throw new IllegalArgumentException("Import dataset cannot be null.");
        }

        IsuDegreeImportResult result = new IsuDegreeImportResult();
        Map<String, Course> courseCache = upsertCourses(dataset.courses(), result);
        upsertMajors(dataset.majors(), courseCache, result);
        return result;
    }

    @Transactional
    public IsuDegreeImportResult importCoursesOnly(IsuDegreeDataset dataset) {
        if (dataset == null) {
            throw new IllegalArgumentException("Import dataset cannot be null.");
        }
        if (dataset.courses() == null || dataset.courses().isEmpty()) {
            throw new IllegalArgumentException(
                    "Dataset contains no courses. Regenerate with --include-courses before running course import.");
        }
        IsuDegreeImportResult result = new IsuDegreeImportResult();
        upsertCourses(dataset.courses(), result);
        return result;
    }

    @Transactional
    public IsuDegreeImportResult importMajorsOnly(IsuDegreeDataset dataset) {
        if (dataset == null) {
            throw new IllegalArgumentException("Import dataset cannot be null.");
        }

        IsuDegreeImportResult result = new IsuDegreeImportResult();
        Map<String, Course> courseCache = preloadReferencedCourses(dataset.majors());
        upsertMajors(dataset.majors(), courseCache, result);
        return result;
    }

    private Map<String, Course> upsertCourses(List<IsuDegreeDataset.CourseImport> courses, IsuDegreeImportResult result) {
        Map<String, Course> cache = new HashMap<>();
        if (courses == null) {
            return cache;
        }

        Map<String, IsuDegreeDataset.CourseImport> normalizedImports = new LinkedHashMap<>();
        for (IsuDegreeDataset.CourseImport item : courses) {
            if (item == null || isBlank(item.courseIdent()) || isBlank(item.name())) {
                result.addWarning("Skipped course with missing courseIdent or name.");
                continue;
            }
            normalizedImports.put(normalizeIdent(item.courseIdent()), item);
        }
        if (normalizedImports.isEmpty()) {
            return cache;
        }

        List<String> idents = new ArrayList<>(normalizedImports.keySet());
        List<Course> existingCourses = courseRepository.findAllByCourseIdentIn(idents);
        Map<String, Course> existingByIdent = new HashMap<>();
        for (Course existing : existingCourses) {
            if (existing != null && !isBlank(existing.getCourseIdent())) {
                existingByIdent.put(normalizeIdent(existing.getCourseIdent()), existing);
            }
        }

        int createdCount = 0;
        int updatedCount = 0;
        List<Course> toPersist = new ArrayList<>(normalizedImports.size());
        for (Map.Entry<String, IsuDegreeDataset.CourseImport> entry : normalizedImports.entrySet()) {
            String ident = entry.getKey();
            IsuDegreeDataset.CourseImport item = entry.getValue();
            Course course = existingByIdent.getOrDefault(ident, new Course());
            boolean isNew = !existingByIdent.containsKey(ident);

            course.setCourseIdent(ident);
            course.setName(item.name().trim());
            course.setCredits(item.credits() == null ? 0 : Math.max(0, item.credits()));
            course.setPrereq_txt(emptyToNull(item.prereqTxt()));
            course.setDescription(defaultDescription(item.description(), ident));
            course.setHours(emptyToNull(item.hours()));
            course.setOffered(emptyToNull(item.offered()));

            Set<String> prerequisites = new HashSet<>();
            if (item.prerequisites() != null) {
                for (String prereq : item.prerequisites()) {
                    String normalized = normalizeIdent(prereq);
                    if (!normalized.isBlank() && !normalized.equals(ident)) {
                        prerequisites.add(normalized);
                    }
                }
            }
            course.setPrerequisites(prerequisites);

            if (isNew) {
                createdCount++;
            } else {
                updatedCount++;
            }
            toPersist.add(course);
        }

        List<Course> savedCourses = courseRepository.saveAll(toPersist);
        for (Course saved : savedCourses) {
            if (saved != null && !isBlank(saved.getCourseIdent())) {
                cache.put(normalizeIdent(saved.getCourseIdent()), saved);
            }
        }

        for (int i = 0; i < createdCount; i++) {
            result.incrementCoursesCreated();
        }
        for (int i = 0; i < updatedCount; i++) {
            result.incrementCoursesUpdated();
        }
        return cache;
    }

    private void upsertMajors(
            List<IsuDegreeDataset.MajorImport> majors,
            Map<String, Course> courseCache,
            IsuDegreeImportResult result) {
        if (majors == null) {
            return;
        }
        if (courseCache == null) {
            courseCache = new HashMap<>();
        }

        // Preload all referenced course rows once and create any missing placeholders in batch.
        Set<String> referenced = collectReferencedCourseIdents(majors);
        if (!referenced.isEmpty()) {
            List<Course> existingCourses = courseRepository.findAllByCourseIdentIn(new ArrayList<>(referenced));
            for (Course existing : existingCourses) {
                if (existing != null && !isBlank(existing.getCourseIdent())) {
                    courseCache.put(normalizeIdent(existing.getCourseIdent()), existing);
                }
            }
            ensureReferencedCoursesExist(referenced, courseCache, result);
        }

        List<Major> existingMajors = majorRepository.findAll();
        Map<String, Major> existingMajorByKey = new HashMap<>();
        for (Major existing : existingMajors) {
            if (existing == null || isBlank(existing.getName()) || existing.getCollege() == null) continue;
            existingMajorByKey.put(toMajorKey(existing.getName(), existing.getCollege()), existing);
        }

        for (IsuDegreeDataset.MajorImport majorImport : majors) {
            if (majorImport == null || isBlank(majorImport.name())) {
                result.addWarning("Skipped major with missing name.");
                continue;
            }

            String majorName = majorImport.name().trim();
            College college = parseCollege(majorImport.college(), result, majorName);
            String majorKey = toMajorKey(majorName, college);
            Major major = existingMajorByKey.getOrDefault(majorKey, new Major());
            boolean isNewMajor = major.getId() == 0;

            major.setName(majorName);
            major.setDescription(emptyToNull(majorImport.description()));
            major.setCollege(college);

            List<DegreeRequirement> existingRequirements = new ArrayList<>(major.getDegreeRequirements());
            major.getDegreeRequirements().clear();
            for (DegreeRequirement req : existingRequirements) {
                req.setMajor(null);
            }

            List<DegreeRequirement> newRequirements = buildRequirements(majorImport.degreeRequirements(), result, majorName, courseCache);
            for (DegreeRequirement requirement : newRequirements) {
                requirement.setMajor(major);
            }

            major.getDegreeRequirements().addAll(newRequirements);
            majorRepository.save(major);
            existingMajorByKey.put(majorKey, major);

            if (!existingRequirements.isEmpty()) {
                degreeRequirementRepository.deleteAll(existingRequirements);
            }

            if (isNewMajor) {
                result.incrementMajorsCreated();
            } else {
                result.incrementMajorsUpdated();
            }
        }
    }

    private List<DegreeRequirement> buildRequirements(
            List<IsuDegreeDataset.DegreeRequirementImport> requirements,
            IsuDegreeImportResult result,
            String majorName,
            Map<String, Course> courseCache) {
        List<DegreeRequirement> built = new ArrayList<>();
        if (requirements == null) {
            return built;
        }

        for (IsuDegreeDataset.DegreeRequirementImport reqImport : requirements) {
            if (reqImport == null || isBlank(reqImport.name())) {
                result.addWarning("Skipped requirement with missing name for major " + majorName + ".");
                continue;
            }

            List<Course> directCourses = resolveCourses(reqImport.courseIdents(), result, majorName, reqImport.name(), courseCache);
            List<RequirementGroup> groups = buildRequirementGroups(reqImport.requirementGroups(), result, majorName, reqImport.name(), courseCache);
            directCourses = normalizeElectivePool(reqImport.name(), reqImport.satisfyingCredits(), directCourses, groups, result);

            DegreeRequirement req = new DegreeRequirement();
            req.setName(reqImport.name().trim());
            req.setSatisfyingCredits(reqImport.satisfyingCredits() == null ? 0 : Math.max(0, reqImport.satisfyingCredits()));
            req.setCourses(directCourses);
            req.setRequirementGroups(groups);

            built.add(req);
            result.incrementRequirementsCreated();
        }

        return built;
    }

    private List<RequirementGroup> buildRequirementGroups(
            List<IsuDegreeDataset.RequirementGroupImport> groups,
            IsuDegreeImportResult result,
            String majorName,
            String requirementName,
            Map<String, Course> courseCache) {
        List<RequirementGroup> built = new ArrayList<>();
        if (groups == null) {
            return built;
        }

        for (IsuDegreeDataset.RequirementGroupImport groupImport : groups) {
            if (groupImport == null || isBlank(groupImport.name())) {
                result.addWarning("Skipped requirement group with missing name for " + majorName + " / " + requirementName + ".");
                continue;
            }

            RequirementGroup group = new RequirementGroup();
            group.setName(groupImport.name().trim());
            group.setSatisfyingCredits(groupImport.satisfyingCredits() == null ? 0 : Math.max(0, groupImport.satisfyingCredits()));
            group.setCourses(resolveCourses(groupImport.courseIdents(), result, majorName, groupImport.name(), courseCache));
            built.add(group);
        }
        if (!built.isEmpty()) {
            requirementGroupRepository.saveAll(built);
            for (int i = 0; i < built.size(); i++) {
                result.incrementRequirementGroupsCreated();
            }
        }

        return built;
    }

    private List<Course> resolveCourses(
            List<String> idents,
            IsuDegreeImportResult result,
            String majorName,
            String requirementName,
            Map<String, Course> courseCache) {
        List<Course> courses = new ArrayList<>();
        if (idents == null) {
            return courses;
        }
        if (courseCache == null) {
            courseCache = new HashMap<>();
        }

        for (String rawIdent : idents) {
            String ident = normalizeIdent(rawIdent);
            if (ident.isBlank()) {
                continue;
            }
            Course course = courseCache.get(ident);
            if (course != null) {
                // Normalize legacy placeholder values so UI/coverage math remains stable.
                if (course.getCredits() < 0) {
                    course.setCredits(0);
                    result.addWarning("Normalized negative credits to 0 for " + ident + ".");
                }
                courses.add(course);
                continue;
            }

            Course placeholder = new Course();
            placeholder.setCourseIdent(ident);
            placeholder.setName(ident.replace('_', ' '));
            placeholder.setCredits(0);
            placeholder.setPrereq_txt(null);
            placeholder.setPrerequisites(new HashSet<>());
            placeholder.setDescription("Placeholder course created during ISU major import for " + ident + ".");
            placeholder.setHours(null);
            placeholder.setOffered(null);
            Course savedPlaceholder = courseRepository.save(placeholder);
            courseCache.put(ident, savedPlaceholder);
            courses.add(savedPlaceholder);
            result.addWarning("Created late placeholder course " + ident + " referenced by " + majorName + " / " + requirementName + ".");
        }
        return courses;
    }

    private Map<String, Course> preloadReferencedCourses(List<IsuDegreeDataset.MajorImport> majors) {
        Map<String, Course> cache = new HashMap<>();
        Set<String> referenced = collectReferencedCourseIdents(majors);
        if (referenced.isEmpty()) {
            return cache;
        }

        List<Course> existing = courseRepository.findAllByCourseIdentIn(new ArrayList<>(referenced));
        for (Course course : existing) {
            if (course != null && !isBlank(course.getCourseIdent())) {
                cache.put(normalizeIdent(course.getCourseIdent()), course);
            }
        }
        return cache;
    }

    private Set<String> collectReferencedCourseIdents(List<IsuDegreeDataset.MajorImport> majors) {
        Set<String> idents = new HashSet<>();
        if (majors == null) {
            return idents;
        }

        for (IsuDegreeDataset.MajorImport major : majors) {
            if (major == null || major.degreeRequirements() == null) {
                continue;
            }
            for (IsuDegreeDataset.DegreeRequirementImport requirement : major.degreeRequirements()) {
                if (requirement == null) {
                    continue;
                }
                addNormalizedIdents(idents, requirement.courseIdents());
                if (requirement.requirementGroups() != null) {
                    for (IsuDegreeDataset.RequirementGroupImport group : requirement.requirementGroups()) {
                        if (group == null) {
                            continue;
                        }
                        addNormalizedIdents(idents, group.courseIdents());
                    }
                }
            }
        }

        return idents;
    }

    private void addNormalizedIdents(Set<String> target, Collection<String> source) {
        if (source == null) {
            return;
        }
        for (String raw : source) {
            String normalized = normalizeIdent(raw);
            if (!normalized.isBlank()) {
                target.add(normalized);
            }
        }
    }

    private List<Course> normalizeElectivePool(
            String requirementName,
            Integer requirementCredits,
            List<Course> directCourses,
            List<RequirementGroup> groups,
            IsuDegreeImportResult result) {
        if (directCourses == null || directCourses.isEmpty()) {
            return directCourses;
        }

        String normalizedName = requirementName == null ? "" : requirementName.toLowerCase(Locale.ROOT);
        int requiredCredits = requirementCredits == null ? 0 : Math.max(0, requirementCredits);
        int directCount = directCourses.size();

        // Heuristic: large "Other Remaining Courses"/elective lists are pools, not all-required courses.
        boolean looksLikeElectivePool = requiredCredits > 0
                && directCount >= 8
                && (normalizedName.contains("other remaining courses") || normalizedName.contains("elective"));

        if (!looksLikeElectivePool) {
            return directCourses;
        }

        int existingGroupCredits = 0;
        if (groups != null) {
            for (RequirementGroup group : groups) {
                if (group != null && group.getSatisfyingCredits() > 0) {
                    existingGroupCredits += group.getSatisfyingCredits();
                }
            }
        }

        int poolCredits = Math.max(1, requiredCredits - existingGroupCredits);
        RequirementGroup pool = new RequirementGroup();
        pool.setName(requirementName.trim() + " pool");
        pool.setSatisfyingCredits(poolCredits);
        pool.setCourses(new ArrayList<>(directCourses));
        pool = requirementGroupRepository.save(pool);
        groups.add(pool);
        result.incrementRequirementGroupsCreated();
        result.addWarning("Converted large elective bucket to pooled option group for requirement '" + requirementName + "'.");

        return new ArrayList<>();
    }

    private College parseCollege(String collegeValue, IsuDegreeImportResult result, String majorName) {
        if (isBlank(collegeValue)) {
            return College.LIBERAL_ARTS_AND_SCIENCES;
        }
        String normalized = collegeValue.trim().toUpperCase(Locale.ROOT)
                .replace("&", "AND")
                .replace("-", "_")
                .replace(" ", "_");
        if ("ENGINEERING".equals(normalized)) return College.ENGINEERING;
        if ("BUSINESS".equals(normalized)) return College.BUSINESS;
        if ("AGRICULTURE_AND_LIFE_SCIENCES".equals(normalized)) return College.AGRICULTURE_AND_LIFE_SCIENCE;
        if ("HUMAN_SCIENCE".equals(normalized) || "HUMAN_SCIENCES".equals(normalized)) return College.HUMAN_SCIENCE;
        if ("LIBERAL_ARTS_AND_SCIENCES".equals(normalized)) return College.LIBERAL_ARTS_AND_SCIENCES;
        if ("VETERINARY_MEDICINE".equals(normalized)) return College.VETERINARY_MEDICINE;
        if ("SCHOOL_OF_EDUCATION".equals(normalized)) return College.SCHOOL_OF_EDUCATION;
        if ("GRADUATE_COLLEGE".equals(normalized)) return College.GRADUATE_COLLEGE;
        try {
            return College.valueOf(normalized);
        } catch (Exception ex) {
            result.addWarning("Unknown college '" + collegeValue + "' for major " + majorName + ". Defaulted to LIBERAL_ARTS_AND_SCIENCES.");
            return College.LIBERAL_ARTS_AND_SCIENCES;
        }
    }

    private String normalizeIdent(String ident) {
        if (ident == null) {
            return "";
        }
        return ident.trim().toUpperCase(Locale.ROOT).replace(' ', '_');
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private String emptyToNull(String value) {
        return isBlank(value) ? null : value.trim();
    }

    private String defaultDescription(String description, String ident) {
        if (!isBlank(description)) {
            return description.trim();
        }
        return "Imported from Iowa State degree dataset for " + ident + ".";
    }

    private void ensureReferencedCoursesExist(
            Set<String> referenced,
            Map<String, Course> courseCache,
            IsuDegreeImportResult result) {
        if (referenced == null || referenced.isEmpty()) {
            return;
        }
        List<Course> placeholders = new ArrayList<>();
        for (String ident : referenced) {
            if (isBlank(ident) || courseCache.containsKey(ident)) continue;
            Course placeholder = new Course();
            placeholder.setCourseIdent(ident);
            placeholder.setName(ident.replace('_', ' '));
            placeholder.setCredits(0);
            placeholder.setPrereq_txt(null);
            placeholder.setPrerequisites(new HashSet<>());
            placeholder.setDescription("Placeholder course created during ISU major import for " + ident + ".");
            placeholder.setHours(null);
            placeholder.setOffered(null);
            placeholders.add(placeholder);
        }
        if (placeholders.isEmpty()) {
            return;
        }
        List<Course> saved = courseRepository.saveAll(placeholders);
        for (Course course : saved) {
            if (course != null && !isBlank(course.getCourseIdent())) {
                courseCache.put(normalizeIdent(course.getCourseIdent()), course);
            }
        }
        result.addWarning("Created " + saved.size() + " placeholder courses referenced by major requirements.");
    }

    private String toMajorKey(String majorName, College college) {
        return (majorName == null ? "" : majorName.trim().toUpperCase(Locale.ROOT)) + "|" + String.valueOf(college);
    }
}
