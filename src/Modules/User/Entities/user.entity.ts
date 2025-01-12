import {
  Entity,
  Column,
  BeforeInsert,
  OneToMany,
  ManyToOne,
} from "typeorm";
import { UserRole, ProviderType } from "../Enums/user.enum";
import {
  IsOptional,
  IsDate,
  MinLength,
  IsEmail,
  IsStrongPassword,
} from "class-validator";
import { Organisation, UserOrganisation } from "src/Modules/Organisation/Entities/organisation.entity";
import { BaseEntity } from "src/Common/entities/base.entity";

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

  @Column({ type: "varchar", nullable: true, length: 15 })
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

  @IsOptional()
  @IsDate()
  @Column({ type: "timestamp", nullable: true })
  verified_at: Date | null;

  // Single-organization restriction
  @ManyToOne(() => Organisation, (org) => org.users)
  organisation: Organisation;

  @OneToMany(() => UserOrganisation, (userOrg) => userOrg.user)
  userOrganisations: UserOrganisation[];

  @OneToMany(() => Organisation, (org) => org.creator)
  created_organisations: Organisation[];

  @BeforeInsert()
  validateBeforeInsert() {
    if (this.provider === ProviderType.LOCAL) {
      this.validateLocalProvider();
    } else {
      this.setDefaultsForExternalProvider();
    }
  }

  private validateLocalProvider() {
    if (!this.password_hash) {
      throw new Error("Password is required for local provider accounts.");
    }
  }

  private setDefaultsForExternalProvider() {
    this.password_hash = null;
  }
}
