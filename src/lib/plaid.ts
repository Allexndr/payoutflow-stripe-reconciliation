import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
} from "plaid";

export function getPlaidClient(): PlaidApi | null {
  const id = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  const env = process.env.PLAID_ENV ?? "sandbox";
  if (!id || !secret) return null;

  const basePath =
    env === "production"
      ? PlaidEnvironments.production
      : env === "development"
        ? PlaidEnvironments.development
        : PlaidEnvironments.sandbox;

  const config = new Configuration({
    basePath,
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": id,
        "PLAID-SECRET": secret,
      },
    },
  });
  return new PlaidApi(config);
}
