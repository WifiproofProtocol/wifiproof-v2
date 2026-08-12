export type SchoolRole = "student" | "lecturer" | "admin";

export type SchoolViewer = {
  userId: string;
  organizationId: string;
  institutionalId: string;
  name: string;
  email: string;
  role: SchoolRole;
  mustChangePassword: boolean;
};

export type SchoolOrganization = {
  id: string;
  name: string;
  slug: string;
};

export type SchoolUnit = {
  id: string;
  code: string;
  title: string;
  room: string;
};

export type SchoolSession = {
  id: string;
  unitId: string;
  lecturerUserId: string;
  networkLabel: string;
  startsAt: string;
  endsAt: string;
  status: "open" | "closed" | "cancelled";
};

export type SchoolAttendance = {
  id: string;
  sessionId: string;
  studentUserId: string;
  status: "present" | "revoked";
  recordedAt: string;
};

export type SchoolEnrollment = {
  unitId: string;
  studentUserId: string;
  active: boolean;
};

export type SchoolTeachingAssignment = {
  unitId: string;
  lecturerUserId: string;
};

export type SchoolMember = {
  userId: string;
  institutionalId: string;
  name: string;
  role: SchoolRole;
  active: boolean;
};

export type SchoolState = {
  viewer: SchoolViewer | null;
  organization: SchoolOrganization | null;
  units: SchoolUnit[];
  sessions: SchoolSession[];
  attendance: SchoolAttendance[];
  enrollments: SchoolEnrollment[];
  teachingAssignments: SchoolTeachingAssignment[];
  members: SchoolMember[];
};

export const EMPTY_SCHOOL_STATE: SchoolState = {
  viewer: null,
  organization: null,
  units: [],
  sessions: [],
  attendance: [],
  enrollments: [],
  teachingAssignments: [],
  members: [],
};
