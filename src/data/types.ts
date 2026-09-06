// Types mirroring the actual shape of dealership_data.json.
// This file is the single source of truth for the dataset's shape.

export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'test_drive'
  | 'negotiation'
  | 'order_placed'
  | 'delivered'
  | 'lost';

export type LeadSource =
  | 'website'
  | 'walk_in'
  | 'referral'
  | 'phone_enquiry'
  | 'social_media'
  | 'auto_expo';

export type RepRole = 'branch_manager' | 'sales_officer';

export interface Branch {
  id: string;
  name: string;
  city: string;
}

export interface SalesRep {
  id: string;
  name: string;
  branch_id: string;
  role: RepRole;
  joined: string;
}

export interface StatusHistoryEntry {
  status: LeadStatus;
  timestamp: string;
  note: string;
}

export interface Lead {
  id: string;
  customer_name: string;
  phone: string;
  source: LeadSource;
  model_interested: string;
  status: LeadStatus;
  assigned_to: string;
  branch_id: string;
  created_at: string;
  last_activity_at: string;
  status_history: StatusHistoryEntry[];
  expected_close_date: string;
  deal_value: number;
  lost_reason: string | null;
}

export interface Target {
  branch_id: string;
  month: string;
  target_units: number;
  target_revenue: number;
}

export interface Delivery {
  lead_id: string;
  order_date: string;
  delivery_date: string;
  days_to_deliver: number;
  delay_reason: string | null;
}

export interface DealershipDataset {
  metadata: {
    generated_at: string;
    description: string;
    date_range: string;
    notes: string;
  };
  branches: Branch[];
  sales_reps: SalesRep[];
  leads: Lead[];
  targets: Target[];
  deliveries: Delivery[];
}

/**
 * A Lead enriched with data joined in from branches/sales_reps, so the UI
 * layer never has to do its own lookups. This is the row type the whole
 * Data Explorer (and, later, KPIs/charts) is built on top of.
 */
export interface EnrichedLead extends Lead {
  branchName: string;
  branchCity: string;
  repName: string;
  repRole: RepRole;
}
