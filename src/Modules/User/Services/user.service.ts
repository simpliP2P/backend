import { InjectRepository } from "@nestjs/typeorm";
import { User } from "../Entities/user.entity";
import { FindOneOptions, Repository } from "typeorm";
import { Injectable } from "@nestjs/common";
import { EmailExistsException } from "src/Shared/Exceptions/app.exceptions";
import { CreateGoogleAccountInput } from "../Types/userTypes";

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  public async findAccount(query: FindOneOptions): Promise<User | null> {
    return await this.userRepository.findOne(query);
  }

  public async createGoogleAccount(
    data: CreateGoogleAccountInput,
  ): Promise<User> {
    const existingUser = await this.findAccount({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new EmailExistsException();
    }

    const user = this.userRepository.create({
      ...data,
      password: null,
    });

    return await this.userRepository.save(user);
  }
}
