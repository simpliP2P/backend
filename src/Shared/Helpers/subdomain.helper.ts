export function generateSubdomain(orgName: string, options: any = {}) {
  const {
    maxLength = 63, // RFC compliant max length
    minLength = 3, // Minimum length for readability
    suffix = "", // Optional suffix
    fallbackPrefix = "org", // Fallback if name is too short
    preserveNumbers = true, // Keep numbers in the subdomain
  } = options;

  if (!orgName || typeof orgName !== "string") {
    throw new Error("Organization name is required and must be a string");
  }

  // Step 1: Basic cleanup
  let subdomain = orgName
    .toLowerCase()
    .trim()
    // Remove special characters except hyphens and numbers
    .replace(/[^a-z0-9\s-]/g, "")
    // Replace spaces and multiple hyphens with single hyphen
    .replace(/[\s-]+/g, "-")
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, "");

  // Step 2: Remove numbers if not preserving them
  if (!preserveNumbers) {
    subdomain = subdomain.replace(/[0-9]/g, "");
  }

  // Step 3: Handle edge cases
  if (subdomain.length < minLength) {
    subdomain = `${fallbackPrefix}-${subdomain}`;
  }

  // Step 4: Add suffix if provided
  if (suffix) {
    subdomain = `${subdomain}-${suffix}`;
  }

  // Step 5: Truncate if too long
  if (subdomain.length > maxLength) {
    subdomain = subdomain.substring(0, maxLength);
    // Remove trailing hyphen if truncation created one
    subdomain = subdomain.replace(/-+$/, "");
  }

  // Step 6: Final validation
  if (subdomain.length < minLength) {
    subdomain = `${fallbackPrefix}-${Date.now().toString(36)}`;
  }

  return subdomain;
}

// Utility function to validate subdomain
export function isValidSubdomain(subdomain: string): boolean {
  // RFC 1035 compliance checks
  if (subdomain.length < 1 || subdomain.length > 63) {
    console.error("Subdomain must be between 1 and 63 characters");
    return false;
  }

  if (!/^[a-z0-9-]+$/.test(subdomain)) {
    console.error(
      "Subdomain can only contain lowercase letters, numbers, and hyphens",
    );
    return false;
  }

  if (subdomain.startsWith("-") || subdomain.endsWith("-")) {
    console.error("Subdomain cannot start or end with a hyphen");
    return false;
  }

  if (subdomain.includes("--")) {
    console.error("Subdomain cannot contain consecutive hyphens");
    return false;
  }

  return true;
}

export function extractSubdomain(host: string): string | null {
  const parts = host.split(".");
  return parts.length >= 2 ? parts[0] : null;
}
