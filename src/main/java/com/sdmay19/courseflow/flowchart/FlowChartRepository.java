package com.sdmay19.courseflow.flowchart;

import com.sdmay19.courseflow.User.AppUser;
import com.sdmay19.courseflow.semester.Semester;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.List;

public interface FlowChartRepository extends JpaRepository<Flowchart, Long> {

    Optional<Flowchart> findByUser(AppUser user);

    Optional<Flowchart> findFirstByUserOrderByIdDesc(AppUser user);

    List<Flowchart> findAllByUser(AppUser user);

    void deleteAllByUser(AppUser user);
}
