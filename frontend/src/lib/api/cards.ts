import { createClient } from "../supabase/server";
import { nanoid } from "nanoid";

export interface CardData {
  id?: string;
  owner_id: string;
  character?: string;
  recipient: string;
  sender?: string;
  tagline?: string;
  message?: string;
  tone?: string;
  forgive_text?: string;
  treats?: string[];
  floaties?: string[];
  confetti?: string[];
  quotes?: string[];
  closing?: string;
  smile_button_text?: string;
  after_smile_text?: string;
  theme_bg?: string;
  theme_accent?: string;
  theme_accent2?: string;
  theme_text?: string;
  font?: string;
  opt_runaway?: boolean;
  opt_treats?: boolean;
  opt_mood?: boolean;
  opt_stripe?: boolean;
  opt_floaties?: boolean;
  opt_stars?: boolean;
  opt_trail?: boolean;
  char_size?: number;
}

// Generate Nano ID for cards (11 characters)
export const generateCardId = () => {
  return nanoid(11);
};

export async function createCard(data: CardData) {
  const supabase = createClient();

  // Validate required fields
  if (!data.recipient) {
    return { error: "Recipient is required" };
  }

  // Generate Nano ID if not provided
  const cardId = data.id || generateCardId();

  // Prepare card data
  const cardData = {
    id: cardId,
    owner_id: data.owner_id,
    character: data.character || "cat",
    recipient: data.recipient,
    sender: data.sender || "",
    tagline: data.tagline || "",
    message: data.message || "",
    tone: data.tone || "sorry",
    forgive_text: data.forgive_text || "",
    treats: data.treats || ["🍫"],
    floaties: data.floaties || ["🌸", "✨", "🐾", "⭐", "🌟"],
    confetti: data.confetti || ["🎉", "🎊", "✨", "🌟"],
    quotes: data.quotes || [],
    closing: data.closing || "",
    smile_button_text: data.smile_button_text || "",
    after_smile_text: data.after_smile_text || "",
    theme_bg: data.theme_bg || "#fdf3e7",
    theme_accent: data.theme_accent || "#3d1a00",
    theme_accent2: data.theme_accent2 || "#c4822a",
    theme_text: data.theme_text || "#6b3a1f",
    font: data.font || "Nunito",
    opt_runaway: data.opt_runaway !== undefined ? data.opt_runaway : true,
    opt_treats: data.opt_treats !== undefined ? data.opt_treats : true,
    opt_mood: data.opt_mood !== undefined ? data.opt_mood : true,
    opt_stripe: data.opt_stripe !== undefined ? data.opt_stripe : true,
    opt_floaties: data.opt_floaties !== undefined ? data.opt_floaties : true,
    opt_stars: data.opt_stars !== undefined ? data.opt_stars : true,
    opt_trail: data.opt_trail !== undefined ? data.opt_trail : true,
    char_size: data.char_size || 170,
  };

  const { data: card, error } = await supabase
    .from("cards")
    .insert(cardData)
    .select()
    .single();

  if (error) {
    return { error: "Failed to create card" };
  }

  return { success: true, card };
}

export async function getCard(cardId: string) {
  const supabase = createClient();

  const { data: card, error } = await supabase
    .from("cards")
    .select(
      `
      *,
      users!cards_owner_id_fkey (
        id,
        name,
        email,
        avatar
      )
    `
    )
    .eq("id", cardId)
    .single();

  if (error || !card) {
    return { error: "Card not found" };
  }

  return { success: true, card };
}

export async function getPublicCard(cardId: string) {
  const supabase = createClient();

  const { data: card, error } = await supabase
    .from("cards")
    .select("*")
    .eq("id", cardId)
    .single();

  if (error || !card) {
    return { error: "Card not found" };
  }

  return { success: true, card };
}

export async function getUserCards(userId: string) {
  const supabase = createClient();

  const { data: cards, error } = await supabase
    .from("cards")
    .select("*")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return { error: "Failed to fetch cards" };
  }

  return { success: true, cards: cards || [] };
}

export async function updateCard(cardId: string, userId: string, data: Partial<CardData>) {
  const supabase = createClient();

  // Verify ownership
  const { data: existingCard } = await supabase
    .from("cards")
    .select("owner_id")
    .eq("id", cardId)
    .single();

  if (!existingCard || existingCard.owner_id !== userId) {
    return { error: "Unauthorized" };
  }

  // Update card
  const { data: card, error } = await supabase
    .from("cards")
    .update(data)
    .eq("id", cardId)
    .select()
    .single();

  if (error) {
    return { error: "Failed to update card" };
  }

  return { success: true, card };
}

export async function deleteCard(cardId: string, userId: string) {
  const supabase = createClient();

  // Verify ownership
  const { data: existingCard } = await supabase
    .from("cards")
    .select("owner_id")
    .eq("id", cardId)
    .single();

  if (!existingCard || existingCard.owner_id !== userId) {
    return { error: "Unauthorized" };
  }

  // Delete card (cascade will delete related chats)
  const { error } = await supabase
    .from("cards")
    .delete()
    .eq("id", cardId);

  if (error) {
    return { error: "Failed to delete card" };
  }

  return { success: true };
}

export async function incrementCardSent(userId: string) {
  const supabase = createClient();

  // Fetch current stats
  const { data: currentStats } = await supabase
    .from("user_stats")
    .select("cards_sent")
    .eq("user_id", userId)
    .single();

  if (currentStats) {
    const { error } = await supabase
      .from("user_stats")
      .update({
        cards_sent: (currentStats.cards_sent || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (error) {
      console.error("Failed to increment card sent count:", error);
    }
  }

  return { success: true };
}
