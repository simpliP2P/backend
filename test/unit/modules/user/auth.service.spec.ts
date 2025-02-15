import { Test, TestingModule } from "@nestjs/testing";
import { AuthService } from "../../../../src/Modules/User/Services/auth.service";
import { getRepositoryToken } from "@nestjs/typeorm";
import { User } from "../../../../src/Modules/User/Entities/user.entity";
import { UserService } from "../../../../src/Modules/User/Services/user.service";
import { TokenHelper } from "../../../../src/Shared/Helpers/token.helper";
import { EmailServices } from "../../../../src/Modules/Mail/Services/mail.service";
import { ClientHelper } from "../../../../src/Shared/Helpers/client.helper";
import { TokenService } from "../../../../src/Modules/Token/Services/token.service";
import { AppLogger } from "../../../../src/Logger/logger.service";
import { Repository } from "typeorm";
import {
  UnauthorizedException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { ProviderType } from "../../../../src/Modules/User/Enums/user.enum";
import { TokenType } from "../../../../src/Modules/Token/Enums/token.enum";
import * as bcrypt from "bcrypt";

describe("AuthService", () => {
  let service: AuthService;
  let userRepository: Repository<User>;
  let userService: UserService;
  let tokenHelper: TokenHelper;
  let emailService: EmailServices;
  let clientHelper: ClientHelper;
  let tokenService: TokenService;
  let logger: AppLogger;

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockUserService = {
    createLocalAccount: jest.fn(),
    updateLastLogin: jest.fn().mockImplementation((userId) => {
      // Explicitly return a Promise
      return Promise.resolve();
      // OR
      // return Promise.reject(new Error('Update failed'));
    }),
    updateAccountUsingVerificationToken: jest.fn(),
    resetPasswordUsingVerifiedToken: jest.fn(),
  };

  const mockTokenHelper = {
    generateAccessToken: jest.fn(),
  };

  const mockEmailService = {
    sendVerificationEmail: jest.fn(),
    sendResetPasswordEmail: jest.fn(),
  };

  const mockClientHelper = {
    getCurrentClient: jest.fn(),
  };

  const mockTokenService = {
    createToken: jest.fn(),
    verifyToken: jest.fn(),
    findRefreshtoken: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    findToken: jest.fn(),
  };

  const mockLogger = {
    error: jest.fn(),
  };

  const mockRequest = {
    headers: {
      "user-agent": "TestAgent",
    },
    ip: "127.0.0.1",
  } as any;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: TokenHelper,
          useValue: mockTokenHelper,
        },
        {
          provide: EmailServices,
          useValue: mockEmailService,
        },
        {
          provide: ClientHelper,
          useValue: mockClientHelper,
        },
        {
          provide: TokenService,
          useValue: mockTokenService,
        },
        {
          provide: AppLogger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    userService = module.get<UserService>(UserService);
    tokenHelper = module.get<TokenHelper>(TokenHelper);
    emailService = module.get<EmailServices>(EmailServices);
    clientHelper = module.get<ClientHelper>(ClientHelper);
    tokenService = module.get<TokenService>(TokenService);
    logger = module.get<AppLogger>(AppLogger);
  });

  describe("signUp", () => {
    it("should create a local account and send verification email", async () => {
      const signUpDto = {
        email: "test@example.com",
        password: "password123",
        first_name: "John",
        last_name: "Doe",
        profile_picture: "https://example.com/image.jpg",
        phone: "08123456789",
      };

      const mockUser = { id: "1", ...signUpDto };
      const mockToken = "verification_token";
      const mockClientHost = "http://localhost:8080";

      mockUserService.createLocalAccount.mockResolvedValue(mockUser);
      mockTokenService.createToken.mockResolvedValue(mockToken);
      mockClientHelper.getCurrentClient.mockReturnValue({
        landingPage: mockClientHost,
      });
      mockEmailService.sendVerificationEmail.mockResolvedValue(undefined);

      await service.signUp(signUpDto);

      expect(mockUserService.createLocalAccount).toHaveBeenCalledWith(
        signUpDto,
      );
      expect(mockTokenService.createToken).toHaveBeenCalledWith(
        mockUser.id,
        TokenType.EMAIL_VERIFICATION,
      );
      expect(mockEmailService.sendVerificationEmail).toHaveBeenCalledWith(
        signUpDto.first_name,
        signUpDto.email,
        `${mockClientHost}/auth/verify-account/${mockToken}`,
      );
    });
  });

  describe("login", () => {
    it("should successfully login with valid credentials", async () => {
      const loginDto = {
        email: "test@example.com",
        password: "password123",
      };

      const mockUser = {
        id: "1",
        email: loginDto.email,
        password_hash: await bcrypt.hash("password123", 10),
        is_verified: true,
        provider: ProviderType.LOCAL,
        first_name: "John",
        last_name: "Doe",
        phone: "08123456789",
        profile_picture: "https://example.com/image.jpg",
        created_at: new Date(),
        updated_at: new Date(),
        userOrganisations: [
          {
            organisation: { id: 1 },
            role: "admin",
            permissions: ["read", "write"],
            is_creator: true,
            // accepted_invitation: true
          },
        ],
        // last_login: null,
      };

      // Setup mocks
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockTokenHelper.generateAccessToken.mockReturnValue("mock_access_token");
      mockTokenService.save.mockResolvedValue({ token: "mock_refresh_token" });

      const result = await service.login(loginDto, mockRequest);

      mockUserService.updateLastLogin.mockRejectedValue(
        new Error("Update failed"),
      );

      expect(result).toHaveProperty("tokens");
      expect(result).toHaveProperty("user");
    });

    it("should throw error for unverified account", async () => {
      const loginDto = {
        email: "test@example.com",
        password: "password123",
      };

      const mockUser = {
        id: "1",
        email: loginDto.email,
        password_hash: await bcrypt.hash("password123", 10),
        is_verified: false,
        provider: ProviderType.LOCAL,
        first_name: "John",
        last_name: "Doe",
        phone: "08123456789",
        profile_picture: "https://example.com/image.jpg",
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.login(loginDto, mockRequest)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it("should throw error for invalid credentials", async () => {
      const loginDto = {
        email: "test@example.com",
        password: "wrongpassword",
      };

      const mockUser = {
        id: "1",
        email: loginDto.email,
        password_hash: await bcrypt.hash("password123", 10),
        is_verified: true,
        provider: ProviderType.LOCAL,
        first_name: "John",
        last_name: "Doe",
        phone: "08123456789",
        profile_picture: "https://example.com/image.jpg",
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.login(loginDto, mockRequest)).rejects.toThrow(
        "Invalid email or password",
      );
    });
  });

  describe("verifyEmail", () => {
    it("should verify email successfully", async () => {
      const mockToken = "verify_token";
      const mockVerifiedToken = {
        user: { id: "1" },
      };

      mockTokenService.verifyToken.mockResolvedValue(mockVerifiedToken);

      await service.verifyEmail(mockToken);

      expect(mockTokenService.verifyToken).toHaveBeenCalledWith(
        mockToken,
        TokenType.EMAIL_VERIFICATION,
      );
      expect(
        mockUserService.updateAccountUsingVerificationToken,
      ).toHaveBeenCalledWith(mockVerifiedToken);
    });
  });

  describe("initiateResetPassword", () => {
    it("should generate reset password token and send email", async () => {
      const email = "test@example.com";
      const mockUser = {
        id: "1",
        email,
        first_name: "John",
      };
      const mockResetToken = "reset_token";
      const mockClientHost = "http://localhost:8080";

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockTokenService.createToken.mockResolvedValue(mockResetToken);
      mockClientHelper.getCurrentClient.mockReturnValue({
        landingPage: mockClientHost,
      });

      await service.initiateResetPassword(email);

      expect(mockTokenService.createToken).toHaveBeenCalledWith(
        mockUser.id,
        TokenType.PASSWORD_RESET,
      );
      expect(mockEmailService.sendResetPasswordEmail).toHaveBeenCalledWith(
        mockUser.first_name,
        mockUser.email,
        expect.stringContaining(
          `${mockClientHost}/auth/reset-password?token=${mockResetToken}`,
        ),
      );
    });

    it("should silently fail if user not found", async () => {
      const email = "nonexistent@example.com";

      mockUserRepository.findOne.mockResolvedValue(null);

      await service.initiateResetPassword(email);

      expect(mockTokenService.createToken).not.toHaveBeenCalled();
      expect(mockEmailService.sendResetPasswordEmail).not.toHaveBeenCalled();
    });
  });

  describe("logout", () => {
    it("should delete the refresh token when logging out", async () => {
      const refreshToken = "test_refresh_token";
      const mockTokenDoc = { id: "1" };

      mockTokenService.findToken.mockResolvedValue(mockTokenDoc);

      await service.logout(refreshToken);

      expect(mockTokenService.findToken).toHaveBeenCalledWith({
        where: { token: refreshToken },
      });
      expect(mockTokenService.delete).toHaveBeenCalledWith(mockTokenDoc.id);
    });
  });

  describe("logoutAll", () => {
    it("should delete all refresh tokens for the user", async () => {
      const userId = "user123";

      // Mock the delete method
      mockTokenService.delete.mockResolvedValue(undefined);

      await service.logoutAll(userId);

      // Verify that the delete method was called with the correct argument
      expect(mockTokenService.delete).toHaveBeenCalledWith({ user_id: userId });
    });

    it("should handle errors thrown by the token service", async () => {
      const userId = "user123";

      // Mock the delete method to throw an error
      mockTokenService.delete.mockRejectedValue(
        new Error("Failed to delete tokens"),
      );

      // Expect the method to throw the error
      await expect(service.logoutAll(userId)).rejects.toThrow(
        "Failed to delete tokens",
      );

      // Ensure the delete method was called
      expect(mockTokenService.delete).toHaveBeenCalledWith({ user_id: userId });
    });
  });
});

/**
 * Syntax
 * npm test -- test/unit/modules/user/auth.service.spec.ts -t "should successfully login with valid credentials"
 */
