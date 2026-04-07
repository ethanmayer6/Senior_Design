import { describe, expect, it } from 'vitest';
import type { Flowchart } from '../api/flowchartApi';
import type { Major } from '../api/majorsApi';
import { buildMajorProgress } from './majorProgress';

function buildMajor(): Major {
  return {
    id: 7,
    name: 'Software Engineering',
    college: 'ENGINEERING',
    description: 'Test major',
    degreeRequirements: [
      {
        id: 1,
        name: 'Completed Requirement',
        satisfyingCredits: 0,
        courses: [{ id: 11, courseIdent: 'SE_1010', name: 'Intro', credits: 3 }],
        requirementGroups: [],
      },
      {
        id: 2,
        name: 'Partially Completed Requirement',
        satisfyingCredits: 0,
        courses: [
          { id: 12, courseIdent: 'ENGL_1500', name: 'Composition', credits: 3 },
          { id: 13, courseIdent: 'ENGL_2500', name: 'Written Communication', credits: 3 },
        ],
        requirementGroups: [],
      },
      {
        id: 3,
        name: 'Currently In Progress Requirement',
        satisfyingCredits: 0,
        courses: [{ id: 14, courseIdent: 'MATH_1650', name: 'Calculus', credits: 4 }],
        requirementGroups: [],
      },
      {
        id: 4,
        name: 'Unmet Requirement',
        satisfyingCredits: 0,
        courses: [{ id: 15, courseIdent: 'BIOL_1010', name: 'Biology', credits: 4 }],
        requirementGroups: [],
      },
    ],
  };
}

function buildFlowchart(): Flowchart {
  return {
    id: 21,
    totalCredits: 120,
    creditsSatisfied: 6,
    title: 'Flowchart 1',
    majorName: 'Software Engineering',
    courseStatusMap: {
      SE_1010: 'COMPLETED',
      ENGL_1500: 'COMPLETED',
      MATH_1650: 'IN_PROGRESS',
    },
    major: null,
    semesters: [],
  };
}

describe('buildMajorProgress', () => {
  it('treats partially completed requirements as in progress in the summary', () => {
    const snapshot = buildMajorProgress(buildMajor(), buildFlowchart());

    expect(snapshot.strictViewCounts).toEqual({
      total: 4,
      satisfied: 1,
      inProgress: 2,
      unmet: 1,
    });

    expect(snapshot.overallRequirementProgress).toEqual({
      total: 4,
      completed: 1,
      inProgress: 2,
      inProgressOnly: 2,
      unmet: 1,
    });

    expect(
      snapshot.requirementEntries.find((entry) => entry.name === 'Partially Completed Requirement')?.status
    ).toBe('IN_PROGRESS');
  });
});
