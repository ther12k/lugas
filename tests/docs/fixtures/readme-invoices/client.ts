import type { AppContract } from "lugas";
import { createClient } from "lugas/client";
import type app from "./app";

const api = createClient<AppContract<typeof app>>({ baseUrl: "https://api.example.com" });

const result = await api.post("/invoices", {
  body: { amount: 125, currency: "USD" },
});

if (result.ok) {
  console.log(result.status, result.data.id);
} else {
  console.error(result.status, result.error); // Problem Details on 4xx/5xx
}
