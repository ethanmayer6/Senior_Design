import {CourseCard} from "../components/CourseCard";
import type {Course} from "../types/course";
import axios from "axios";
import {useEffect, useState} from "react";
import {Link} from "react-router-dom";
import {Button} from "primereact/button";
import {InputText} from "primereact/inputtext";
import {Panel} from "primereact/panel"
import {RadioButton} from "primereact/radiobutton";
import {Dialog} from "primereact/dialog";
import Header from "../components/header";
import type {Semester} from "../api/flowchartApi";
import {getUserFlowchart, updateSemesterCourses} from "../api/flowchartApi";
// import { Slider } from 'primereact/slider';

function semesterRank(year: number, term: string): number {
  const order: Record<string, number> = {
    SPRING: 1,
    SUMMER: 2,
    FALL: 3,
  };
  const termRank = order[term?.toUpperCase()] ?? 9;
  return year * 10 + termRank;
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


    const searchCourses = async (): Promise<void> => {
      try {
        const response = await axios.get("http://localhost:8080/api/courses/search", {params: {searchTerm}});
        setCourses(response.data);
        setHasMore(false);
      } catch (error) {
            console.error("Error fetching courses:", error);
      }
    };
    const applyFilter = async (page:number=0): Promise<void> => {
      try {
        

        const response = await axios.get("http://localhost:8080/api/courses/filter", {params: {level, offeredTerm, department, page}});
        if(page === 0){
          setCourses(response.data);
        }
        else{
          setCourses(prev => [...prev, ...response.data]);
        }
        setHasMore(response.data.length === 50);
        setFiltered(true);
        setPageNumber(page);

      } catch (error) {
            console.error("Error fetching courses:", error);
      }
    };

    const getCourses = async (page:number, size:number=50): Promise<void> => {
        try {

            
              const response = await axios.get("http://localhost:8080/api/courses/page", {params: {page, size}});
              console.log(response.data);
              if(page === 0){
                setCourses(response.data);
                
                
              }
              else{
                setCourses(prev => [...prev, ...response.data]);
                
              }
              setPageNumber(page);
              setHasMore(response.data.length === size);
              setFiltered(false);
            

            
        } catch (error) {
            console.error("Error fetching courses:", error);
        }
    };


    useEffect(() => {
        getCourses(0);
    }, []);

    useEffect(() => {
      const loadSemesters = async () => {
        try {
          const flowchart = await getUserFlowchart();
          if (!flowchart || !flowchart.semesters || flowchart.semesters.length === 0) {
            setFlowchartExists(false);
            setSemesters([]);
            return;
          }
          const sorted = [...flowchart.semesters].sort(
            (a, b) => semesterRank(a.year, a.term) - semesterRank(b.year, b.term)
          );
          setFlowchartExists(true);
          setSemesters(sorted);
        } catch (error) {
          console.error("Error loading semesters for flowchart:", error);
          setFlowchartExists(false);
          setSemesters([]);
        }
      };
      loadSemesters();
    }, []);

    const openAddDialog = (course: Course) => {
      setSelectedCourse(course);
      setSelectedSemesterId(semesters.length ? semesters[0].id : null);
      setAddToFlowchartMessage(null);
      setAddToFlowchartError(null);
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

      setAddingCourse(true);
      setAddToFlowchartMessage(null);
      setAddToFlowchartError(null);
      try {
        await updateSemesterCourses(selectedSemesterId, {
          operation: "ADD",
          courseIdent: selectedCourse.courseIdent,
        });
        setAddToFlowchartMessage(`Added ${selectedCourse.courseIdent} to your flowchart.`);
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
        const response = await axios.put(
          `http://localhost:8080/api/courses/update/${selectedCourse.id}`,
          payload
        );

        const updatedCourse: Course = response.data;
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
        await axios.delete(`http://localhost:8080/api/courses/delete/${selectedCourse.id}`);
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
                        <Button label="Apply Filters" icon="pi pi-filter" className="p-button-sm" onClick={() => {applyFilter();}} />
                        <Button label="Reset" icon="pi pi-refresh" className="p-button-text p-button-sm"
                                onClick={() => {  setLevel('');
                                                  setOfferedTerm('');
                                                  setDepartment('');
                                                  setFiltered(false);
                                                  getCourses(0);}} />
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
                        searchCourses();
                        }
                      }}/>
                    <Button icon="pi pi-search"
                      onClick={() => {
                        searchCourses();
                      }}/>
                </div>
                <div className="flex flex-col gap-4 w-full">
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
                        onClick={() => filtered ? applyFilter(pageNumber + 1) : getCourses(pageNumber + 1)}
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
                  <Button
                    className="w-full"
                    label={addingCourse ? "Adding..." : "Add to CourseFlow"}
                    icon="pi pi-plus"
                    onClick={handleConfirmAddCourse}
                    disabled={addingCourse || !selectedCourse}
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
