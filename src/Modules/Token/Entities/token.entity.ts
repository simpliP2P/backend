import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from "typeorm";
import { User } from "../../User/Entities/user.entity";
import { MetaData, TokenType } from "../Enums/token.enum";

@Entity("tokens")
export class Token {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  token: string;

  @Column({ type: "enum", enum: TokenType })
  type: TokenType;

  @Column()
  expires_at: Date;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column()
  user_id: string;

  @Column({ type: "jsonb", nullable: true })
  meta_data: MetaData;

  @CreateDateColumn()
  created_at: Date;
}
