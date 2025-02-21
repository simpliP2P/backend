import { Entity, Column, BeforeInsert, OneToMany } from "typeorm";
import { UserRole, ProviderType } from "../Enums/user.enum";
import {
  IsOptional,
  IsDate,
  MinLength,
  IsEmail,
  IsStrongPassword,
} from "class-validator";
import { BaseEntity } from "src/Common/entities/base.entity";
import { PurchaseRequisition } from "src/Modules/PurchaseRequisition/Entities/purchase-requisition.entity";
import { UserOrganisation } from "src/Modules/Organisation/Entities/user-organisation.entity";

@Entity("users")
export class User extends BaseEntity {
  @MinLength(2)
  @Column({ type: "varchar" })
  first_name: string;

  @MinLength(2)
  @Column({ type: "varchar" })
  last_name: string;

  @IsEmail()
  @Column({ type: "varchar", unique: true })
  email: string;

  @Column({ type: "varchar", nullable: true, length: 15, unique: true })
  phone: string;

  @IsStrongPassword()
  @Column({ type: "varchar", nullable: true })
  password_hash: string | null;

  @Column({ type: "varchar", nullable: true })
  profile_picture: string;

  @Column({
    type: "enum",
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({
    type: "enum",
    enum: ProviderType,
    default: ProviderType.LOCAL,
  })
  provider: ProviderType;

  @Column({ default: false })
  is_verified: boolean;

  @Column({ default: true })
  is_active: boolean;

  @Column({ type: "timestamp", nullable: true })
  last_login: Date;

  @IsOptional()
  @IsDate()
  @Column({ type: "timestamp", nullable: true })
  verified_at: Date | null;

  @OneToMany(() => UserOrganisation, (userOrg) => userOrg.user)
  userOrganisations: UserOrganisation[];

  @OneToMany(() => PurchaseRequisition, (pr) => pr.created_by)
  purchaseRequisitions: PurchaseRequisition[];

  @BeforeInsert()
  validateBeforeInsert() {
    if (this.provider === ProviderType.GOOGLE) {
      this.setDefaultsForExternalProvider();
    }
  }

  private setDefaultsForExternalProvider() {
    this.password_hash = null;
  }
}
