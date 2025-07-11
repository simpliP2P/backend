import { createHmac } from "node:crypto";

export function verifyReqSignature(
  clientSecretKey: string,
  payload: string,
  receivedSignature: string,
  timestamp: string,
) {
  if (!isTimestampValid(timestamp)) {
    throw new Error("Invalid timestamp");
  }
  const signaturePayload = `${timestamp}.${payload}`;

  const expected = createHmac("sha256", clientSecretKey)
  .update(signaturePayload)
  .digest("hex");

  const isValid = expected === receivedSignature;

  if (!isValid) {
    throw new Error("Invalid signature");
  }
}

function isTimestampValid(
  timestamp: string,
  toleranceInSeconds: number = 300,
): boolean {
  try {
    const timestampMs = parseInt(timestamp) * 1000;
    const now = Date.now();
    const diff = Math.abs(now - timestampMs);

    return diff <= toleranceInSeconds * 1000;
  } catch (error) {
    console.error("Error validating timestamp:", error);
    return false;
  }
}
