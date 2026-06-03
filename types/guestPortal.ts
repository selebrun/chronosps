export type ChecklistFieldType = 'text' | 'textarea' | 'number' | 'boolean' | 'select';

export interface GuestPortalUser {
  id: string;
  email: string;
  role: 'guest_admin' | 'supervisor' | 'operator';
  companyId: string;
  active: boolean;
}

export interface AssetChecklistTemplate {
  id: string;
  companyId: string;
  assetType: string;
  checklistName: string;
  requireSupervisorApproval: boolean;
  fields: Array<{
    key: string;
    label: string;
    type: ChecklistFieldType;
    required: boolean;
    options?: string[];
  }>;
}

export interface AssetRow {
  id: string;
  companyId: string;
  fracttalAssetId: string;
  code: string;
  name: string;
  assetType: string;
  active: boolean;
}

export interface ChecklistSubmission {
  id: string;
  companyId: string;
  assetId: string;
  templateId: string;
  status: 'pending_approval' | 'approved' | 'rejected' | 'work_order_created';
  hasFailure: boolean;
  answers: Record<string, unknown>;
  reporterName: string;
  reporterEmail: string;
  fracttalWorkOrderId?: string;
  createdAt: string;
}
