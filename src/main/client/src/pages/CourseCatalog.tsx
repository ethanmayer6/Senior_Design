import {CourseCard} from "../components/CourseCard";
import type {Course} from "../types/course";
import axios from "axios";
import {useEffect, useState} from "react";
import {Button} from "primereact/button";
import {InputText} from "primereact/inputtext";
import {Panel} from "primereact/panel"
import {RadioButton} from "primereact/radiobutton";
// import { Slider } from 'primereact/slider';

export default function CourseCatalog() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [level, setLevel] = useState('');
    const [offeredTerm, setOfferedTerm] = useState('');
    const [department, setDepartment] = useState('');
    const [allCourses, setAllCourses] = useState<Course[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    // const [credits, setCredits] = useState(0);



    const searchCourses = async (): Promise<void> => {
        try {
            const filteredCourses = allCourses.filter(course =>{
                  if(course.courseIdent.replace("_", " ").toLowerCase().includes(searchTerm.toLowerCase())){
                    return course;
                  }
                });
            
            setCourses(filteredCourses);
        } catch (error) {
            console.error("Error fetching courses:", error);
        }
    };

    const getCourses = async (): Promise<void> => {
        try {
            const response = await axios.get("http://localhost:8080/api/courses/all");
            console.log(response.data);
            setCourses(response.data);
            setAllCourses(response.data);
        } catch (error) {
            console.error("Error fetching courses:", error);
        }
    };

    const applyFilter = async (): Promise<void> => {
        try {
              
              let filteredCourses = allCourses;
              let all = allCourses;


              if(level != ''){
                filteredCourses = all.filter(course =>{
                  const number = parseInt(course.courseIdent.split("_")[1]);
                  if(number >= parseInt(level) && number <= parseInt(level) + 1000){
                    return number;
                  }
                });
                
                

              }
              if(filteredCourses != all){
                all = filteredCourses;
              }


              if(offeredTerm != ''){
                filteredCourses = all.filter(course =>{
                  const terms = course.offered.toLowerCase();

                  if(terms.includes(offeredTerm)){
                    return terms;
                  }

                });

              }

              if(filteredCourses != all){
                all = filteredCourses;
              }


              if(department != ''){
                filteredCourses = all.filter(course =>{
                  const dept = course.courseIdent.split("_")[0];

                  if(dept == department){
                    return dept;
                  }

                });
              }

              setCourses(filteredCourses);
              
            


        } catch (error) {
            console.error("Error fetching courses:", error);
        }
    };
    

    useEffect(() => {
        getCourses();
    }, []);

    return (
        <div className="min-h-screen p-4 flex gap-4">
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
                        <Button label="Apply Filters" icon="pi pi-filter" className="p-button-sm" onClick={() => { applyFilter();}} />
                        <Button label="Reset" icon="pi pi-refresh" className="p-button-text p-button-sm"
                                onClick={() => {  setLevel('');
                                                  setOfferedTerm('');
                                                  setDepartment('');
                                                  setCourses(allCourses);}} />
                    </div>

                </Panel>
            </aside>

            <main className="flex-1 flex flex-col gap-4">
                <div className="flex flex-row gap-4">
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
                    {courses.map((course) => (
                        <div key={course.courseIdent} className="w-full">
                            <CourseCard course={course}/>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
};
