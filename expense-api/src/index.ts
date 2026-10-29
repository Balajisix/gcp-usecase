import dotenv from "dotenv";
dotenv.config();

import cors from "cors";
import express, {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  pool,
  testDatabaseConnection,
} from "./db.js";

import crypto from "node:crypto";
import path from "node:path";

import multer from "multer";

import {
  uploadReceipt,
  deleteReceipt,
} from "./storage.js";

const app = express();

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },

  fileFilter: (_req, file, callback) => {
    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "application/pdf",
    ];

    if (
      !allowedMimeTypes.includes(
        file.mimetype,
      )
    ) {
      return callback(
        new Error(
          "Only JPEG, PNG and PDF receipts are allowed",
        ),
      );
    }

    callback(null, true);
  },
});

const PORT = Number(process.env.PORT ?? 8080);

const frontendOrigin =
  process.env.FRONTEND_ORIGIN ??
  "http://localhost:5173";

/*
 * Middleware
 */
app.use(
  cors({
    origin: frontendOrigin,
  }),
);

app.use(express.json());

/*
 * Root
 */
app.get("/", (_req: Request, res: Response) => {
  res.json({
    message: "Expense Analyzer API",
    stage: 1,
  });
});

/*
 * Health
 */
app.get(
  "/health",
  async (_req: Request, res: Response) => {
    try {
      await pool.query("SELECT 1");

      res.status(200).json({
        status: "ok",
        service: "expense-analyzer-api",
        database: "connected",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error(
        "Health check failed:",
        error,
      );

      res.status(503).json({
        status: "error",
        service: "expense-analyzer-api",
        database: "disconnected",
      });
    }
  },
);

/*
 * Get expenses
 */
app.get("/api/expenses", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        e.id,
        e.merchant,
        e.amount,
        e.expense_date,
        e.category,
        e.notes,
        e.created_at,

        CASE
          WHEN r.id IS NULL THEN NULL
          ELSE json_build_object(
            'id', r.id,
            'expenseId', r.expense_id,
            'fileName', r.original_file_name,
            'contentType', r.content_type,
            'fileSize', r.file_size,
            'createdAt', r.created_at,

            'processingStatus', r.processing_status,

            'aiStatus', r.ai_status,

            'aiResult', r.ai_result,

            'needsReview', r.ai_needs_review,

            'validationStatus', r.ai_validation_status,

            'mismatches', r.ai_mismatches,

            'validatedAt', r.ai_validated_at,

            'aiProcessedAt', r.ai_processed_at,

            'aiError', r.ai_error,

            'aiModel', r.ai_model
          )
        END AS receipt

      FROM expenses e

      LEFT JOIN receipts r
        ON r.expense_id = e.id

      ORDER BY e.created_at DESC
    `);

    return res.status(200).json(result.rows);
  } catch (error) {
    console.error("Failed to fetch expenses:", error);

    return res.status(500).json({
      message: "Failed to fetch expenses",
    });
  }
});

/*
 * Create expense
 */
app.post(
  "/api/expenses",
  async (req: Request, res: Response) => {
    try {
      const {
        merchant,
        amount,
        expenseDate,
        category,
        notes,
      } = req.body;

      if (
        !merchant ||
        amount === undefined ||
        !expenseDate
      ) {
        return res.status(400).json({
          message:
            "merchant, amount and expenseDate are required",
        });
      }

      const numericAmount = Number(amount);

      if (
        !Number.isFinite(numericAmount) ||
        numericAmount < 0
      ) {
        return res.status(400).json({
          message:
            "amount must be a valid number greater than or equal to 0",
        });
      }

      const result = await pool.query(
        `
        INSERT INTO expenses (
          merchant,
          amount,
          expense_date,
          category,
          notes
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING
          id,
          merchant,
          amount,
          expense_date,
          category,
          notes,
          created_at
        `,
        [
          String(merchant).trim(),
          numericAmount,
          expenseDate,
          category ?? "Other",
          notes ?? null,
        ],
      );

      const row = result.rows[0];

      res.status(201).json({
        id: Number(row.id),
        merchant: row.merchant,
        amount: Number(row.amount),
        expenseDate: row.expense_date,
        category: row.category,
        notes: row.notes,
        createdAt: row.created_at,
      });
    } catch (error) {
      console.error(
        "Failed to create expense:",
        error,
      );

      res.status(500).json({
        message: "Failed to create expense",
      });
    }
  },
);

app.post(
  "/api/expenses/with-receipt",
  upload.single("receipt"),
  async (req: Request, res: Response) => {
    let uploadedObjectName: string | null = null;

    const client = await pool.connect();

    try {
      const {
        merchant,
        amount,
        expenseDate,
        category,
        notes,
      } = req.body;

      const file = req.file;

      if (
        !merchant ||
        amount === undefined ||
        !expenseDate
      ) {
        return res.status(400).json({
          message:
            "merchant, amount and expenseDate are required",
        });
      }

      if (!file) {
        return res.status(400).json({
          message: "Receipt file is required",
        });
      }

      const numericAmount = Number(amount);

      if (
        !Number.isFinite(numericAmount) ||
        numericAmount < 0
      ) {
        return res.status(400).json({
          message:
            "amount must be a valid number greater than or equal to 0",
        });
      }

      const extension =
        path.extname(file.originalname)
          .toLowerCase() || ".bin";

      const uniqueId = crypto.randomUUID();

      const objectName =
        `receipts/${uniqueId}${extension}`;

      /*
       * 1. Upload file to Cloud Storage
       */
      const storageResult =
        await uploadReceipt(
          file.buffer,
          objectName,
          file.mimetype,
        );

      uploadedObjectName =
        storageResult.objectName;

      /*
       * 2. Begin PostgreSQL transaction
       */
      await client.query("BEGIN");

      /*
       * 3. Create expense
       */
      const expenseResult =
        await client.query(
          `
          INSERT INTO expenses (
            merchant,
            amount,
            expense_date,
            category,
            notes
          )
          VALUES ($1, $2, $3, $4, $5)
          RETURNING
            id,
            merchant,
            amount,
            expense_date,
            category,
            notes,
            created_at
          `,
          [
            String(merchant).trim(),
            numericAmount,
            expenseDate,
            category ?? "Other",
            notes || null,
          ],
        );

      const expense =
        expenseResult.rows[0];

      /*
       * 4. Store Cloud Storage metadata
       */
      const receiptResult =
        await client.query(
          `
          INSERT INTO receipts (
            expense_id,
            bucket_name,
            object_name,
            original_file_name,
            content_type,
            file_size
          )
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING
            id,
            expense_id,
            bucket_name,
            object_name,
            original_file_name,
            content_type,
            file_size,
            created_at
          `,
          [
            expense.id,
            storageResult.bucketName,
            storageResult.objectName,
            file.originalname,
            file.mimetype,
            file.size,
          ],
        );

      const receipt =
        receiptResult.rows[0];

      /*
       * 5. Commit
       */
      await client.query("COMMIT");

      res.status(201).json({
        expense: {
          id: Number(expense.id),
          merchant: expense.merchant,
          amount: Number(expense.amount),
          expenseDate: expense.expense_date,
          category: expense.category,
          notes: expense.notes,
          createdAt: expense.created_at,
        },

        receipt: {
          id: Number(receipt.id),
          fileName:
            receipt.original_file_name,
          contentType:
            receipt.content_type,
          fileSize:
            Number(receipt.file_size),
          createdAt:
            receipt.created_at,
        },
      });
    } catch (error) {
      /*
       * Roll back the database transaction.
       */
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error(
          "Rollback failed:",
          rollbackError,
        );
      }

      /*
       * If storage upload succeeded but the DB
       * failed, clean up the orphaned object.
       */
      if (uploadedObjectName) {
        try {
          await deleteReceipt(
            uploadedObjectName,
          );
        } catch (deleteError) {
          console.error(
            "Failed to clean up orphaned receipt:",
            deleteError,
          );
        }
      }

      console.error(
        "Failed to create expense with receipt:",
        error,
      );

      res.status(500).json({
        message:
          "Failed to create expense with receipt",
      });
    } finally {
      client.release();
    }
  },
);

app.get(
  "/api/receipts/:receiptId",
  async (
    req: Request,
    res: Response,
  ) => {
    try {
      const receiptId =
        Number(req.params.receiptId);

      if (!Number.isInteger(receiptId)) {
        return res.status(400).json({
          message: "Invalid receipt ID",
        });
      }

      const result = await pool.query(
        `
        SELECT
          r.id,
          r.expense_id,
          r.bucket_name,
          r.object_name,
          r.original_file_name,
          r.content_type,
          r.file_size,
          r.created_at
        FROM receipts r
        WHERE r.id = $1
        `,
        [receiptId],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: "Receipt not found",
        });
      }

      const receipt = result.rows[0];

      res.status(200).json({
        id: Number(receipt.id),
        expenseId: Number(
          receipt.expense_id,
        ),
        fileName:
          receipt.original_file_name,
        contentType:
          receipt.content_type,
        fileSize:
          Number(receipt.file_size),
        createdAt:
          receipt.created_at,
      });
    } catch (error) {
      console.error(
        "Failed to fetch receipt:",
        error,
      );

      res.status(500).json({
        message:
          "Failed to fetch receipt",
      });
    }
  },
);

/*
 * Summary
 */
app.get(
  "/api/summary",
  async (_req: Request, res: Response) => {
    try {
      const result = await pool.query(`
        SELECT
          COUNT(*) AS expense_count,
          COALESCE(SUM(amount), 0) AS total_amount,
          COALESCE(AVG(amount), 0) AS average_amount
        FROM expenses
      `);

      const row = result.rows[0];

      res.status(200).json({
        expenseCount: Number(row.expense_count),
        totalAmount: Number(row.total_amount),
        averageAmount: Number(row.average_amount),
      });
    } catch (error) {
      console.error(
        "Failed to fetch summary:",
        error,
      );

      res.status(500).json({
        message: "Failed to fetch summary",
      });
    }
  },
);

/*
 * 404
 */
app.use(
  (_req: Request, res: Response) => {
    res.status(404).json({
      message: "Route not found",
    });
  },
);

app.use(
  (
    error: any,
    _req: Request,
    res: Response,
    _next: NextFunction,
  ) => {
    if (
      error instanceof multer.MulterError
    ) {
      if (
        error.code ===
        "LIMIT_FILE_SIZE"
      ) {
        return res.status(400).json({
          message:
            "Receipt file must be 10 MB or smaller",
        });
      }

      return res.status(400).json({
        message: error.message,
      });
    }

    if (error instanceof Error) {
      return res.status(400).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: "Internal server error",
    });
  },
);

/*
 * Error handler
 */
app.use(
  (
    error: Error,
    _req: Request,
    res: Response,
    _next: NextFunction,
  ) => {
    console.error(error);

    res.status(500).json({
      message: "Internal server error",
    });
  },
);

/*
 * Start application
 */
async function startServer() {
  try {
    const databaseResult =
      await testDatabaseConnection();

    console.log(
      "Database connected:",
      databaseResult.current_time,
    );

    app.listen(
      PORT,
      "0.0.0.0",
      () => {
        console.log(
          `Expense API listening on port ${PORT}`,
        );
      },
    );
  } catch (error) {
    console.error(
      "Database connection failed:",
      error,
    );

    process.exit(1);
  }
}

startServer();
