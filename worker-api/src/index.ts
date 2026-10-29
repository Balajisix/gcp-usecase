import dotenv from "dotenv";
dotenv.config();

import express, {
  Request,
  Response,
} from "express";

import { Pool } from "pg";
import { Storage } from "@google-cloud/storage";

import {
  analyzeReceipt,
} from "./vertex-ai.js";

const app = express();

app.use(express.json());

const PORT =
  Number(process.env.PORT ?? 8080);

const DB_USER =
  process.env.DB_USER;

const DB_PASS =
  process.env.DB_PASS;

const DB_NAME =
  process.env.DB_NAME;

const INSTANCE_UNIX_SOCKET =
  process.env.INSTANCE_UNIX_SOCKET;

const BUCKET_NAME =
  process.env.GCS_BUCKET_NAME;

const GEMINI_MODEL =
  process.env.GEMINI_MODEL ??
  "gemini-3-flash-preview";

const requiredVariables = [
  "DB_USER",
  "DB_PASS",
  "DB_NAME",
  "INSTANCE_UNIX_SOCKET",
  "GCS_BUCKET_NAME",
  "GOOGLE_CLOUD_PROJECT",
];

for (const variable of requiredVariables) {
  if (!process.env[variable]) {
    throw new Error(
      `Missing environment variable: ${variable}`,
    );
  }
}

/*
 * PostgreSQL
 */
const pool = new Pool({
  user: DB_USER,
  password: DB_PASS,
  database: DB_NAME,
  host: INSTANCE_UNIX_SOCKET,

  max: 5,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 10_000,
});

pool.on("error", (error) => {
  console.error(
    "Unexpected PostgreSQL pool error:",
    error,
  );
});

/*
 * Cloud Storage
 */
const storage = new Storage();

const bucket =
  storage.bucket(BUCKET_NAME!);

/*
 * Pub/Sub message types
 */
interface PubSubMessage {
  data?: string;
  messageId?: string;
  attributes?: Record<
    string,
    string
  >;
}

interface PubSubPushRequest {
  message?: PubSubMessage;
  subscription?: string;
}

/*
 * Decode Pub/Sub payload.
 */
function decodePayload(
  message: PubSubMessage,
) {
  if (!message.data) {
    return null;
  }

  try {
    const json =
      Buffer.from(
        message.data,
        "base64",
      ).toString("utf8");

    return JSON.parse(json);
  } catch (error) {
    console.error(
      "Failed to decode Pub/Sub payload:",
      error,
    );

    return null;
  }
}

/*
 * Health check
 */
app.get(
  "/health",
  async (_req: Request, res: Response) => {
    try {
      await pool.query("SELECT 1");

      await bucket.getMetadata();

      res.status(200).json({
        status: "ok",
        service:
          "balaji-expense-worker",
        database: "connected",
        storage: "connected",
        aiModel: GEMINI_MODEL,
      });
    } catch (error) {
      console.error(
        "Worker health check failed:",
        error,
      );

      res.status(503).json({
        status: "error",
      });
    }
  },
);

/*
 * Pub/Sub push endpoint
 */
app.post(
  "/pubsub/receive",
  async (
    req: Request<
      {},
      {},
      PubSubPushRequest
    >,
    res: Response,
  ) => {
    const message =
      req.body?.message;

    if (!message) {
      return res.status(400).json({
        message:
          "Invalid Pub/Sub push request",
      });
    }

    const attributes =
      message.attributes ?? {};

    const payload =
      decodePayload(message);

    const bucketId =
      attributes.bucketId ??
      payload?.bucket;

    const objectName =
      attributes.objectId ??
      payload?.name;

    const eventType =
      attributes.eventType;

    console.log(
      JSON.stringify({
        messageId:
          message.messageId,
        eventType,
        bucketId,
        objectName,
      }),
    );

    /*
     * Validate event.
     */
    if (
      !bucketId ||
      !objectName
    ) {
      console.error(
        "Missing bucket or object name",
      );

      return res.status(400).json({
        message:
          "Missing bucket or object name",
      });
    }

    if (
      bucketId !== BUCKET_NAME
    ) {
      console.log(
        "Ignoring event for another bucket",
      );

      return res.status(204).send();
    }

    if (
      !objectName.startsWith(
        "receipts/",
      )
    ) {
      console.log(
        "Ignoring non-receipt object",
        objectName,
      );

      return res.status(204).send();
    }

    if (
      eventType &&
      eventType !==
        "OBJECT_FINALIZE"
    ) {
      console.log(
        "Ignoring event type",
        eventType,
      );

      return res.status(204).send();
    }

    /*
     * Get DB client for transaction.
     */
    const client =
      await pool.connect();

    let receiptId:
      number | null = null;

    let expenseId:
      number | null = null;

    try {
      /*
       * Fetch receipt metadata.
       *
       * We lock the row to prevent two
       * concurrent workers from processing
       * the same receipt simultaneously.
       */
      await client.query("BEGIN");

      const receiptResult =
        await client.query(
          `
          SELECT
            id,
            expense_id,
            processing_status,
            ai_status,
            ai_needs_review,
            content_type
          FROM receipts
          WHERE
            bucket_name = $1
            AND object_name = $2
          FOR UPDATE
          `,
          [
            bucketId,
            objectName,
          ],
        );

      if (
        receiptResult.rows.length ===
        0
      ) {
        await client.query(
          "ROLLBACK",
        );

        /*
         * Important:
         *
         * The Storage event may reach Pub/Sub
         * before the API transaction has committed.
         *
         * Returning 500 causes Pub/Sub retry.
         */
        throw new Error(
          `Receipt metadata not found for ${objectName}`,
        );
      }

      const receipt =
        receiptResult.rows[0];

      receiptId =
        Number(receipt.id);

      expenseId =
        Number(receipt.expense_id);

      /*
       * Idempotency.
       */
      if (
        receipt.ai_status ===
        "AI_COMPLETE"
      ) {
        await client.query(
          "COMMIT",
        );

        console.log(
          `Receipt ${receiptId} already AI processed.`,
        );

        return res.status(204).send();
      }

      /*
       * Move to AI_PROCESSING.
       */
      await client.query(
        `
        UPDATE receipts
        SET
          ai_status = 'AI_PROCESSING',
          ai_error = NULL,
          ai_model = $1
        WHERE id = $2
        `,
        [
          GEMINI_MODEL,
          receiptId,
        ],
      );

      await client.query(
        "COMMIT",
      );

      /*
       * Verify the Storage object exists.
       */
      const file =
        bucket.file(objectName);

      const [
        fileMetadata,
      ] = await file.getMetadata();

      const contentType =
        fileMetadata.contentType ??
        receipt.content_type;

      console.log(
        JSON.stringify({
          receiptId,
          expenseId,
          bucket:
            bucketId,
          objectName,
          contentType,
          size:
            fileMetadata.size,
          generation:
            fileMetadata.generation,
        }),
      );

      /*
       * Supported receipt MIME types.
       */
      const supportedTypes = [
        "image/jpeg",
        "image/png",
        "application/pdf",
      ];

      if (
        !supportedTypes.includes(
          contentType,
        )
      ) {
        throw new Error(
          `Unsupported receipt type: ${contentType}`,
        );
      }

      /*
       * Vertex AI / Gemini
       */
      console.log(
        `Sending receipt ${receiptId} to Vertex AI using ${GEMINI_MODEL}`,
      );

      const analysis =
        await analyzeReceipt(
          bucketId,
          objectName,
          contentType,
        );

      console.log(
        JSON.stringify({
          receiptId,
          analysis,
        }),
      );

      const expenseResult =
        await pool.query(
            `
            SELECT
            id,
            merchant,
            amount,
            expense_date,
            category
            FROM expenses
            WHERE id = $1
            `,
            [expenseId],
        );

        if (expenseResult.rows.length === 0) {
        throw new Error(
            `Expense ${expenseId} not found`,
        );
        }

        const expense =
        expenseResult.rows[0];

        /*
        * Compare user-entered values
        * with AI-extracted values.
        */
        function normalizeText(
        value: string,
        ) {
        return value
            .trim()
            .toLowerCase()
            .replace(/\s+/g, " ");
        }

        const mismatches: Array<{
        field: string;
        entered: unknown;
        extracted: unknown;
        }> = [];

        /*
        * Merchant comparison
        */
        if (
        analysis.merchant &&
        normalizeText(
            String(expense.merchant),
        ) !==
            normalizeText(
            analysis.merchant,
            )
        ) {
        mismatches.push({
            field: "merchant",
            entered: expense.merchant,
            extracted: analysis.merchant,
        });
        }

        /*
        * Amount comparison
        */
        const enteredAmount =
        Number(expense.amount);

        const extractedAmount =
        Number(analysis.totalAmount);

        if (
        Number.isFinite(
            extractedAmount,
        ) &&
        Math.abs(
            enteredAmount -
            extractedAmount,
        ) > 0.01
        ) {
        mismatches.push({
            field: "amount",
            entered: enteredAmount,
            extracted: extractedAmount,
        });
        }

        /*
        * Date comparison
        */
        const enteredDate =
        String(expense.expense_date);

        if (
        analysis.transactionDate &&
        enteredDate !==
            analysis.transactionDate
        ) {
        mismatches.push({
            field: "expense_date",
            entered: enteredDate,
            extracted:
            analysis.transactionDate,
        });
        }

        /*
        * Category comparison
        */
        if (
        analysis.category &&
        normalizeText(
            String(expense.category),
        ) !==
            normalizeText(
            analysis.category,
            )
        ) {
        mismatches.push({
            field: "category",
            entered: expense.category,
            extracted: analysis.category,
        });
        }

        /*
        * Decide validation status.
        */
        let validationStatus:
        | "VERIFIED"
        | "MISMATCH"
        | "NEEDS_REVIEW";

        if (analysis.needsReview) {
        validationStatus =
            "NEEDS_REVIEW";
        } else if (
        mismatches.length > 0
        ) {
        validationStatus =
            "MISMATCH";
        } else {
        validationStatus =
            "VERIFIED";
        }

        console.log(
        JSON.stringify({
            receiptId,
            validationStatus,
            mismatches,
        }),
        );

      /*
       * Update expense and receipt together.
       */
      const updateClient =
        await pool.connect();

      try {
        await updateClient.query(
          "BEGIN",
        );

        /*
         * Store complete structured AI output.
         */
        await updateClient.query(
        `
        UPDATE receipts
        SET
            ai_status = 'AI_COMPLETE',

            ai_result = $1::jsonb,

            ai_processed_at = NOW(),

            ai_error = NULL,

            ai_needs_review = $2,

            ai_model = $3,

            ai_validation_status = $4,

            ai_mismatches = $5::jsonb,

            ai_validated_at = NOW(),

            processing_status = 'AI_COMPLETE',

            processed_at = NOW(),

            processing_error = NULL

        WHERE id = $6
        `,
        [
            JSON.stringify(analysis),

            analysis.needsReview,

            GEMINI_MODEL,

            validationStatus,

            JSON.stringify(
            mismatches,
            ),

            receiptId,
        ],
        );

        await updateClient.query(
        "COMMIT",
        );
      } catch (databaseError) {
        try {
          await updateClient.query(
            "ROLLBACK",
          );
        } catch (rollbackError) {
          console.error(
            "Database rollback failed:",
            rollbackError,
          );
        }

        throw databaseError;
      } finally {
        updateClient.release();
      }

      console.log(
        `Receipt ${receiptId} AI processing completed.`,
      );

      /*
       * ACK Pub/Sub.
       */
      return res.status(204).send();
    } catch (error) {
      console.error(
        "AI receipt processing failed:",
        error,
      );

      if (receiptId !== null) {
        try {
          await pool.query(
            `
            UPDATE receipts
            SET
              ai_status = 'AI_FAILED',
              ai_error = $1
            WHERE id = $2
            `,
            [
              error instanceof Error
                ? error.message
                : "Unknown AI processing error",
              receiptId,
            ],
          );
        } catch (databaseError) {
          console.error(
            "Failed to record AI error:",
            databaseError,
          );
        }
      }

      /*
       * DO NOT ACK.
       *
       * Pub/Sub retries the message.
       */
      return res.status(500).json({
        message:
          "AI receipt processing failed",
      });
    } finally {
      client.release();
    }
  },
);

/*
 * Start worker.
 */
async function startServer() {
  try {
    await pool.query("SELECT 1");

    await bucket.getMetadata();

    console.log(
      `Worker using Gemini model: ${GEMINI_MODEL}`,
    );

    app.listen(
      PORT,
      "0.0.0.0",
      () => {
        console.log(
          `Worker listening on port ${PORT}`,
        );
      },
    );
  } catch (error) {
    console.error(
      "Worker startup failed:",
      error,
    );

    process.exit(1);
  }
}

startServer();
