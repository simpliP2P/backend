import { BaseEntity } from "src/Common/entities/base.entity";
import { User } from "src/Modules/User/Entities/user.entity";
import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { Organisation } from "./organisation.entity";
import { OrganisationBranch } from "./organisation-branch.entity";
import { OrganisationDepartment } from "./organisation-department.entity";

@Entity("user_organisations")
export class UserOrganisation extends BaseEntity {
  @ManyToOne(() => User, (user) => user.userOrganisations, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "user_id" })
  user: User;

  @ManyToOne(() => Organisation, (org) => org.userOrganisations, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "organisation_id" })
  organisation: Organisation;

  @Column({ type: "varchar", nullable: true, name: "organisation_role" })
  role: string;

  @Column({ type: "text", array: true, nullable: true })
  permissions: string[];

  @ManyToOne(() => OrganisationBranch, (branch) => branch.userOrganisations, {
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "branch_id" })
  branch: OrganisationBranch;

  @ManyToOne(
    () => OrganisationDepartment,
    (department) => department.userOrganisations,
    { onDelete: "SET NULL" },
  )
  @JoinColumn({ name: "department_id" })
  department: OrganisationDepartment;

  @Column({ default: false })
  is_creator: boolean;

  @Column({ default: false })
  accepted_invitation: boolean;

  @Column({ type: "timestamp", nullable: true, default: null })
  deactivated_at: Date | null;
}
