import requests
import json

# --- Configuration ---
BASE_URL = "http://localhost:8080"
GROUP_ID = 355
ENDPOINT = f"/api/requirementgroup/{GROUP_ID}/linkcourses"
URL = BASE_URL + ENDPOINT

# --- Course list ---
course_idents = [
    "AESHM_4620X","AFAM_2010","AFAM_3300","AFAM_3340","AFAM_3350",
    "AFAM_3530","AFAM_3540","AFAM_4690X","AFAM_4730","AMD_5580",
    "AMIN_2010","AMIN_2050","AMIN_2100","AMIN_2250","AMIN_2400",
    "AMIN_3110","AMIN_3120","AMIN_3130","AMIN_3220","AMIN_3240",
    "AMIN_3270X","AMIN_3460","ANTHR_2100","ANTHR_5220","ARCH_3210",
    "ARTGR_3880","ARTGR_5880","ARTH_3860","ARTH_3950","BIOL_3070",
    "CJ_3330X","CJ_3390","CJ_3600","COMST_2100","CRP_3250","ECON_3210",
    "EDUC_4050","EDUC_4060","EDUC_4200","EDUC_4590","EDUC_5200",
    "EDUC_5590","FDM_1650","FDM_4580","FSHN_4420","FSHN_4630",
    "GLOBE_3300","GLOBE_4940C","HDFS_2390","HDFS_2400","HDFS_2700",
    "HDFS_2760","HDFS_2830","HDFS_2830H","HDFS_3600","HDFS_3870",
    "HDFS_4790","HIST_3450X","HIST_3660","HIST_3710","HIST_3720",
    "HIST_3800","HIST_3860","HIST_4570","HS_1670X","JLMC_1400X",
    "JLMC_4770","KIN_3600","LA_2720","LA_2740","LDST_3220","LDST_3330",
    "MGMT_4720","MUSIC_4720","NRS_4400","NUTRS_5630","PHIL_2350",
    "POLS_3330","POLS_3370X","POLS_3530","POLS_3850","PSYCH_3460",
    "PSYCH_3470","RELIG_2100","RELIG_2770","SOC_2350","SOC_3270",
    "SOC_3280","SOC_3310","SOC_3500","SPAN_3050","SPCM_2160","SPCM_3230",
    "SPED_2100X","USLS_2110","UST_1050","UST_1060","UST_2050","WGS_2010",
    "WGS_2030","WGS_2050","WGS_4010","WGS_4250","WISE_2010"
]

# --- Send POST request ---
headers = {"Content-Type": "application/json"}

try:
    response = requests.post(URL, headers=headers, data=json.dumps(course_idents))
    response.raise_for_status()
    print(f"✅ Success! Linked {len(course_idents)} courses to group {GROUP_ID}.")
    print("Response:", response.json())
except requests.exceptions.HTTPError as errh:
    print("❌ HTTP Error:", errh)
    print("Response:", response.text)
except requests.exceptions.ConnectionError as errc:
    print("❌ Connection Error:", errc)
except requests.exceptions.Timeout as errt:
    print("❌ Timeout Error:", errt)
except requests.exceptions.RequestException as err:
    print("❌ Unexpected Error:", err)