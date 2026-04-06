export enum Role {
  EMPLOYEE = 'EMPLOYEE',
  COORDINATOR = 'COORDINATOR',
  HANDLER = 'HANDLER',
  ADMIN = 'ADMIN',
}

export enum ComplaintStatus {
  Open = 'Open',
  Assigned = 'Assigned',
  Accepted = 'Accepted',
  InProgress = 'InProgress',
  Done = 'Done',
  Closed = 'Closed',
}

export enum ComplaintPriority {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
  Critical = 'Critical',
}

export interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  decryptedPassword?: string | null;
  role: Role;
  isActive: boolean;
  avatar?: string | null;
  mobileNumber?: string | null;
  profileDepartment?: string | null;
  defaultCompanyId?: number | null;
  defaultLocationId?: number | null;
  companyId?: number;
  locationId?: number;
}

export interface Company {
  id: number;
  name: string;
  address?: string | null;
  state?: string | null;
  city?: string | null;
  pincode?: string | null;
  contactPerson?: string | null;
  contactNumber?: string | null;
  logoUrl?: string | null;
  gstNo?: string | null;
  gstDate?: string | null;
  useAsParty: boolean;
  themeColor: string;
  isActive: boolean;
}

export interface Location {
  id: number;
  name: string;
  address: string;
  companyId: number;
  company?: Company;
  isActive: boolean;
}

export interface UserPermission {
  id: number;
  userId: number;
  viewDashboard: boolean;
  viewComplaints: boolean;
  raiseComplaint: boolean;
  viewAllComplaints: boolean;
  assignComplaints: boolean;
  handleComplaints: boolean;
  manageCategories: boolean;
  viewMaster: boolean;
  addMaster: boolean;
  editMaster: boolean;
  importMaster: boolean;
  exportMaster: boolean;
  manageCompany: boolean;
  manageLocation: boolean;
  accessSettings: boolean;
  navigationLayout: 'SIDEBAR' | 'HORIZONTAL';
}

export interface AppSettings {
  id: number;
  softwareName?: string | null;
  logoUrl?: string | null;
}

export type DashboardScope = 'location' | 'personalRaised' | 'personalAssigned';

export interface DashboardSummaryCounts {
  total: number;
  open: number;
  inProgress: number;
  completed: number;
}

export interface DashboardKpi {
  totalTickets: number;
  ticketsWithHandler: number;
  ticketsClosed: number;
  pendingClosure: number;
  reopened: number;
  reassigned: number;
  closeRatePercent: number;
}

export interface HandlerPerformanceRow {
  handlerUserId: number;
  handlerName: string;
  companyName?: string | null;
  assignedTotal: number;
  completed: number;
  reopened: number;
  completionRatePercent: number;
}

export interface LocationWiseCount {
  locationId: number;
  locationName: string;
  count: number;
}

export interface DashboardMetrics {
  scope: DashboardScope;
  summary: DashboardSummaryCounts;
  kpi: DashboardKpi;
  handlerPerformance: HandlerPerformanceRow[];
  locationWiseCount: LocationWiseCount[];
}

export interface ComplaintListItem {
  id: number;
  complaintNo: string;
  title: string;
  descriptionPreview?: string | null;
  locationId: number;
  locationName?: string | null;
  companyName?: string | null;
  categoryId: number;
  categoryName?: string | null;
  departmentId?: number | null;
  departmentName?: string | null;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  assignedHandlerUserId?: number | null;
  assignedHandlerName?: string | null;
  raisedByUserId: number;
  raisedByName?: string | null;
  imageUrls?: string[] | null;
  completionPhotoUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ComplaintLogEntry {
  id: number;
  userId: number;
  userName?: string | null;
  message: string;
  fromStatus?: ComplaintStatus | null;
  toStatus: ComplaintStatus;
  createdAt: string;
}

export interface ComplaintDetail extends ComplaintListItem {
  description: string;
  timeline: ComplaintLogEntry[];
}

export interface ComplaintCategory {
  id: number;
  locationId: number;
  locationName?: string | null;
  name: string;
  isActive: boolean;
}

export interface FacilityDepartment {
  id: number;
  locationId: number;
  locationName?: string | null;
  name: string;
  isActive: boolean;
}

export interface ValidationEntry {
  row: number;
  data: unknown;
  message?: string;
}

export interface ValidationResult {
  valid: ValidationEntry[];
  invalid: ValidationEntry[];
  duplicates: ValidationEntry[];
  alreadyExists: ValidationEntry[];
  totalRows: number;
}
