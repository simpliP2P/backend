import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class TokenHelper {
  private readonly defaultSecret = "sjkjksjkjks";
  private readonly defaultExpiresIn = "1h";

  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
  ) {}

  public generateVerificationToken(payload: any): string {
    const secret =
      this.config.get<string>("tokenSecrets.verificationToken.secret") ||
      this.defaultSecret;
    const expiresIn =
      this.config.get<string>("tokenSecrets.verificationToken.expiresIn") ||
      this.defaultExpiresIn;
    return this.generateToken(payload, secret, expiresIn);
  }

  public verifyVerificationToken(token: string): any {
    const secret =
      this.config.get<string>("tokenSecrets.verificationToken.secret") ||
      this.defaultSecret;
    return this.verifyToken(token, secret);
  }

  public generateAccessToken(payload: any): string {
    const secret =
      this.config.get<string>("tokenSecrets.accessToken.secret") ||
      this.defaultSecret;
    const expiresIn =
      this.config.get<string>("tokenSecrets.accessToken.expiresIn") ||
      this.defaultExpiresIn;
    return this.generateToken(payload, secret, expiresIn);
  }

  public verifyAccessToken(token: string): any {
    const secret =
      this.config.get<string>("tokenSecrets.accessToken.secret") ||
      this.defaultSecret;
    return this.verifyToken(token, secret);
  }

  private generateToken(
    payload: any,
    secret: string,
    expiresIn: string,
  ): string {
    return this.jwt.sign(payload, { secret, expiresIn });
  }

  private verifyToken(token: string, secret: string): any {
    try {
      return this.jwt.verify(token, { secret });
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        throw new Error("Token has expired. Request a new token.");
      } else {
        throw new Error("Token verification failed.");
      }
    }
  }
}
