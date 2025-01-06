import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

/**
 * Manages the client links based on the current branch name.
 */
@Injectable()
export class ClientHelper {
  constructor(private readonly config: ConfigService) {}

  /**
   * Gets the current client links based on the branch name.
   * @returns The client links object for the current branch.
   */
  getCurrentClient(): { landingPage: string } {
    const currentBranchName: string =
      this.config.get<string>("branchName") || "main";

    const stagingLinks: { landingPage: string } = this.config.get(
      "clients.staging",
    ) || { landingPage: "" };
    const productionLinks: { landingPage: string } = this.config.get(
      "clients.production",
    ) || { landingPage: "" };
    return currentBranchName === "staging" ? stagingLinks : productionLinks;
  }
}
