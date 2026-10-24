import "server-only";
import { randomUUID } from "node:crypto";
import { certificateRpc, CertificateRpcMissingError, type CertificateDatabase } from "./backend.server";
import { generateCertificatePdf, validCertificateArtwork } from "./pdf.server";

export type CertificateGenerationResult = { state: "closed" | "area-not-ready" | "updated"; issued: number };
/** Durable SQL leases allow another authenticated drain to recover interrupted generation.
 * Only finishing the immutable private PDF queues a held DRAFT email. */
export async function generatePendingCertificates(config: CertificateDatabase,
  dependencies: { rpc?: typeof certificateRpc; pdf?: typeof generateCertificatePdf } = {}): Promise<CertificateGenerationResult> {
  if (process.env.CERTIFICATES_ENABLED !== "true") return { state: "closed", issued: 0 };
  const rpc = dependencies.rpc ?? certificateRpc, workerId = randomUUID();
  let issued = 0;
  try {
    const rows = await rpc(config, "msrc_certificates_generation_claim", { worker_id: workerId, batch_size: 3 });
    if (!Array.isArray(rows) || rows.length > 3) throw new Error("Certificate generation unavailable");
    for (const value of rows) {
      if (!validCertificateArtwork(value) || !("id" in value) || !("leaseToken" in value)
        || typeof value.id !== "string" || typeof value.leaseToken !== "string"
        || !/^[0-9a-f-]{36}$/i.test(value.id) || !/^[0-9a-f-]{36}$/i.test(value.leaseToken)) throw new Error("Certificate generation unavailable");
      const pdf = await (dependencies.pdf ?? generateCertificatePdf)(value);
      const result = await rpc(config, "msrc_certificates_generation_finish", {
        certificate_id: value.id, worker_id: workerId, lease_token: value.leaseToken, pdf_base64: pdf.toString("base64"),
      });
      if (result && typeof result === "object" && "state" in result && result.state === "issued") issued++;
    }
    return { state: "updated", issued };
  } catch (error) {
    if (error instanceof CertificateRpcMissingError) return { state: "area-not-ready", issued };
    throw new Error("Certificate generation unavailable");
  }
}
