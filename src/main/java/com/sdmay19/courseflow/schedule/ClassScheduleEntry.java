package com.sdmay19.courseflow.schedule;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.sdmay19.courseflow.course.Course;
import com.sdmay19.courseflow.flowchart.Flowchart;
import com.sdmay19.courseflow.semester.Term;
import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "class_schedule_entry")
public class ClassScheduleEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "flowchart_id", nullable = false)
    @JsonIgnore
    private Flowchart flowchart;

    @ManyToOne
    @JoinColumn(name = "course_id")
    private Course course;

    @Column(name = "course_ident", nullable = false)
    private String courseIdent;

    @Column(name = "section_code")
    private String sectionCode;

    @Column(name = "course_title")
    private String courseTitle;

    @Column(name = "academic_period_label")
    private String academicPeriodLabel;

    @Enumerated(EnumType.STRING)
    @Column(name = "term", nullable = false)
    private Term term;

    @Column(name = "year", nullable = false)
    private int year;

    @Column(name = "term_start_date")
    private LocalDate termStartDate;

    @Column(name = "term_end_date")
    private LocalDate termEndDate;

    @Column(name = "meeting_pattern_raw")
    private String meetingPatternRaw;

    @Column(name = "meeting_days")
    private String meetingDays;

    @Column(name = "meeting_start_time")
    private LocalTime meetingStartTime;

    @Column(name = "meeting_end_time")
    private LocalTime meetingEndTime;

    @Column(name = "free_drop_deadline")
    private LocalDate freeDropDeadline;

    @Column(name = "withdraw_deadline")
    private LocalDate withdrawDeadline;

    @Column(name = "instructor")
    private String instructor;

    @Column(name = "delivery_mode")
    private String deliveryMode;

    @Column(name = "locations", columnDefinition = "TEXT")
    private String locations;

    @Column(name = "instructional_format")
    private String instructionalFormat;

    @Enumerated(EnumType.STRING)
    @Column(name = "entry_type", nullable = false)
    private ClassScheduleEntryType entryType = ClassScheduleEntryType.IMPORTED_CLASS;

    @Column(name = "custom_event_title")
    private String customEventTitle;

    @Column(name = "custom_event_date")
    private LocalDate customEventDate;

    @Column(name = "custom_event_notes", columnDefinition = "TEXT")
    private String customEventNotes;

    public long getId() {
        return id;
    }

    public void setId(long id) {
        this.id = id;
    }

    public Flowchart getFlowchart() {
        return flowchart;
    }

    public void setFlowchart(Flowchart flowchart) {
        this.flowchart = flowchart;
    }

    public Course getCourse() {
        return course;
    }

    public void setCourse(Course course) {
        this.course = course;
    }

    public String getCourseIdent() {
        return courseIdent;
    }

    public void setCourseIdent(String courseIdent) {
        this.courseIdent = courseIdent;
    }

    public String getSectionCode() {
        return sectionCode;
    }

    public void setSectionCode(String sectionCode) {
        this.sectionCode = sectionCode;
    }

    public String getCourseTitle() {
        return courseTitle;
    }

    public void setCourseTitle(String courseTitle) {
        this.courseTitle = courseTitle;
    }

    public String getAcademicPeriodLabel() {
        return academicPeriodLabel;
    }

    public void setAcademicPeriodLabel(String academicPeriodLabel) {
        this.academicPeriodLabel = academicPeriodLabel;
    }

    public Term getTerm() {
        return term;
    }

    public void setTerm(Term term) {
        this.term = term;
    }

    public int getYear() {
        return year;
    }

    public void setYear(int year) {
        this.year = year;
    }

    public LocalDate getTermStartDate() {
        return termStartDate;
    }

    public void setTermStartDate(LocalDate termStartDate) {
        this.termStartDate = termStartDate;
    }

    public LocalDate getTermEndDate() {
        return termEndDate;
    }

    public void setTermEndDate(LocalDate termEndDate) {
        this.termEndDate = termEndDate;
    }

    public String getMeetingPatternRaw() {
        return meetingPatternRaw;
    }

    public void setMeetingPatternRaw(String meetingPatternRaw) {
        this.meetingPatternRaw = meetingPatternRaw;
    }

    public String getMeetingDays() {
        return meetingDays;
    }

    public void setMeetingDays(String meetingDays) {
        this.meetingDays = meetingDays;
    }

    public LocalTime getMeetingStartTime() {
        return meetingStartTime;
    }

    public void setMeetingStartTime(LocalTime meetingStartTime) {
        this.meetingStartTime = meetingStartTime;
    }

    public LocalTime getMeetingEndTime() {
        return meetingEndTime;
    }

    public void setMeetingEndTime(LocalTime meetingEndTime) {
        this.meetingEndTime = meetingEndTime;
    }

    public LocalDate getFreeDropDeadline() {
        return freeDropDeadline;
    }

    public void setFreeDropDeadline(LocalDate freeDropDeadline) {
        this.freeDropDeadline = freeDropDeadline;
    }

    public LocalDate getWithdrawDeadline() {
        return withdrawDeadline;
    }

    public void setWithdrawDeadline(LocalDate withdrawDeadline) {
        this.withdrawDeadline = withdrawDeadline;
    }

    public String getInstructor() {
        return instructor;
    }

    public void setInstructor(String instructor) {
        this.instructor = instructor;
    }

    public String getDeliveryMode() {
        return deliveryMode;
    }

    public void setDeliveryMode(String deliveryMode) {
        this.deliveryMode = deliveryMode;
    }

    public String getLocations() {
        return locations;
    }

    public void setLocations(String locations) {
        this.locations = locations;
    }

    public String getInstructionalFormat() {
        return instructionalFormat;
    }

    public void setInstructionalFormat(String instructionalFormat) {
        this.instructionalFormat = instructionalFormat;
    }

    public ClassScheduleEntryType getEntryType() {
        return entryType;
    }

    public void setEntryType(ClassScheduleEntryType entryType) {
        this.entryType = entryType;
    }

    public String getCustomEventTitle() {
        return customEventTitle;
    }

    public void setCustomEventTitle(String customEventTitle) {
        this.customEventTitle = customEventTitle;
    }

    public LocalDate getCustomEventDate() {
        return customEventDate;
    }

    public void setCustomEventDate(LocalDate customEventDate) {
        this.customEventDate = customEventDate;
    }

    public String getCustomEventNotes() {
        return customEventNotes;
    }

    public void setCustomEventNotes(String customEventNotes) {
        this.customEventNotes = customEventNotes;
    }
}
