import {CourseCard} from "../components/CourseCard";
import type {Course} from "../types/course";
import {useEffect, useMemo, useState} from "react";
import {Link} from "react-router-dom";
import {Button} from "primereact/button";
import {InputText} from "primereact/inputtext";
import {Panel} from "primereact/panel"
import {RadioButton} from "primereact/radiobutton";
import {Dialog} from "primereact/dialog";
import Header from "../components/header";
import type {CourseStatus, Flowchart, Semester} from "../api/flowchartApi";
import {getUserFlowchart, updateSemesterCourses} from "../api/flowchartApi";
import api from "../api/axiosClient";
import {
  deleteCatalogCourse,
  filterCourseCatalog,
  getCourseCatalogBrowsePage,
  searchCourseCatalog,
  updateCatalogCourse,
} from "../api/courseCatalogApi";
import {createStatusLookup, normalizeCourseIdent, normalizeStatus, resolveCourseStatus} from "../utils/flowchartStatus";
// import { Slider } from 'primereact/slider';

type FitTone = "good" | "warn" | "bad";
type CourseFitCheck = {
  tone: FitTone;
  title: string;
  detail: string;
};

const PAGE_SIZE = 50;

function semesterRank(year: number, term: string): number {
  const order: Record<string, number> = {
    SPRING: 1,
    SUMMER: 2,
    FALL: 3,
  };
  const termRank = order[term?.toUpperCase()] ?? 9;
  return year * 10 + termRank;
}

function formatSemesterLabel(semester: Semester | null | undefined): string {
  if (!semester) return "selected semester";
  return semester.year <= 0 ? "Transfer Credit" : `${semester.term} ${semester.year}`;
}

function toneClasses(tone: FitTone): string {
  if (tone === "good") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (tone === "warn") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-red-200 bg-red-50 text-red-700";
}

function getFitSummary(checks: CourseFitCheck[]): { tone: FitTone; label: string; detail: string } {
  if (checks.some((check) => check.tone === "bad")) {
    return {
      tone: "bad",
      label: "Not a fit yet",
      detail: "One or more blockers need attention before this course should be added.",
    };
  }
  if (checks.some((check) => check.tone === "warn")) {
    return {
      tone: "warn",
      label: "Needs review",
      detail: "The course can work, but there are a few details worth double-checking first.",
    };
  }
  return {
    tone: "good",
    label: "Looks good",
    detail: "This course fits the selected semester based on the current flowchart data.",
  };
}

export default function CourseCatalog() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [level, setLevel] = useState('');
    const [offeredTerm, setOfferedTerm] = useState('');
    const [department, setDepartment] = useState('');
    //const [allCourses, setAllCourses] = useState<Course[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    // const [credits, setCredits] = useState(0);
    const [pageNumber, setPageNumber] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [filtered, setFiltered] = useState(false);
    const [flowchart, setFlowchart] = useState<Flowchart | null>(null);
    const [semesters, setSemesters] = useState<Semester[]>([]);
    const [flowchartExists, setFlowchartExists] = useState(true);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [selectedSemesterId, setSelectedSemesterId] = useState<number | null>(null);
    const [addDialogVisible, setAddDialogVisible] = useState(false);
    const [addingCourse, setAddingCourse] = useState(false);
    const [addToFlowchartMessage, setAddToFlowchartMessage] = useState<string | null>(null);
    const [addToFlowchartError, setAddToFlowchartError] = useState<string | null>(null);
    const [editDialogVisible, setEditDialogVisible] = useState(false);
    const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
    const [updatingCourse, setUpdatingCourse] = useState(false);
    const [deletingCourse, setDeletingCourse] = useState(false);
    const [courseActionMessage, setCourseActionMessage] = useState<string | null>(null);
    const [courseActionError, setCourseActionError] = useState<string | null>(null);
    const [catalogError, setCatalogError] = useState<string | null>(null);
    const [editCourseForm, setEditCourseForm] = useState({
      name: "",
      ident: "",
      credits: "",
      prereq_txt: "",
      description: "",
      hours: "",
      offered: "",
      prereqIdents: "",
    });

    const loadFlowchartData = async (): Promise<void> => {
      try {
        const nextFlowchart = await getUserFlowchart();
        setFlowchart(nextFlowchart);
        if (!nextFlowchart || !nextFlowchart.semesters || nextFlowchart.semesters.length === 0) {
          setFlowchartExists(false);
          setSemesters([]);
          return;
        }
        const sorted = [...nextFlowchart.semesters].sort(
          (a, b) => semesterRank(a.year, a.term) - semesterRank(b.year, b.term)
        );
        setFlowchartExists(true);
        setSemesters(sorted);
      } catch (error) {
        console.error("Error loading semesters for flowchart:", error);
        setFlowchart(null);
        setFlowchartExists(false);
        setSemesters([]);
      }
    };

    const searchCourses = async (): Promise<void> => {
      try {
        setCatalogError(null);
        const cleaned = searchTerm.trim();
        if (!cleaned) {
          await getCourses(0);
          return;
        }
        const response = await searchCourseCatalog(cleaned);
        setCourses(response);
        setHasMore(false);
        setFiltered(false);
        setPageNumber(0);
      } catch (error: any) {
        console.error("Error fetching courses:", error);
        setCatalogError(error?.response?.data?.message || error?.message || "Failed to search courses.");
      }
    };

    const applyFilter = async (page:number=0): Promise<void> => {
      try {
        setCatalogError(null);
        const response = await filterCourseCatalog({
          level: level || undefined,
          offeredTerm: offeredTerm || undefined,
          department: department || undefined,
          page,
          size: PAGE_SIZE,
        });
        if(page === 0){
          setCourses(response);
        }
        else{
          setCourses(prev => [...prev, ...response]);
        }
        setHasMore(response.length === PAGE_SIZE);
        setFiltered(true);
        setPageNumber(page);

      } catch (error: any) {
            console.error("Error fetching courses:", error);
            setCatalogError(error?.response?.data?.message || error?.message || "Failed to apply course filters.");
      }
    };

    const getCourses = async (page:number, size:number=PAGE_SIZE): Promise<void> => {
        try {
              setCatalogError(null);
              const response = await getCourseCatalogBrowsePage({page, size});
              if(page === 0){
                setCourses(response.courses ?? []);
              }
              else{
                setCourses(prev => [...prev, ...(response.courses ?? [])]);
              }
              setPageNumber(response.page);
              setHasMore(response.page + 1 < response.totalPages);
              setFiltered(false);
        } catch (error: any) {
            console.error("Error fetching courses:", error);
            setCatalogError(error?.response?.data?.message || error?.message || "Failed to load course catalog.");
        }
    };


    useEffect(() => {
        void getCourses(0);
        void loadFlowchartData();
    }, []);

    const statusLookup = useMemo(
      () => createStatusLookup(flowchart?.courseStatusMap),
      [flowchart?.courseStatusMap]
    );

    const selectedSemester = useMemo(
      () => semesters.find((semester) => semester.id === selectedSemesterId) ?? null,
      [semesters, selectedSemesterId]
    );

    const selectedCourseFitChecks = useMemo<CourseFitCheck[]>(() => {
      if (!selectedCourse || !selectedSemester) {
        return [];
      }

      const normalizedSelectedIdent = normalizeCourseIdent(selectedCourse.courseIdent);
      const selectedSemesterRank = semesterRank(selectedSemester.year, selectedSemester.term);
      const selectedSemesterCourses = selectedSemester.courses ?? [];
      const sameSemesterDuplicate = selectedSemesterCourses.some(
        (course) => normalizeCourseIdent(course.courseIdent) === normalizedSelectedIdent
      );
      const scheduledElsewhere = semesters.filter((semester) =>
        semester.id !== selectedSemester.id &&
        (semester.courses ?? []).some((course) => normalizeCourseIdent(course.courseIdent) === normalizedSelectedIdent)
      );
      const courseStatus = normalizeStatus(resolveCourseStatus(statusLookup, selectedCourse.courseIdent) as CourseStatus);
      const checks: CourseFitCheck[] = [];

      if (sameSemesterDuplicate) {
        checks.push({
          tone: "bad",
          title: "Already in this semester",
          detail: `${selectedCourse.courseIdent} is already scheduled in ${formatSemesterLabel(selectedSemester)}.`,
        });
      } else if (scheduledElsewhere.length > 0) {
        checks.push({
          tone: "bad",
          title: "Already on your flowchart",
          detail: `${selectedCourse.courseIdent} is already placed in ${scheduledElsewhere
            .map((semester) => formatSemesterLabel(semester))
            .join(", ")}.`,
        });
      } else if (courseStatus === "COMPLETED") {
        checks.push({
          tone: "bad",
          title: "Already completed",
          detail: `Your flowchart marks ${selectedCourse.courseIdent} as completed already.`,
        });
      } else if (courseStatus === "IN_PROGRESS") {
        checks.push({
          tone: "bad",
          title: "Already in progress",
          detail: `Your flowchart already marks ${selectedCourse.courseIdent} as in progress.`,
        });
      } else {
        checks.push({
          tone: "good",
          title: "No duplicate found",
          detail: `${selectedCourse.courseIdent} is not already scheduled in your current plan.`,
        });
      }

      const normalizedOffered = String(selectedCourse.offered ?? "").toUpperCase();
      const selectedTerm = String(selectedSemester.term ?? "").toUpperCase();
      if (!normalizedOffered) {
        checks.push({
          tone: "warn",
          title: "Offering pattern unknown",
          detail: "This course has no offering term listed, so CourseFlow cannot confirm it is offered in the selected semester.",
        });
      } else if (normalizedOffered.includes(selectedTerm)) {
        checks.push({
          tone: "good",
          title: "Offered in selected term",
          detail: `${selectedCourse.courseIdent} is marked as offered in ${selectedSemester.term}.`,
        });
      } else {
        checks.push({
          tone: "warn",
          title: "Term mismatch",
          detail: `${selectedCourse.courseIdent} is listed as offered "${selectedCourse.offered}", not ${selectedSemester.term}.`,
        });
      }

      const prerequisiteLabels = new Map<string, string>();
      (selectedCourse.prerequisites ?? []).forEach((prereq) => {
        const normalized = normalizeCourseIdent(prereq);
        if (normalized) {
          prerequisiteLabels.set(normalized, prereq);
        }
      });
      const prereqIdents = Array.from(prerequisiteLabels.keys());
      if (prereqIdents.length === 0) {
        checks.push({
          tone: "good",
          title: "No prerequisites",
          detail: "This course does not list prerequisite courses.",
        });
      } else {
        const satisfied: string[] = [];
        const sameSemester: string[] = [];
        const missing: string[] = [];

        prereqIdents.forEach((prereqIdent) => {
          const prereqStatus = normalizeStatus(resolveCourseStatus(statusLookup, prereqIdent) as CourseStatus);
          if (prereqStatus === "COMPLETED" || prereqStatus === "IN_PROGRESS") {
            satisfied.push(prerequisiteLabels.get(prereqIdent) ?? prereqIdent);
            return;
          }

          let earliestScheduledRank: number | null = null;
          let earliestScheduledSemester: Semester | null = null;
          semesters.forEach((semester) => {
            const containsPrereq = (semester.courses ?? []).some(
              (course) => normalizeCourseIdent(course.courseIdent) === prereqIdent
            );
            if (!containsPrereq) return;
            const rank = semesterRank(semester.year, semester.term);
            if (earliestScheduledRank === null || rank < earliestScheduledRank) {
              earliestScheduledRank = rank;
              earliestScheduledSemester = semester;
            }
          });

          if (earliestScheduledRank !== null && earliestScheduledRank < selectedSemesterRank) {
            satisfied.push(
              `${prerequisiteLabels.get(prereqIdent) ?? prereqIdent} (${formatSemesterLabel(earliestScheduledSemester)})`
            );
            return;
          }

          if (earliestScheduledRank !== null && earliestScheduledRank === selectedSemesterRank) {
            sameSemester.push(prerequisiteLabels.get(prereqIdent) ?? prereqIdent);
            return;
          }

          missing.push(prerequisiteLabels.get(prereqIdent) ?? prereqIdent);
        });

        if (missing.length > 0) {
          checks.push({
            tone: "bad",
            title: "Prerequisites missing",
            detail: `These prerequisites are not yet satisfied before ${formatSemesterLabel(selectedSemester)}: ${missing.join(", ")}.`,
          });
        } else if (sameSemester.length > 0) {
          checks.push({
            tone: "warn",
            title: "Prerequisites scheduled in same semester",
            detail: `These prerequisites are currently planned in the same term, which may not satisfy registration sequencing: ${sameSemester.join(", ")}.`,
          });
        } else {
          checks.push({
            tone: "good",
            title: "Prerequisites accounted for",
            detail: satisfied.length > 0
              ? `Prerequisite coverage found through completed, in-progress, or earlier planned courses: ${satisfied.join(", ")}.`
              : "Prerequisites appear to be satisfied.",
          });
        }
      }

      const currentSemesterCredits = selectedSemesterCourses.reduce(
        (sum, course) => sum + Math.max(0, Number(course.credits ?? 0)),
        0
      );
      const nextCredits = currentSemesterCredits + Math.max(0, Number(selectedCourse.credits ?? 0));
      if (!Number.isFinite(nextCredits) || nextCredits <= 0) {
        checks.push({
          tone: "warn",
          title: "Credit load unknown",
          detail: "CourseFlow cannot estimate the resulting semester credit load because one or more course credit values are missing.",
        });
      } else if (nextCredits > 21) {
        checks.push({
          tone: "bad",
          title: "Very heavy semester load",
          detail: `Adding this course would bring ${formatSemesterLabel(selectedSemester)} to about ${nextCredits} credits.`,
        });
      } else if (nextCredits > 18) {
        checks.push({
          tone: "warn",
          title: "Heavy semester load",
          detail: `Adding this course would bring ${formatSemesterLabel(selectedSemester)} to about ${nextCredits} credits.`,
        });
      } else {
        checks.push({
          tone: "good",
          title: "Credit load looks reasonable",
          detail: `${formatSemesterLabel(selectedSemester)} would be about ${nextCredits} credits after adding this course.`,
        });
      }

      return checks;
    }, [selectedCourse, selectedSemester, semesters, statusLookup]);

    const hasHardFitBlocker = selectedCourseFitChecks.some((check) => check.tone === "bad");
    const fitSummary = getFitSummary(selectedCourseFitChecks);

    const openAddDialog = (course: Course) => {
      setSelectedCourse(course);
      setSelectedSemesterId(semesters.length ? semesters[0].id : null);
      setAddToFlowchartMessage(null);
      setAddToFlowchartError(null);
      setCourseActionMessage(null);
      setCourseActionError(null);
      setAddDialogVisible(true);
    };

    const openEditDialog = (course: Course) => {
      setSelectedCourse(course);
      setEditCourseForm({
        name: course.name ?? "",
        ident: course.courseIdent ?? "",
        credits: String(course.credits ?? ""),
        prereq_txt: course.prereq_txt ?? "",
        description: course.description ?? "",
        hours: course.hours ?? "",
        offered: course.offered ?? "",
        prereqIdents: (course.prerequisites ?? []).join(", "),
      });
      setCourseActionMessage(null);
      setCourseActionError(null);
      setEditDialogVisible(true);
    };

    const openDeleteDialog = (course: Course) => {
      setSelectedCourse(course);
      setCourseActionMessage(null);
      setCourseActionError(null);
      setDeleteDialogVisible(true);
    };

    const handleConfirmAddCourse = async () => {
      if (!selectedCourse) {
        return;
      }
      if (selectedSemesterId === null) {
        setAddToFlowchartError("Select a semester first.");
        return;
      }
      if (hasHardFitBlocker) {
        setAddToFlowchartError("This course is not a good fit for the selected semester yet. Review the fit check details before adding it.");
        return;
      }

      setAddingCourse(true);
      setAddToFlowchartMessage(null);
      setAddToFlowchartError(null);
      try {
        await updateSemesterCourses(selectedSemesterId, {
          operation: "ADD",
          courseIdent: selectedCourse.courseIdent,
        });
        await loadFlowchartData();
        setAddToFlowchartMessage(`Added ${selectedCourse.courseIdent} to ${formatSemesterLabel(selectedSemester)}.`);
        setAddDialogVisible(false);
      } catch (error: any) {
        const message =
          error?.response?.data?.message ||
          error?.message ||
          "Failed to add course to flowchart.";
        setAddToFlowchartError(message);
      } finally {
        setAddingCourse(false);
      }
    };

    const handleSaveCourseEdits = async () => {
      if (!selectedCourse?.id) {
        setCourseActionError("Course ID is missing. Cannot update this course.");
        return;
      }

      const creditsNumber =
        editCourseForm.credits.trim() === "" ? null : Number(editCourseForm.credits);
      if (creditsNumber !== null && Number.isNaN(creditsNumber)) {
        setCourseActionError("Credits must be a valid number.");
        return;
      }

      const prereqIdents = editCourseForm.prereqIdents
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      setUpdatingCourse(true);
      setCourseActionError(null);
      setCourseActionMessage(null);
      try {
        const payload = {
          name: editCourseForm.name.trim() || null,
          ident: editCourseForm.ident.trim().toUpperCase().replace(/\s+/g, "_") || null,
          credits: creditsNumber,
          prereq_txt: editCourseForm.prereq_txt.trim() || null,
          description: editCourseForm.description.trim() || null,
          hours: editCourseForm.hours.trim() || null,
          offered: editCourseForm.offered.trim() || null,
          prereqIdents,
        };
        const updatedCourse = await updateCatalogCourse(selectedCourse.id, payload);
        setCourses((prev) =>
          prev.map((course) =>
            course.id === selectedCourse.id || course.courseIdent === selectedCourse.courseIdent
              ? { ...course, ...updatedCourse }
              : course
          )
        );
        setCourseActionMessage(`Updated ${updatedCourse.courseIdent}.`);
        setEditDialogVisible(false);
      } catch (error: any) {
        const message =
          error?.response?.data?.message ||
          error?.message ||
          "Failed to update course.";
        setCourseActionError(message);
      } finally {
        setUpdatingCourse(false);
      }
    };

    const handleDeleteCourse = async () => {
      if (!selectedCourse?.id) {
        setCourseActionError("Course ID is missing. Cannot delete this course.");
        return;
      }

      setDeletingCourse(true);
      setCourseActionError(null);
      setCourseActionMessage(null);
      try {
        await deleteCatalogCourse(selectedCourse.id);
        setCourses((prev) =>
          prev.filter(
            (course) =>
              !(course.id === selectedCourse.id || course.courseIdent === selectedCourse.courseIdent)
          )
        );
        setCourseActionMessage(`Deleted ${selectedCourse.courseIdent}.`);
        setDeleteDialogVisible(false);
      } catch (error: any) {
        const message =
          error?.response?.data?.message ||
          error?.message ||
          "Failed to delete course.";
        setCourseActionError(message);
      } finally {
        setDeletingCourse(false);
      }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <Header />
            <div className="flex gap-4 p-4 pt-24">
            <aside className="w-1/4">
                <Panel header="Filters" className="h-full">

                    {/* Course Level */}
                    <div className="flex flex-col gap-3">
                        <h1 className="text-red-600 text-lg">Course Level</h1>
                        {['1000', '2000', '3000', '4000', '5000'].map((lvl) => (
                            <div key={lvl} className="flex items-center">
                                <RadioButton inputId={lvl} name="course-level" value={lvl}
                                             onChange={(e) => setLevel(e.value)} checked={level === lvl}/>
                                <label htmlFor={lvl} className="ml-2">{lvl} Level</label>
                            </div>
                        ))}
                    </div>

                    {/* Term Offered */}
                    <div className="flex flex-col gap-3 mt-3">
                        <h1 className="text-red-600 text-lg">Offered Term</h1>
                        {['Fall', 'Spring', 'Summer', 'Winter'].map((term) => (
                            <div key={term} className="flex items-center">
                                <RadioButton inputId={term} name="offered-term" value={term.toLowerCase()}
                                             onChange={(e) => setOfferedTerm(e.value)} checked={offeredTerm === term.toLowerCase()}/>
                                <label htmlFor={term} className="ml-2">{term}</label>
                            </div>
                        ))}
                    </div>

                    {/* Department / Prefix */}
                    <div className="flex flex-col gap-3 mt-3">
                        <h1 className="text-red-600 text-lg">Department</h1>
                        <select
                            value={department}
                            onChange={(e) => setDepartment(e.target.value)}
                            className="p-2 border border-gray-300 rounded-md bg-white text-gray-700"
                        >
                            <option value="">All Departments</option>
                            <option value="ABE">ABE</option>
                            <option value="ACCT">ACCT</option>
                            <option value="ACSCI">ACSCI</option>
                            <option value="ADVRT">ADVRT</option>
                            <option value="AERE">AERE</option>
                            <option value="AESHM">AESHM</option>
                            <option value="AFAM">AFAM</option>
                            <option value="AFAS">AFAS</option>
                            <option value="AGEDS">AGEDS</option>
                            <option value="AGRON">AGRON</option>
                            <option value="AI">AI</option>
                            <option value="AMD">AMD</option>
                            <option value="AMIN">AMIN</option>
                            <option value="ANS">ANS</option>
                            <option value="ANTHR">ANTHR</option>
                            <option value="ARABC">ARABC</option>
                            <option value="ARCH">ARCH</option>
                            <option value="ART">ART</option>
                            <option value="ARTED">ARTED</option>
                            <option value="ARTGR">ARTGR</option>
                            <option value="ARTH">ARTH</option>
                            <option value="ARTID">ARTID</option>
                            <option value="ASL">ASL</option>
                            <option value="ASTRO">ASTRO</option>
                            <option value="ATH">ATH</option>
                            <option value="ATR">ATR</option>
                            <option value="BBMB">BBMB</option>
                            <option value="BCB">BCB</option>
                            <option value="BCBIO">BCBIO</option>
                            <option value="BIOL">BIOL</option>
                            <option value="BME">BME</option>
                            <option value="BMS">BMS</option>
                            <option value="BUSAD">BUSAD</option>
                            <option value="CDEV">CDEV</option>
                            <option value="CE">CE</option>
                            <option value="CHE">CHE</option>
                            <option value="CHEM">CHEM</option>
                            <option value="CHIN">CHIN</option>
                            <option value="CJ">CJ</option>
                            <option value="CLSCI">CLSCI</option>
                            <option value="CLST">CLST</option>
                            <option value="COMDV">COMDV</option>
                            <option value="COMS">COMS</option>
                            <option value="COMST">COMST</option>
                            <option value="CONE">CONE</option>
                            <option value="CPRE">CPRE</option>
                            <option value="CRP">CRP</option>
                            <option value="CYBE">CYBE</option>
                            <option value="CYBSC">CYBSC</option>
                            <option value="DANCE">DANCE</option>
                            <option value="DES">DES</option>
                            <option value="DH">DH</option>
                            <option value="DIET">DIET</option>
                            <option value="DS">DS</option>
                            <option value="DSNS">DSNS</option>
                            <option value="ECFP">ECFP</option>
                            <option value="ECON">ECON</option>
                            <option value="ECP">ECP</option>
                            <option value="EDADM">EDADM</option>
                            <option value="EDUC">EDUC</option>
                            <option value="EE">EE</option>
                            <option value="EEB">EEB</option>
                            <option value="EEOB">EEOB</option>
                            <option value="ELPS">ELPS</option>
                            <option value="EM">EM</option>
                            <option value="ENGL">ENGL</option>
                            <option value="ENGR">ENGR</option>
                            <option value="ENSCI">ENSCI</option>
                            <option value="ENT">ENT</option>
                            <option value="ENTSP">ENTSP</option>
                            <option value="ENVE">ENVE</option>
                            <option value="ENVS">ENVS</option>
                            <option value="EVENT">EVENT</option>
                            <option value="FCEDS">FCEDS</option>
                            <option value="FDM">FDM</option>
                            <option value="FFP">FFP</option>
                            <option value="FIN">FIN</option>
                            <option value="FOR">FOR</option>
                            <option value="FRNCH">FRNCH</option>
                            <option value="FSHN">FSHN</option>
                            <option value="GAME">GAME</option>
                            <option value="GDCB">GDCB</option>
                            <option value="GEN">GEN</option>
                            <option value="GENET">GENET</option>
                            <option value="GEOL">GEOL</option>
                            <option value="GER">GER</option>
                            <option value="GERON">GERON</option>
                            <option value="GLOBE">GLOBE</option>
                            <option value="GRST">GRST</option>
                            <option value="HCI">HCI</option>
                            <option value="HCM">HCM</option>
                            <option value="HDFS">HDFS</option>
                            <option value="HGED">HGED</option>
                            <option value="HHSCI">HHSCI</option>
                            <option value="HIST">HIST</option>
                            <option value="HON">HON</option>
                            <option value="HORT">HORT</option>
                            <option value="HS">HS</option>
                            <option value="HSPM">HSPM</option>
                            <option value="IALL">IALL</option>
                            <option value="IE">IE</option>
                            <option value="IGS">IGS</option>
                            <option value="IHS">IHS</option>
                            <option value="IMBIO">IMBIO</option>
                            <option value="INDD">INDD</option>
                            <option value="INTST">INTST</option>
                            <option value="ITAL">ITAL</option>
                            <option value="JLMC">JLMC</option>
                            <option value="KIN">KIN</option>
                            <option value="LA">LA</option>
                            <option value="LAS">LAS</option>
                            <option value="LATIN">LATIN</option>
                            <option value="LDST">LDST</option>
                            <option value="LIB">LIB</option>
                            <option value="LING">LING</option>
                            <option value="LLS">LLS</option>
                            <option value="MATE">MATE</option>
                            <option value="MATH">MATH</option>
                            <option value="MCDB">MCDB</option>
                            <option value="ME">ME</option>
                            <option value="MGMT">MGMT</option>
                            <option value="MICRO">MICRO</option>
                            <option value="MIS">MIS</option>
                            <option value="MKT">MKT</option>
                            <option value="MS">MS</option>
                            <option value="MSE">MSE</option>
                            <option value="MTEOR">MTEOR</option>
                            <option value="MUSIC">MUSIC</option>
                            <option value="NEURO">NEURO</option>
                            <option value="NREM">NREM</option>
                            <option value="NRS">NRS</option>
                            <option value="NS">NS</option>
                            <option value="NUTRS">NUTRS</option>
                            <option value="OTS">OTS</option>
                            <option value="PERF">PERF</option>
                            <option value="PHIL">PHIL</option>
                            <option value="PHYS">PHYS</option>
                            <option value="PLBIO">PLBIO</option>
                            <option value="PLP">PLP</option>
                            <option value="POLS">POLS</option>
                            <option value="PORT">PORT</option>
                            <option value="PR">PR</option>
                            <option value="PSYCH">PSYCH</option>
                            <option value="RELIG">RELIG</option>
                            <option value="RESEV">RESEV</option>
                            <option value="RUS">RUS</option>
                            <option value="SCIVZ">SCIVZ</option>
                            <option value="SCM">SCM</option>
                            <option value="SE">SE</option>
                            <option value="SMC">SMC</option>
                            <option value="SOC">SOC</option>
                            <option value="SPAN">SPAN</option>
                            <option value="SPCM">SPCM</option>
                            <option value="SPED">SPED</option>
                            <option value="STAT">STAT</option>
                            <option value="STB">STB</option>
                            <option value="SUSAG">SUSAG</option>
                            <option value="SUSE">SUSE</option>
                            <option value="THTRE">THTRE</option>
                            <option value="TOX">TOX</option>
                            <option value="TRANS">TRANS</option>
                            <option value="TSM">TSM</option>
                            <option value="URBD">URBD</option>
                            <option value="USLS">USLS</option>
                            <option value="UST">UST</option>
                            <option value="UXD">UXD</option>
                            <option value="VCS">VCS</option>
                            <option value="VDPAM">VDPAM</option>
                            <option value="VMPM">VMPM</option>
                            <option value="VPTH">VPTH</option>
                            <option value="WESEP">WESEP</option>
                            <option value="WFCE">WFCE</option>
                            <option value="WFS">WFS</option>
                            <option value="WGS">WGS</option>
                            <option value="WISE">WISE</option>
                            <option value="WLC">WLC</option>
                            <option value="YTH">YTH</option>
                        </select>
                    </div>

                    {/* Credit Hours */}
                    {/*<div className="flex flex-col gap-3 mt-3">*/}
                    {/*    <h1 className="text-red-600 text-lg">Credit Hours</h1>*/}
                    {/*    <Slider value={credits} onChange={(e) => setCredits(e.value)} min={1} max={5} step={1} />*/}
                    {/*    <div className="text-sm text-gray-600 text-center">Credits: {credits}</div>*/}
                    {/*</div>*/}


                    {/* Apply / Reset Buttons */}
                    <div className="flex justify-between mt-4">
                        <Button label="Apply Filters" icon="pi pi-filter" className="p-button-sm" onClick={() => { void applyFilter(); }} />
                        <Button label="Reset" icon="pi pi-refresh" className="p-button-text p-button-sm"
                                onClick={() => {  setLevel('');
                                                  setOfferedTerm('');
                                                  setDepartment('');
                                                  setFiltered(false);
                                                  void getCourses(0);}} />
                    </div>

                </Panel>
            </aside>

            <main className="flex-1 flex flex-col gap-4">
                <div className="flex flex-row gap-4">
                    <Link
                      to="/dashboard"
                      className="inline-flex items-center rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-red-300 hover:bg-red-50"
                    >
                      <i className="pi pi-arrow-left mr-2 text-red-500"></i>
                      Back to Dashboard
                    </Link>
                    <InputText placeholder="Search" className="w-full bg-gray-700 border border-gray-700"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                        void searchCourses();
                        }
                      }}/>
                    <Button icon="pi pi-search"
                      onClick={() => {
                        void searchCourses();
                      }}/>
                </div>
                <div className="flex flex-col gap-4 w-full">
                  {catalogError && (
                    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {catalogError}
                    </div>
                  )}
                  {addToFlowchartMessage && (
                    <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                      {addToFlowchartMessage}
                    </div>
                  )}
                  {addToFlowchartError && (
                    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {addToFlowchartError}
                    </div>
                  )}
                  {courseActionMessage && (
                    <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                      {courseActionMessage}
                    </div>
                  )}
                  {courseActionError && (
                    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {courseActionError}
                    </div>
                  )}
                  {courses.map((course) => (
                    <div key={course.courseIdent} className="w-full">
                      <CourseCard
                        course={course}
                        onAddToFlowchart={openAddDialog}
                        onEditCourse={openEditDialog}
                        onDeleteCourse={openDeleteDialog}
                        addDisabled={!flowchartExists || semesters.length === 0}
                      />
                    </div>
                  ))}
                  {hasMore && (
                    <div className="flex justify-center mt-4">
                      <Button
                        label={`Load more`}
                        onClick={() => {
                          if (filtered) {
                            void applyFilter(pageNumber + 1);
                            return;
                          }
                          void getCourses(pageNumber + 1);
                        }}
                        className="p-button-outlined"
                      />
                    </div>
                  )}
                </div>
            </main>

            <Dialog
              header="Add Course To CourseFlow"
              visible={addDialogVisible}
              style={{ width: "28rem" }}
              onHide={() => setAddDialogVisible(false)}
            >
              {!flowchartExists || semesters.length === 0 ? (
                <div className="text-sm text-gray-700">
                  You need an existing flowchart with semesters before adding courses from the catalog.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-sm text-slate-700">
                    <span className="font-semibold">Course:</span>{" "}
                    {selectedCourse?.courseIdent?.replace(/_/g, " ")}
                  </div>
                  <div className="text-xs text-slate-500">
                    Pick a semester first. CourseFlow will validate duplicates, prerequisites, offering term, and semester load before adding the course.
                  </div>
                  <select
                    className="w-full rounded-md border border-slate-300 p-2 text-sm"
                    value={selectedSemesterId ?? ""}
                    onChange={(e) => setSelectedSemesterId(e.target.value ? Number(e.target.value) : null)}
                    disabled={addingCourse}
                  >
                    {semesters.map((sem) => (
                      <option key={sem.id} value={sem.id}>
                        {sem.year <= 0 ? "Transfer Credit" : `${sem.term} ${sem.year}`}
                      </option>
                    ))}
                  </select>
                  {selectedCourse && selectedSemester && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-800">Semester fit check</div>
                          <div className="text-xs text-slate-500">
                            Reviewing {selectedCourse.courseIdent?.replace(/_/g, " ")} for {formatSemesterLabel(selectedSemester)}.
                          </div>
                        </div>
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClasses(fitSummary.tone)}`}>
                          {fitSummary.label}
                        </span>
                      </div>
                      <div className={`mt-3 rounded-md border px-3 py-2 text-sm ${toneClasses(fitSummary.tone)}`}>
                        {fitSummary.detail}
                      </div>
                      <div className="mt-3 space-y-2">
                        {selectedCourseFitChecks.map((check) => (
                          <div key={`${check.tone}-${check.title}`} className={`rounded-md border px-3 py-2 ${toneClasses(check.tone)}`}>
                            <div className="text-sm font-semibold">{check.title}</div>
                            <div className="mt-1 text-xs leading-5">{check.detail}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <Button
                    className="w-full"
                    label={
                      addingCourse
                        ? "Adding..."
                        : hasHardFitBlocker
                          ? "Resolve fit issues first"
                          : "Add to CourseFlow"
                    }
                    icon={hasHardFitBlocker ? "pi pi-exclamation-triangle" : "pi pi-plus"}
                    onClick={handleConfirmAddCourse}
                    disabled={addingCourse || !selectedCourse || hasHardFitBlocker}
                  />
                </div>
              )}
            </Dialog>

            <Dialog
              header="Edit Course"
              visible={editDialogVisible}
              style={{ width: "36rem" }}
              onHide={() => setEditDialogVisible(false)}
            >
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm text-slate-600">Course Name</label>
                  <InputText
                    className="w-full"
                    value={editCourseForm.name}
                    onChange={(e) => setEditCourseForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-600">Course Ident</label>
                  <InputText
                    className="w-full"
                    value={editCourseForm.ident}
                    onChange={(e) => setEditCourseForm((f) => ({ ...f, ident: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-600">Credits</label>
                  <InputText
                    className="w-full"
                    value={editCourseForm.credits}
                    onChange={(e) => setEditCourseForm((f) => ({ ...f, credits: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-600">Hours</label>
                  <InputText
                    className="w-full"
                    value={editCourseForm.hours}
                    onChange={(e) => setEditCourseForm((f) => ({ ...f, hours: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-600">Offered</label>
                  <InputText
                    className="w-full"
                    value={editCourseForm.offered}
                    onChange={(e) => setEditCourseForm((f) => ({ ...f, offered: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-600">Prerequisite Text</label>
                  <InputText
                    className="w-full"
                    value={editCourseForm.prereq_txt}
                    onChange={(e) => setEditCourseForm((f) => ({ ...f, prereq_txt: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-600">
                    Prerequisite Idents (comma-separated)
                  </label>
                  <InputText
                    className="w-full"
                    value={editCourseForm.prereqIdents}
                    onChange={(e) =>
                      setEditCourseForm((f) => ({ ...f, prereqIdents: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-600">Description</label>
                  <textarea
                    className="w-full rounded-md border border-slate-300 p-2 text-sm"
                    rows={4}
                    value={editCourseForm.description}
                    onChange={(e) =>
                      setEditCourseForm((f) => ({ ...f, description: e.target.value }))
                    }
                  />
                </div>
                <Button
                  className="w-full"
                  label={updatingCourse ? "Saving..." : "Save Changes"}
                  icon="pi pi-check"
                  onClick={handleSaveCourseEdits}
                  disabled={updatingCourse}
                />
              </div>
            </Dialog>

            <Dialog
              header="Delete Course"
              visible={deleteDialogVisible}
              style={{ width: "28rem" }}
              onHide={() => setDeleteDialogVisible(false)}
            >
              <div className="space-y-4">
                <div className="text-sm text-slate-700">
                  Are you sure you want to delete{" "}
                  <span className="font-semibold">{selectedCourse?.courseIdent?.replace(/_/g, " ")}</span>?
                </div>
                <Button
                  className="w-full"
                  label={deletingCourse ? "Deleting..." : "Delete Course"}
                  icon="pi pi-trash"
                  severity="danger"
                  onClick={handleDeleteCourse}
                  disabled={deletingCourse}
                />
              </div>
            </Dialog>
            </div>
        </div>
    );
};
