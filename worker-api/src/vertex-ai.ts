import {
  GoogleGenAI,
  Type,
} from "@google/genai";

const projectId =
  process.env.GOOGLE_CLOUD_PROJECT;

const location =
  process.env.GOOGLE_CLOUD_LOCATION ??
  "global";

const model =
  process.env.GEMINI_MODEL ??
  "gemini-3-flash-preview";

if (!projectId) {
  throw new Error(
    "Missing GOOGLE_CLOUD_PROJECT environment variable",
  );
}

/*
 * Vertex AI client.
 *
 * Authentication is automatically handled through
 * Application Default Credentials.
 *
 * In Cloud Run this is the worker's service account.
 */
const client = new GoogleGenAI({
  vertexai: true,
  project: projectId,
  location,
});

/*
 * Structured output schema.
 *
 * Gemini must return JSON matching this schema.
 */
const receiptSchema = {
  type: Type.OBJECT,

  properties: {
    merchant: {
      type: Type.STRING,
      description:
        "Merchant or store name exactly as visible on the receipt.",
    },

    transactionDate: {
      type: Type.STRING,
      description:
        "Transaction date in YYYY-MM-DD format. Use an empty string if it cannot be determined without guessing.",
    },

    totalAmount: {
      type: Type.NUMBER,
      description:
        "Final total amount paid. Use 0 only when the total cannot be determined.",
    },

    currency: {
      type: Type.STRING,
      description:
        "Currency code such as INR, USD, EUR. Use an empty string if unavailable.",
    },

    category: {
      type: Type.STRING,
      enum: [
        "Food",
        "Shopping",
        "Travel",
        "Entertainment",
        "Health",
        "Utilities",
        "Other",
      ],
      description:
        "Best matching expense category.",
    },

    items: {
      type: Type.ARRAY,

      items: {
        type: Type.OBJECT,

        properties: {
          name: {
            type: Type.STRING,
            description:
              "Name of the purchased item.",
          },

          quantity: {
            type: Type.NUMBER,
            description:
              "Quantity purchased.",
          },

          amount: {
            type: Type.NUMBER,
            description:
              "Amount associated with the item.",
          },
        },

        required: [
          "name",
          "quantity",
          "amount",
        ],

        propertyOrdering: [
          "name",
          "quantity",
          "amount",
        ],
      },

      description:
        "List of purchased items visible on the receipt.",
    },

    needsReview: {
      type: Type.BOOLEAN,
      description:
        "True when important receipt information is unclear or cannot be confidently determined.",
    },

    reviewReason: {
      type: Type.STRING,
      description:
        "Reason for manual review. Empty when needsReview is false.",
    },
  },

  required: [
    "merchant",
    "transactionDate",
    "totalAmount",
    "currency",
    "category",
    "items",
    "needsReview",
    "reviewReason",
  ],

  propertyOrdering: [
    "merchant",
    "transactionDate",
    "totalAmount",
    "currency",
    "category",
    "items",
    "needsReview",
    "reviewReason",
  ],
};

/*
 * Type returned to our application.
 */
export interface ReceiptAnalysis {
  merchant: string;
  transactionDate: string;
  totalAmount: number;
  currency: string;
  category:
    | "Food"
    | "Shopping"
    | "Travel"
    | "Entertainment"
    | "Health"
    | "Utilities"
    | "Other";

  items: Array<{
    name: string;
    quantity: number;
    amount: number;
  }>;

  needsReview: boolean;
  reviewReason: string;
}

/*
 * Analyze a receipt stored in Cloud Storage.
 */
export async function analyzeReceipt(
  bucketName: string,
  objectName: string,
  mimeType: string,
): Promise<ReceiptAnalysis> {
  const fileUri =
    `gs://${bucketName}/${objectName}`;

  const prompt = `
You are an expert receipt analysis system.

Analyze the provided receipt carefully.

Extract only information that is visible or strongly supported by the receipt.

Do not invent or guess missing values.

Rules:
1. Merchant should be the actual merchant/store name.
2. transactionDate must use YYYY-MM-DD.
3. totalAmount must be the final amount paid.
4. currency should use a standard currency code when visible.
5. Choose exactly one category from the provided categories.
6. Extract visible line items.
7. If important information is unclear, set needsReview=true.
8. Explain the reason in reviewReason.
9. If the receipt is clear, needsReview=false and reviewReason="".
`;

  const response =
    await client.models.generateContent({
      model,

      contents: [
        {
          fileData: {
            fileUri,
            mimeType,
          },
        },
        {
          text: prompt,
        },
      ],

      config: {
        responseMimeType:
          "application/json",

        responseJsonSchema:
          receiptSchema,

        temperature: 0.1,
      },
    });

  const responseText =
    response.text;

  if (!responseText) {
    throw new Error(
      "Vertex AI returned an empty response",
    );
  }

  let result: unknown;

  try {
    result = JSON.parse(responseText);
  } catch (error) {
    console.error(
      "Vertex AI returned invalid JSON:",
      responseText,
    );

    throw new Error(
      "Failed to parse Vertex AI response as JSON",
    );
  }

  return validateReceiptAnalysis(
    result,
  );
}

/*
 * Runtime validation.
 *
 * The schema protects us at the model API level,
 * but validating at our application boundary is
 * still good engineering practice.
 */
function validateReceiptAnalysis(
  value: unknown,
): ReceiptAnalysis {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    throw new Error(
      "AI response is not an object",
    );
  }

  const data =
    value as Record<string, unknown>;

  const categories = [
    "Food",
    "Shopping",
    "Travel",
    "Entertainment",
    "Health",
    "Utilities",
    "Other",
  ] as const;

  if (
    typeof data.merchant !== "string"
  ) {
    throw new Error(
      "AI response has invalid merchant",
    );
  }

  if (
    typeof data.transactionDate !==
    "string"
  ) {
    throw new Error(
      "AI response has invalid transactionDate",
    );
  }

  if (
    typeof data.totalAmount !==
      "number" ||
    !Number.isFinite(
      data.totalAmount,
    )
  ) {
    throw new Error(
      "AI response has invalid totalAmount",
    );
  }

  if (
    typeof data.currency !== "string"
  ) {
    throw new Error(
      "AI response has invalid currency",
    );
  }

  if (
    typeof data.category !== "string" ||
    !categories.includes(
      data.category as
        (typeof categories)[number],
    )
  ) {
    throw new Error(
      "AI response has invalid category",
    );
  }

  if (!Array.isArray(data.items)) {
    throw new Error(
      "AI response has invalid items",
    );
  }

  const items =
    data.items.map((item) => {
      if (
        typeof item !== "object" ||
        item === null
      ) {
        throw new Error(
          "AI response contains invalid item",
        );
      }

      const itemData =
        item as Record<
          string,
          unknown
        >;

      if (
        typeof itemData.name !==
        "string"
      ) {
        throw new Error(
          "AI item has invalid name",
        );
      }

      if (
        typeof itemData.quantity !==
          "number" ||
        typeof itemData.amount !==
          "number"
      ) {
        throw new Error(
          "AI item contains invalid numeric fields",
        );
      }

      return {
        name: itemData.name,
        quantity:
          itemData.quantity,
        amount:
          itemData.amount,
      };
    });

  if (
    typeof data.needsReview !==
    "boolean"
  ) {
    throw new Error(
      "AI response has invalid needsReview",
    );
  }

  if (
    typeof data.reviewReason !==
    "string"
  ) {
    throw new Error(
      "AI response has invalid reviewReason",
    );
  }

  return {
    merchant:
      data.merchant,
    transactionDate:
      data.transactionDate,
    totalAmount:
      data.totalAmount,
    currency:
      data.currency,
    category:
      data.category as ReceiptAnalysis["category"],
    items,
    needsReview:
      data.needsReview,
    reviewReason:
      data.reviewReason,
  };
}
