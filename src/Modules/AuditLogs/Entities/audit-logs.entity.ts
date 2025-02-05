import { Organisation } from "src/Modules/Organisation/Entities/organisation.entity";
import { User } from "src/Modules/User/Entities/user.entity";
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";

@Entity("audit_logs")
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Organisation, (org) => org.userOrganisations)
  @JoinColumn({ name: "organisation_id" })
  organisation: Organisation;

  @ManyToOne(() => User, (user) => user.userOrganisations)
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ type: "varchar", length: 50 })
  entity_type: string; // e.g., 'purchase_requisitions'

  @Column({ type: "uuid" })
  entity_id: string; // ID of the modified entity

  @Column({ type: "varchar", length: 20 })
  action: "CREATE" | "UPDATE" | "DELETE";

  @Column({ type: "jsonb", nullable: true })
  changed_fields: Record<string, any>; // Stores only the changed fields

  @Column({ type: "jsonb", nullable: true })
  previous_values: Record<string, any>; // Stores the old values before change

  @Column({ type: "text" })
  description: string; // Human-readable action

  @CreateDateColumn()
  created_at: Date;
}
