import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  BeforeInsert,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { UserRole, ProviderType } from "../Enums/user.enum";
import {
  IsOptional,
  IsDate,
  minLength,
  MinLength,
  IsEmail,
  IsStrongPassword,
} from "class-validator";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

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
  company_name: string | null;

  @Column({ type: "varchar", nullable: true })
  company_role: string | null;

  @Column({ type: "varchar", nullable: true })
  company_address: string | null;

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

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

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
    if (!this.company_name || !this.company_address || !this.company_role) {
      throw new Error(
        "company name, address and role are required for local provider accounts.",
      );
    }
  }

  private setDefaultsForExternalProvider() {
    this.password_hash = null;
    this.company_name = this.company_name || null;
    this.company_address = this.company_address || null;
    this.company_role = this.company_role || null;
  }
}
