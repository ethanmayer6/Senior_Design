import { describe, expect, it } from 'vitest';
import type { Flowchart } from '../api/flowchartApi';
import {
  generateDraftOptions,
  type SchedulerCourse,
  type SchedulerMajor,
} from './smartScheduler';

function makeCourse(overrides: Partial<SchedulerCourse>): SchedulerCourse {
  return {
    id: Number(overrides.id ?? 1),
    courseIdent: String(overrides.courseIdent ?? 'COMS_0000'),
    name: String(overrides.name ?? overrides.courseIdent ?? 'Course'),
    credits: Number(overrides.credits ?? 3),
    description: String(overrides.description ?? ''),
    hours: overrides.hours,
    offered: overrides.offered ?? 'FALL SPRING',
    prerequisites: overrides.prerequisites ?? [],
    prereq_txt: overrides.prereq_txt,
  };
}

function makeMajor(courses: SchedulerCourse[]): SchedulerMajor {
  return {
    id: 1,
    name: 'Test Major',
    degreeRequirements: [
      {
        id: 1,
        name: 'Core',
        satisfyingCredits: 0,
        courses,
        requirementGroups: [],
      },
    ],
  };
}

function makeFlowchart(partial?: Partial<Flowchart>): Flowchart {
  return {
    id: 1,
    totalCredits: 120,
    creditsSatisfied: 0,
    title: 'Plan',
    majorName: 'Test Major',
    courseStatusMap: {},
    major: undefined,
    semesters: [],
    ...partial,
  };
}

function allRecommendedIdents(result: ReturnType<typeof generateDraftOptions>) {
  return result.options.flatMap((option) => option.recommendedCourses.map((course) => course.courseIdent));
}

describe('smart scheduler guardrails', () => {
  it('respects the exact selected max credits instead of raising low caps to six credits', () => {
    const result = generateDraftOptions(
      makeMajor([
        makeCourse({ id: 1, courseIdent: 'COMS_2270', credits: 3 }),
        makeCourse({ id: 2, courseIdent: 'COMS_2280', credits: 3 }),
      ]),
      makeFlowchart(),
      'FALL 2026',
      5,
      'Any'
    );

    result.options.forEach((option) => {
      expect(option.projectedCredits).toBeLessThanOrEqual(5);
      expect(option.lockedCredits + option.recommendedCredits).toBeLessThanOrEqual(5);
    });
  });

  it('never recommends a draft above the user selected max credits', () => {
    const result = generateDraftOptions(
      makeMajor([
        makeCourse({ id: 1, courseIdent: 'COMS_2270', credits: 3 }),
        makeCourse({ id: 2, courseIdent: 'COMS_2280', credits: 3 }),
        makeCourse({ id: 3, courseIdent: 'MATH_2670', credits: 3 }),
      ]),
      makeFlowchart(),
      'FALL 2026',
      6,
      'Any'
    );

    expect(result.options).toHaveLength(3);
    result.options.forEach((option) => {
      expect(option.projectedCredits).toBeLessThanOrEqual(6);
      expect(option.lockedCredits + option.recommendedCredits).toBeLessThanOrEqual(6);
    });
  });

  it('does not add more courses when the target term is already above the selected max credits', () => {
    const result = generateDraftOptions(
      makeMajor([
        makeCourse({ id: 2, courseIdent: 'CPRE_2810', credits: 4 }),
      ]),
      makeFlowchart({
        semesters: [
          {
            id: 10,
            year: 2026,
            term: 'FALL',
            major: 'Test Major',
            courses: [
              {
                id: 11,
                name: 'Course A',
                courseIdent: 'COMS_2270',
                credits: 3,
                prereq_txt: '',
                prerequisites: [],
                description: '',
                offered: 'FALL SPRING',
              },
              {
                id: 12,
                name: 'Course B',
                courseIdent: 'MATH_2670',
                credits: 3,
                prereq_txt: '',
                prerequisites: [],
                description: '',
                offered: 'FALL SPRING',
              },
              {
                id: 13,
                name: 'Course C',
                courseIdent: 'ENGL_2500',
                credits: 3,
                prereq_txt: '',
                prerequisites: [],
                description: '',
                offered: 'FALL SPRING',
              },
            ],
          },
        ],
      }),
      'FALL 2026',
      6,
      'Any'
    );

    result.options.forEach((option) => {
      expect(option.lockedCredits).toBe(9);
      expect(option.recommendedCredits).toBe(0);
      expect(option.recommendedCourses).toHaveLength(0);
    });
  });

  it('enforces online delivery preference by excluding in-person style courses', () => {
    const result = generateDraftOptions(
      makeMajor([
        makeCourse({
          id: 1,
          courseIdent: 'ENGL_3140',
          description: 'This course is offered fully online and asynchronous.',
        }),
        makeCourse({
          id: 2,
          courseIdent: 'COMS_3090',
          description: 'Classroom lecture with studio activities on campus.',
        }),
      ]),
      makeFlowchart(),
      'FALL 2026',
      9,
      'Online'
    );

    expect(allRecommendedIdents(result)).toContain('ENGL_3140');
    expect(allRecommendedIdents(result)).not.toContain('COMS_3090');
  });

  it('enforces hybrid delivery preference by only recommending hybrid-tagged courses', () => {
    const result = generateDraftOptions(
      makeMajor([
        makeCourse({
          id: 1,
          courseIdent: 'SE_3190',
          description: 'Hybrid course with online and in-person sessions each week.',
        }),
        makeCourse({
          id: 2,
          courseIdent: 'MATH_1660',
          description: 'Traditional classroom instruction.',
        }),
      ]),
      makeFlowchart(),
      'FALL 2026',
      9,
      'Hybrid'
    );

    expect(allRecommendedIdents(result)).toContain('SE_3190');
    expect(allRecommendedIdents(result)).not.toContain('MATH_1660');
  });

  it('enforces in-person preference by excluding online and hybrid courses', () => {
    const result = generateDraftOptions(
      makeMajor([
        makeCourse({
          id: 1,
          courseIdent: 'ART_1010',
          description: 'Hands-on studio course in a classroom setting.',
        }),
        makeCourse({
          id: 2,
          courseIdent: 'HDFS_2830',
          description: 'Delivered fully online for distance education students.',
        }),
        makeCourse({
          id: 3,
          courseIdent: 'MGMT_3700',
          description: 'Hybrid format with online and in-person participation.',
        }),
      ]),
      makeFlowchart(),
      'FALL 2026',
      9,
      'In Person'
    );

    expect(allRecommendedIdents(result)).toContain('ART_1010');
    expect(allRecommendedIdents(result)).not.toContain('HDFS_2830');
    expect(allRecommendedIdents(result)).not.toContain('MGMT_3700');
  });

  it('does not treat earlier scheduled but unfulfilled prerequisite courses as satisfied', () => {
    const advancedCourse = makeCourse({
      id: 2,
      courseIdent: 'COMS_2280',
      prereq_txt: 'Prereq: COM S 2270',
      prerequisites: [],
    });

    const flowchart = makeFlowchart({
      semesters: [
        {
          id: 10,
          year: 2026,
          term: 'SPRING',
          major: 'Test Major',
          courses: [
            {
              id: 11,
              name: 'Intro Programming',
              courseIdent: 'COMS_2270',
              credits: 4,
              prereq_txt: '',
              prerequisites: [],
              description: '',
              offered: 'FALL SPRING',
            },
          ],
        },
      ],
    });

    const result = generateDraftOptions(makeMajor([advancedCourse]), flowchart, 'FALL 2026', 15, 'Any');

    expect(allRecommendedIdents(result)).not.toContain('COMS_2280');
  });

  it('blocks courses with missing co-requisites when the companion course is not already satisfied or planned in target term', () => {
    const physicsCourse = makeCourse({
      id: 3,
      courseIdent: 'PHYS_2220',
      prereq_txt: 'Co-req: MATH 2670.',
    });

    const result = generateDraftOptions(makeMajor([physicsCourse]), makeFlowchart(), 'FALL 2026', 15, 'Any');

    expect(allRecommendedIdents(result)).not.toContain('PHYS_2220');
  });

  it('allows a course once its co-requisite is already marked in progress', () => {
    const physicsCourse = makeCourse({
      id: 4,
      courseIdent: 'PHYS_2220',
      prereq_txt: 'Co-req: MATH 2670.',
    });

    const flowchart = makeFlowchart({
      courseStatusMap: {
        MATH_2670: 'IN_PROGRESS',
      },
    });

    const result = generateDraftOptions(makeMajor([physicsCourse]), flowchart, 'FALL 2026', 15, 'Any');

    expect(allRecommendedIdents(result)).toContain('PHYS_2220');
  });
});
