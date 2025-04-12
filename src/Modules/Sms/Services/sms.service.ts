import { Injectable } from "@nestjs/common";
import { TwilioSmsService } from "src/Infrastructure/SMS/twilio-sms";

@Injectable()
export class SmsService {
  constructor(private readonly twilioSmsService: TwilioSmsService) {}

  async sendPurchaseOrderSms(
    to: string,
    data: { organisationName: string; supplierName: string; poUrl: string },
  ) {
    try {
      const body = `Hi ${data.supplierName}, You have a new purchase order from ${data.organisationName}. Click here to view: ${data.poUrl}`;

      const response = await this.twilioSmsService.sendSms(to, body);
      return response;
    } catch (error) {
      throw new Error(`Failed to send SMS: ${error.message}`);
    }
  }
}
