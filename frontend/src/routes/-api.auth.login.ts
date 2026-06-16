import { createServerFn } from "@tanstack/react-start";
import { loginAction } from "../lib/api/server-actions";

export const loginAPI = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    return await loginAction(data);
  });
