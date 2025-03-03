import { Injectable } from "@nestjs/common";
import { createHash } from "crypto";

@Injectable()
export class HashHelper {
  public generateHashFromId(id: string): string {
    const hash = createHash("sha256").update(id).digest("hex");
    return parseInt(hash.substring(0, 10), 16).toString(36).substring(0, 8); // Convert hex to base36
  }
}
