export type Course = {
  id?: number;
  name: string;
  courseIdent: string;
  credits: number;
  prereq_txt?: string;
  prerequisites: string[]; // Set<String>
  description: string;
  hours?: string;
  offered: string;
};
