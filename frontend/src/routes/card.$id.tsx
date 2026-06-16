import { createFileRoute, useLoaderData } from "@tanstack/react-router";
import { getPublicCard } from "../lib/api/cards";

export const Route = createFileRoute("/card/$id")({
  loader: async ({ params }: { params: { id: string } }) => {
    const result = await getPublicCard(params.id);
    if (!result.success) {
      throw new Error("Card not found");
    }
    return result.card;
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Sorry Kitty Card" },
      { name: "description", content: "View a Sorry Kitty greeting card" },
    ],
  }),
  component: CardViewer,
});

function CardViewer() {
  const card = Route.useLoaderData();

  const charEmojis: Record<string, string> = {
    cat: "🐱",
    panda: "🐼",
    bear: "🐻",
    penguin: "🐧",
    fox: "🦊",
    bunny: "🐰",
    dog: "🐶",
    frog: "🐸",
    lion: "🦁",
    koala: "🐨",
  };

  const emoji = charEmojis[card.character || "cat"] || "🐱";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: `linear-gradient(160deg, ${card.theme_bg} 0%, ${card.theme_bg}dd 50%, #fdf0e8 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        fontFamily: card.font || "Nunito, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "600px",
          width: "100%",
          background: "white",
          borderRadius: "24px",
          padding: "40px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.1)",
          textAlign: "center",
        }}
      >
        {/* Character */}
        <div
          style={{
            fontSize: `${card.char_size || 170}px`,
            marginBottom: "20px",
            animation: "float 3s ease-in-out infinite",
          }}
        >
          {emoji}
        </div>

        {/* Recipient */}
        <h2
          style={{
            fontSize: "28px",
            fontWeight: "800",
            color: card.theme_accent,
            marginBottom: "8px",
          }}
        >
          To: {card.recipient}
        </h2>

        {/* Sender */}
        {card.sender && (
          <p
            style={{
              fontSize: "16px",
              color: card.theme_text,
              marginBottom: "16px",
              fontWeight: "600",
            }}
          >
            From: {card.sender}
          </p>
        )}

        {/* Tagline */}
        {card.tagline && (
          <p
            style={{
              fontSize: "18px",
              color: card.theme_accent2,
              marginBottom: "24px",
              fontStyle: "italic",
            }}
          >
            {card.tagline}
          </p>
        )}

        {/* Message */}
        {card.message && (
          <p
            style={{
              fontSize: "20px",
              lineHeight: "1.6",
              color: card.theme_text,
              marginBottom: "24px",
              whiteSpace: "pre-wrap",
            }}
          >
            {card.message}
          </p>
        )}

        {/* Forgive Text */}
        {card.forgive_text && (
          <p
            style={{
              fontSize: "16px",
              color: card.theme_accent2,
              marginBottom: "24px",
              fontWeight: "600",
            }}
          >
            {card.forgive_text}
          </p>
        )}

        {/* Treats */}
        {card.treats && card.treats.length > 0 && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "12px",
              marginBottom: "24px",
              flexWrap: "wrap",
            }}
          >
            {card.treats.map((treat: string, index: number) => (
              <span
                key={`${treat}-${index}`}
                style={{
                  fontSize: "32px",
                  animation: `bounce ${0.5 + index * 0.1}s ease-in-out infinite`,
                }}
              >
                {treat}
              </span>
            ))}
          </div>
        )}

        {/* Closing */}
        {card.closing && (
          <p
            style={{
              fontSize: "18px",
              color: card.theme_text,
              marginBottom: "24px",
              fontWeight: "600",
            }}
          >
            {card.closing}
          </p>
        )}

        {/* Smile Button */}
        {card.smile_button_text && (
          <button
            style={{
              background: card.theme_accent,
              color: "white",
              border: "none",
              borderRadius: "12px",
              padding: "16px 32px",
              fontSize: "18px",
              fontWeight: "700",
              cursor: "pointer",
              fontFamily: card.font || "Nunito, sans-serif",
              transition: "transform 0.2s",
            }}
            onClick={() => {
              alert(card.after_smile_text || "Thank you for smiling! 😊");
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            {card.smile_button_text}
          </button>
        )}

        {/* Footer */}
        <p
          style={{
            marginTop: "32px",
            fontSize: "14px",
            color: "#999",
          }}
        >
          Made with ❤️ using Sorry Kitty
        </p>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
}
