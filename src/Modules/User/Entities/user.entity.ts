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
  firstName: string;

  @MinLength(2)
  @Column({ type: "varchar" })
  lastName: string;

  @IsEmail()
  @Column({ type: "varchar", unique: true })
  email: string;

  @IsStrongPassword()
  @Column({ type: "varchar", nullable: true })
  password: string | null;

  @Column({ type: "varchar", nullable: true })
  companyName: string | null;

  @Column({ type: "varchar", nullable: true })
  companyRole: string | null;

  @Column({ type: "varchar", nullable: true })
  companyAddress: string | null;

  @Column({ type: "varchar", nullable: true })
  companyLogo: string;

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
  isVerified: boolean;

  @IsOptional()
  @IsDate()
  @Column({ type: "timestamp", nullable: true })
  verifiedAt: Date | null;

  @Column({ nullable: true })
  token: string;

  @Column({ nullable: true, type: "timestamp" })
  tokenExpires: Date;

  @IsOptional()
  @IsDate()
  @Column({ type: "timestamp", nullable: true })
  tokenGeneratedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  validateBeforeInsert() {
    if (this.provider === ProviderType.LOCAL) {
      this.validateLocalProvider();
    } else {
      this.setDefaultsForExternalProvider();
    }
  }

  private validateLocalProvider() {
    if (!this.password) {
      throw new Error("Password is required for local provider accounts.");
    }
    if (!this.companyName || !this.companyAddress || !this.companyRole) {
      throw new Error(
        "company name, address and role are required for local provider accounts.",
      );
    }
  }

  private setDefaultsForExternalProvider() {
    this.password = null;
    this.companyName = this.companyName || null;
    this.companyAddress = this.companyAddress || null;
    this.companyRole = this.companyRole || null;
  }
}
