import { createFileRoute } from "@tanstack/react-router";
import { signup } from "../lib/api/auth";

export const Route = createFileRoute("/api/auth/signup")({
  method: "POST",
  handler: async ({ request }) => {
    const body = await request.json();
    return Response.json(await signup(body));
  },
});
