import { BaseEntity } from "src/Common/entities/base.entity";
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { Organisation } from "./organisation.entity";
import { UserOrganisation } from "./user-organisation.entity";

@Entity("organisation_branches")
export class OrganisationBranch extends BaseEntity {
  @Column({ type: "varchar" })
  name: string;

  @Column({ type: "varchar" })
  address: string;

  @ManyToOne(() => Organisation, (org) => org.branches, { onDelete: "CASCADE" })
  @JoinColumn({ name: "organisation_id" })
  organisation: Organisation;

  @OneToMany(() => UserOrganisation, (userOrg) => userOrg.branch)
  userOrganisations: UserOrganisation[];
}
