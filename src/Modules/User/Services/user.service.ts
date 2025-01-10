import { InjectRepository } from "@nestjs/typeorm";
import { User } from "../Entities/user.entity";
import { FindOneOptions, Repository } from "typeorm";
import { Injectable } from "@nestjs/common";
import { EmailExistsException } from "src/Shared/Exceptions/app.exceptions";
import { CreateGoogleAccountInput } from "../Types/userTypes";
import { UploadService } from "src/Modules/Upload/Services/upload.service";

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private uploadService: UploadService,
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
      password_hash: null,
    });

    return await this.userRepository.save(user);
  }

  async uploadProfilePicture(
    userId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    // Upload img to cloud
    const imageUrl = await this.uploadService.uploadImage(file.path);

    const user = await this.findAccount({ where: { id: userId } });
    if (!user) {
      throw new Error("User not found");
    }

    // remove existing img from cloud
    if (user.profile_picture) {
      this.uploadService.removeImage(imageUrl);
    }

    // Save the profile picture URL to the user entity in DB
    user.profile_picture = imageUrl;
    await this.userRepository.save(user);
    
    return imageUrl;
  }
}
