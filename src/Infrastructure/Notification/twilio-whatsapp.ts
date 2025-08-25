import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Twilio } from "twilio";

@Injectable()
export class TwilioWhatsAppService {
  private readonly client: Twilio;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    const accountSid =
      this.configService.getOrThrow<string>("twilio.accountSid");
    const authToken = this.configService.getOrThrow<string>("twilio.authToken");
    const twilioNumber =
      this.configService.getOrThrow<string>("twilio.phoneNumber");

    this.client = new Twilio(accountSid, authToken);
    // Format the from number for WhatsApp: whatsapp:+1234567890
    this.from = `whatsapp:${twilioNumber}`;
  }

  async sendWhatsAppMessage(to: string, body: string) {
    // Format the to number for WhatsApp: whatsapp:+1234567890
    const formattedTo = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;

    return this.client.messages.create({
      body,
      to: formattedTo,
      from: this.from,
    });
  }

  async sendWhatsAppMessageWithMedia(
    to: string,
    body: string,
    mediaUrl: string,
  ) {
    // Format the to number for WhatsApp: whatsapp:+1234567890
    const formattedTo = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;

    return this.client.messages.create({
      body,
      to: formattedTo,
      from: this.from,
      mediaUrl: [mediaUrl], // WhatsApp supports media URLs
    });
  }

  async sendWhatsAppTemplate(
    to: string,
    _: string,
    templateName: string,
    variables?: Record<string, string>,
  ) {
    // Format the to number for WhatsApp: whatsapp:+1234567890
    const formattedTo = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;

    const messageData: any = {
      to: formattedTo,
      from: this.from,
      contentSid: templateName,
      contentVariables: JSON.stringify(variables || {}),
    };

    return this.client.messages.create(messageData);
  }
}
