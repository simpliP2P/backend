import { BaseEntity } from "src/Common/entities/base.entity";
import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { Organisation } from "./organisation.entity";

@Entity("organisation_categories")
export class OrganisationCategory extends BaseEntity {
  @Column({ type: "varchar" })
  name: string;

  @Column({ type: "timestamp", nullable: true, default: null })
  deactivated_at: Date | null;

  @ManyToOne(() => Organisation, (org) => org.categories)
  @JoinColumn({ name: "organisation_id" })
  organisation: Organisation;
}
