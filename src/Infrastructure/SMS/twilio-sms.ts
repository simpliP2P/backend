import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Twilio } from "twilio";

@Injectable()
export class TwilioSmsService {
  private readonly client: Twilio;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    const accountSid =
      this.configService.getOrThrow<string>("twilio.accountSid");
    const authToken = this.configService.getOrThrow<string>("twilio.authToken");
    const twilioNumber =
      this.configService.getOrThrow<string>("twilio.phoneNumber");

    this.client = new Twilio(accountSid, authToken);
    this.from = twilioNumber;
  }

  async sendSms(to: string, body: string) {
    return this.client.messages.create({
      body,
      to,
      from: this.from,
    });
  }
}
