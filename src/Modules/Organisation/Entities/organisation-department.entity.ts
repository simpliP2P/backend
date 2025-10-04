import { IsNotEmpty, IsString } from "class-validator";
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
} from "typeorm";
import { Organisation } from "./organisation.entity";
import { User } from "src/Modules/User/Entities/user.entity";
import { UserOrganisation } from "./user-organisation.entity";
import { BaseEntity } from "src/Common/entities/base.entity";
import { OrganisationBranch } from "./organisation-branch.entity";

@Entity("organisation_departments")
export class OrganisationDepartment extends BaseEntity {
  @IsNotEmpty()
  @IsString()
  @Column()
  name: string;

  @IsString()
  @Column({ nullable: true })
  department_code: string;

  @OneToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "head_of_department_id" })
  head_of_department: User | null;

  @IsString()
  @Column({ nullable: true })
  description: string;

  @ManyToOne(() => Organisation, (org) => org.departments, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "organisation_id" })
  organisation: Organisation;

  @ManyToOne(() => OrganisationBranch, { onDelete: "SET NULL" })
  @JoinColumn({ name: "branch_id" })
  branch: OrganisationBranch;

  @OneToMany(() => UserOrganisation, (userOrg) => userOrg.department)
  userOrganisations: User[];
}
