import requests
import csv
import sys
import os

BASE_URL = "http://localhost:8080/api/courses"

course = {
    "courseIdent": "Test_1234",
    "name": "Critical Thinking and Communication",
    "credits": 3,
    "description": "Intro to written, oral, visual, and electronic communication; critical reading and thinking on civic/cultural topics.",
    "offered": "Spring, Fall",
    "hours": "Lecture or Online",
    "prereq_txt": "None",
    "prerequisites": []
}

def csv_reader(file):
    with open (file, encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            courseIdent = row["subject_code"] + "_" + row["course_number"][:4]
            
            try:
                credits = int(float(row["credits"][0]))
                
            except ValueError:
                credits = -1
                
            course = {
                "courseIdent" : courseIdent,
                "name": row["title_name"],
                "credits": credits,
                "description": row["description"],
                "offered": row["typically_offered"],
                "hours": row["contact_hours"],
                "prereq_txt": row["prerequisites"]
            }
            create_course(course)
            #sys.exit(0)

def create_course(course):
    try:
        resp = requests.post(f"{BASE_URL}/create", json=course)
        print(resp.status_code)
        if(resp.status_code == 401):
            print("Already exists")
        else:
            print(resp.json())
    except requests.exceptions.HTTPError as e:
        print(e)
    
list = os.listdir("courses_csv")
for file in list:
    csv_reader("courses_csv/" + file)
#csv_reader("courses_csv/ACCT.csv")