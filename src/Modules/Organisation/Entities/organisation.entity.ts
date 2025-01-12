import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from "typeorm";
import { MinLength, IsNotEmpty } from "class-validator";
import { User } from "src/Modules/User/Entities/user.entity";
import { Supplier } from "src/Modules/Supplier/Entities/supplier.entity";
import { PurchaseOrder } from "src/Modules/PurchaseOrder/Entities/purchaseOrder.entity";
import { PurchaseRequisition } from "src/Modules/PurchaseRequisition/Entities/purchaseRequisition.entity";
import { BaseEntity } from "src/Common/entities/base.entity";

@Entity("organisations")
export class Organisation extends BaseEntity {
  @MinLength(2)
  @IsNotEmpty()
  @Column({ type: "varchar", unique: true })
  name: string;

  @Column({ type: "varchar" })
  address: string;

  @ManyToOne(() => User, (user) => user.created_organisations)
  @JoinColumn({ name: "creator_id" })
  creator: User;

  @OneToMany(() => User, (user) => user.organisation)
  users: User[];

  @OneToMany(() => UserOrganisation, (userOrg) => userOrg.organisation)
  userOrganisations: UserOrganisation[];

  @OneToMany(() => Supplier, (supplier) => supplier.organisation)
  suppliers: Supplier[];

  @OneToMany(() => PurchaseOrder, (po) => po.organisation)
  purchaseOrders: PurchaseOrder[];

  @OneToMany(() => PurchaseRequisition, (pr) => pr.organisation)
  purchaseRequisitions: PurchaseRequisition[];
}


@Entity("user_organisations")
export class UserOrganisation extends BaseEntity {
  @ManyToOne(() => User, (user) => user.userOrganisations)
  @JoinColumn({ name: "user_id" })
  user: User;

  @ManyToOne(() => Organisation, (org) => org.userOrganisations)
  @JoinColumn({ name: "organisation_id" })
  organisation: Organisation;

  @Column({ type: "varchar", nullable: true, name: "organisation_role" })
  role: string;

  @Column({ type: "json", nullable: true })
  permissions: string[]; // Array of permissions like ["VIEW_REPORTS", "MANAGE_ORDERS"]
}
