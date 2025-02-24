import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  BeforeInsert,
  AfterUpdate,
} from "typeorm";
import { IsDecimal, IsNotEmpty, IsString } from "class-validator";
import { OrganisationBranch } from "src/Modules/Organisation/Entities/organisation-branch.entity";
import { OrganisationDepartment } from "src/Modules/Organisation/Entities/organisation-department.entity";
import { BaseEntity } from "src/Common/entities/base.entity";
import { OrganisationCategory } from "src/Modules/Organisation/Entities/organisation-category.entity";
import { Organisation } from "src/Modules/Organisation/Entities/organisation.entity";

@Entity("budgets")
export class Budget extends BaseEntity {
  @Column()
  @IsString()
  @IsNotEmpty()
  name: string;

  @Column({ default: "NGN" })
  currency: string;

  /**
   * Initial budget amount
   */
  @Column("decimal", { precision: 18, scale: 2, default: 0 })
  @IsDecimal()
  amount_allocated: number;

  /**
   * Amount remaining after deductions
   */
  @Column("decimal", { precision: 18, scale: 2, default: 0 })
  @IsDecimal()
  amount_remaining: number;

  /**
   * Amount reserved for use
   */
  @Column("decimal", { precision: 18, scale: 2, default: 0 })
  @IsDecimal()
  amount_reserved: number;

  /**
   * remaining - reserved
   */
  @Column("decimal", { precision: 18, scale: 2, default: 0 })
  @IsDecimal()
  balance: number;

  @Column({ default: true })
  active: boolean;

  @ManyToOne(() => Organisation, { nullable: true })
  @JoinColumn({ name: "organisation_id" })
  organisation: Organisation;

  @ManyToOne(() => OrganisationCategory, { nullable: true })
  @JoinColumn({ name: "category_id" })
  category: OrganisationCategory;

  @ManyToOne(() => OrganisationBranch, { nullable: true })
  @JoinColumn({ name: "branch_id" })
  branch: OrganisationBranch;

  @ManyToOne(() => OrganisationDepartment, { nullable: true })
  @JoinColumn({ name: "department_id" })
  department: OrganisationDepartment;

  /**
   * Before inserting, set initial `amount_remaining`
   * and calculate `balance`
   */
  @BeforeInsert()
  beforeInsertActions() {
    this.amount_remaining = this.amount_allocated;
    this.balance = this.amount_remaining - this.amount_reserved;
  }

  /**
   * After updating, update `balance`
   */
  @AfterUpdate()
  AfterUpdateActions() {
    this.balance = this.amount_remaining - this.amount_reserved;
  }
}
