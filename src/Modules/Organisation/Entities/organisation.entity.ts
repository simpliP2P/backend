import { Entity, Column, OneToMany } from "typeorm";
import { MinLength, IsNotEmpty } from "class-validator";
import { Supplier } from "src/Modules/Supplier/Entities/supplier.entity";
import { PurchaseOrder } from "src/Modules/PurchaseOrder/Entities/purchase-order.entity";
import { PurchaseRequisition } from "src/Modules/PurchaseRequisition/Entities/purchase-requisition.entity";
import { BaseEntity } from "src/Common/entities/base.entity";
import { Product } from "src/Modules/Product/Entities/product.entity";
import { UserOrganisation } from "./user-organisation.entity";
import { OrganisationBranch } from "./organisation-branch.entity";
import { OrganisationDepartment } from "./organisation-department.entity";
import { OrganisationCategory } from "./organisation-category.entity";

@Entity("organisations")
export class Organisation extends BaseEntity {
  @MinLength(2)
  @IsNotEmpty()
  @Column({ type: "varchar", unique: true })
  name: string;

  @Column({ type: "varchar", unique: true, default: "" })
  tenant_code: string;

  @Column({ type: "varchar" })
  address: string;

  @Column({ nullable: true })
  logo: string;

  @OneToMany(() => Product, (product) => product.organisation)
  products: Product[];

  @OneToMany(() => UserOrganisation, (userOrg) => userOrg.organisation)
  userOrganisations: UserOrganisation[];

  @OneToMany(() => Supplier, (supplier) => supplier.organisation)
  suppliers: Supplier[];

  @OneToMany(() => PurchaseOrder, (po) => po.organisation)
  purchaseOrders: PurchaseOrder[];

  @OneToMany(() => PurchaseRequisition, (pr) => pr.organisation)
  purchaseRequisitions: PurchaseRequisition[];

  @OneToMany(() => OrganisationBranch, (branch) => branch.organisation)
  branches: OrganisationBranch[];

  @OneToMany(
    () => OrganisationDepartment,
    (department) => department.organisation,
  )
  departments: OrganisationDepartment[];

  @OneToMany(() => OrganisationCategory, (category) => category.organisation)
  categories: OrganisationCategory[];
}
