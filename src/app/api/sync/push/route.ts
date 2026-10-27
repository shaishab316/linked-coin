import { NextResponse } from "next/server";
import { getSessionUser } from "../../../../features/auth/session";
import { createTransaction, reverseTransaction } from "../../../../features/ledger/service";
import { createAccount, updateAccount } from "../../../../features/accounts/service";
import { createPerson } from "../../../../features/people/service";
import { createTag } from "../../../../features/tags/service";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const operations = body.operations || [];
    const results: Array<{ operationId: string; success: boolean; error?: string }> = [];

    for (const op of operations) {
      try {
        switch (op.operationType) {
          case "CREATE_TRANSACTION":
            await createTransaction(user.id, {
              ...op.payload,
              idempotencyKey: op.idempotencyKey,
            });
            break;

          case "REVERSE_TRANSACTION":
            await reverseTransaction(user.id, op.payload.transactionId, {
              reason: op.payload.reason,
              idempotencyKey: op.idempotencyKey,
            });
            break;

          case "CREATE_ACCOUNT":
            await createAccount(user.id, op.payload);
            break;

          case "UPDATE_ACCOUNT":
            await updateAccount(user.id, op.payload.accountId, op.payload);
            break;

          case "CREATE_PERSON":
            await createPerson(user.id, op.payload);
            break;

          case "CREATE_TAG":
            await createTag(user.id, op.payload);
            break;

          default:
            throw new Error(`Unsupported operation: ${op.operationType}`);
        }

        results.push({ operationId: op.id, success: true });
      } catch (err: any) {
        results.push({
          operationId: op.id,
          success: false,
          error: err?.message || "Operation failed",
        });
      }
    }

    return NextResponse.json({ results });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to process push sync" }, { status: 500 });
  }
}
