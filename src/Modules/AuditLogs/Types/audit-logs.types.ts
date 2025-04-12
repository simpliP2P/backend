import { Organisation } from "src/Modules/Organisation/Entities/organisation.entity";
import { User } from "src/Modules/User/Entities/user.entity";

export interface IAuditLog {
  id: number;
  organisation: Partial<Organisation>;
  user: Partial<User>;
  entity_type: string;
  entity_id: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  changed_fields: Record<string, any>;
  previous_values: Record<string, any>;
  description: string;
  created_at: Date;
}

export interface IAuditLogMetadata {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface IAuditLogResponse {
  logs: IAuditLog[];
  metadata: IAuditLogMetadata;
}

export interface IGetAllAuditLogsByOrg {
  organisationId: string;
  page: number;
  pageSize: number;
  startDate?: string;
  endDate?: string;
  exportAll?: boolean;
}
