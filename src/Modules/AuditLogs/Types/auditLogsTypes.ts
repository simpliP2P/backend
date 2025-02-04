import { Organisation } from "src/Modules/Organisation/Entities/organisation.entity";
import { User } from "src/Modules/User/Entities/user.entity";

export interface AuditLog {
    id: string;
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

export interface AuditLogMetadata {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export interface AuditLogResponse {
    logs: AuditLog[];
    metadata: AuditLogMetadata;
}