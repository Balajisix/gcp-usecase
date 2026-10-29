import { Storage } from "@google-cloud/storage";

const bucketName = process.env.GCS_BUCKET_NAME;

if (!bucketName) {
  throw new Error(
    "Missing GCS_BUCKET_NAME environment variable",
  );
}

/**
 * Google Cloud Storage client.
 *
 * In Cloud Run, the client automatically uses
 * the service account attached to the Cloud Run service.
 */
export const storage = new Storage();

export const receiptBucket =
  storage.bucket(bucketName);

/**
 * Upload a receipt to Cloud Storage.
 */
export async function uploadReceipt(
  buffer: Buffer,
  objectName: string,
  contentType: string,
) {
  const file = receiptBucket.file(objectName);

  await file.save(buffer, {
    resumable: false,

    metadata: {
      contentType,

      cacheControl:
        "private, max-age=0, no-store",
    },
  });

  return {
    bucketName,
    objectName,
  };
}

/**
 * Delete a receipt from Cloud Storage.
 *
 * Used when database processing fails after
 * the file has already been uploaded.
 */
export async function deleteReceipt(
  objectName: string,
) {
  await receiptBucket
    .file(objectName)
    .delete({
      ignoreNotFound: true,
    });
}
