/**
 * Central application constants for eRTMAC-NWIS frontend.
 */
export const APP_CONFIG = {
  TITLE: "eRTMAC-NWIS",
  FULL_NAME: "Nearby Wells Intelligence System",
  OPERATOR: "Oil India Limited (OIL)",
  VERSION: "v1.0-SIH",
  DEFAULT_ACTIVE_WELL_ID: "OIL-X123",
  DEFAULT_RADIUS_KM: 20,
  DEFAULT_OFFSET_RADIUS_OPTIONS: [5, 10, 20, 50],
};

export const FORMATIONS_LIST = [
  "ALL",
  "Tipam Sandstone",
  "Barail Arenaceous",
  "Kopili Shale",
  "Sylhet Limestone",
  "Langpur Formation",
  "Namsang Sandstone",
  "Girujan Clay",
];

export const DEMO_PERSONAS = [
  {
    role: "DRILLING_ENGINEER",
    name: "Drilling Engineer",
    email: "engineer@nwis.demo",
    tag: "Primary User",
    description: "Operational view, real-time risk zones, and offset similarity analysis",
  },
  {
    role: "DRILLING_SUPERVISOR",
    name: "Drilling Supervisor",
    email: "supervisor@nwis.demo",
    tag: "Oversight & Escalate",
    description: "Multi-well oversight, parameter overrides, and incident escalation",
  },
  {
    role: "KNOWLEDGE_ADMIN",
    name: "Knowledge Administrator",
    email: "admin@nwis.demo",
    tag: "User & RBAC Admin",
    description: "Role permissions, user provisioning, and audit governance",
  },
];

export const NON_CERTAINTY_DISCLAIMER =
  "Advisory Notice: Historical patterns indicate heightened susceptibility based on offset well data, but do not guarantee downhole conditions. Continuous real-time telemetry monitoring is required.";
