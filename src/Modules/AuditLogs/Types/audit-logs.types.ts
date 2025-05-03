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

export interface IFlattenedAuditLog {
  id: number;
  entity_type: string;
  entity_id: string;
  action: string;
  changed_fields: Record<string, any>;
  previous_values: Record<string, any>;
  description: string;
  created_at: Date;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    role: string;
  };
}

export interface IAuditLogResponse {
  logs: IFlattenedAuditLog[];
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
