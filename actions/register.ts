"use server";

import * as z from "zod";
import bcrypt from "bcrypt";

import { db } from "@/lib/db";
import { RegisterSchema } from "@/schemas";
import { getUserByEmail } from "@/data/user";

export const register = async (values: z.infer<typeof RegisterSchema>) => {
  const validetedFields = RegisterSchema.safeParse(values);

  if (!validetedFields.success) {
    return { error: "Invalid fields!" };
  }

  const { email, password, name } = validetedFields.data;
  const hashedPassword = await bcrypt.hash(password, 10);

  const existingUser = await getUserByEmail(email);

  if (existingUser) {
    return { error: "Email already in use!" };
  }

  await db.user.create({
    data: {
      email,
      name,
      password: hashedPassword,
    },
  });

  //ToDO  send verf token email

  return { success: "User created!" };
};
