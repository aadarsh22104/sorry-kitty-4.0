import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Sorry Kitty 🐾 — Send adorable apology cards" },
      { name: "description", content: "Create and send adorable animated apology greeting cards. Melt any heart with Sorry Kitty." },
      { property: "og:title", content: "Sorry Kitty 🐾" },
      { property: "og:description", content: "Send adorable animated apology cards. Then chat directly with whoever you sent it to." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div style={{ position: "fixed", inset: 0, width: "100vw", height: "100dvh", margin: 0, padding: 0, overflow: "hidden" }}>
      <iframe
        src="/sorry-kitty.html"
        title="Sorry Kitty"
        style={{ width: "100%", height: "100%", border: 0, display: "block" }}
        allow="clipboard-write; clipboard-read"
      />
    </div>
  );
}
