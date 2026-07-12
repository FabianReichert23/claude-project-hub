export type Project = {
  id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
};

export type Epic = {
  id: number;
  project_id: number;
  name: string;
  implemented: 0 | 1;
  created_at: string;
  updated_at: string;
};

export type Requirement = {
  id: number;
  project_id: number;
  epic_id: number | null;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "draft" | "approved" | "in_progress" | "done" | "rejected";
  type: "requirement" | "bug";
  implemented: 0 | 1;
  created_at: string;
  updated_at: string;
};

export type Comment = {
  id: number;
  requirement_id: number;
  content: string;
  created_at: string;
};

export type ArchitectureDoc = {
  id: number;
  project_id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
};

export type WorklogEntry = {
  id: number;
  project_id: number;
  content: string;
  created_at: string;
};

export type TestCase = {
  id: number;
  project_id: number;
  requirement_id: number | null;
  title: string;
  description: string;
  steps: string;
  expected_result: string;
  status: "pending" | "pass" | "fail" | "blocked";
  created_at: string;
  updated_at: string;
};
