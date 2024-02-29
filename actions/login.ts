"use server";

import * as z from "zod";

import { LoginSchema } from "@/schemas";

export const login = async (values: z.infer<typeof LoginSchema>) => {
  const validetedFields = LoginSchema.safeParse(values);

  if (!validetedFields) {
    return { error: "Invalid fields!" };
  }

  return { success: "Email sent!" };
};
