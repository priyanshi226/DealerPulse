import type { DealershipDataset, EnrichedLead } from './types';

export interface NormalizedData {
  raw: DealershipDataset;
  leads: EnrichedLead[];
}

export async function loadDealershipData(): Promise<NormalizedData> {
  const res = await fetch(`${import.meta.env.BASE_URL}dealership_data.json`);
  if (!res.ok) {
    throw new Error(`Failed to load dealership_data.json: ${res.status} ${res.statusText}`);
  }
  const raw: DealershipDataset = await res.json();
  return { raw, leads: normalizeLeads(raw) };
}

function normalizeLeads(raw: DealershipDataset): EnrichedLead[] {
  const branchById = new Map(raw.branches.map((b) => [b.id, b]));
  const repById = new Map(raw.sales_reps.map((r) => [r.id, r]));

  return raw.leads.map((lead) => {
    const branch = branchById.get(lead.branch_id);
    const rep = repById.get(lead.assigned_to);
    return {
      ...lead,
      branchName: branch?.name ?? lead.branch_id,
      branchCity: branch?.city ?? '',
      repName: rep?.name ?? lead.assigned_to,
      repRole: rep?.role ?? 'sales_officer',
    };
  });
}
