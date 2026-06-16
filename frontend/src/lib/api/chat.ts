import { createClient } from "../supabase/server";

export interface ChatMessage {
  id?: string;
  card_id: string;
  participant_id?: string;
  message: string;
  is_from_owner: boolean;
  emoji_reaction?: string;
}

export async function sendChatMessage(data: ChatMessage) {
  const supabase = createClient();

  // Validate input
  if (!data.card_id || !data.message) {
    return { error: "Card ID and message are required" };
  }

  // Verify card exists
  const { data: card, error: cardError } = await supabase
    .from("cards")
    .select("id, owner_id")
    .eq("id", data.card_id)
    .single();

  if (cardError || !card) {
    return { error: "Card not found" };
  }

  // If participant_id is provided, verify it's a valid user
  if (data.participant_id) {
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("id", data.participant_id)
      .single();

    if (!user) {
      return { error: "Invalid participant" };
    }
  }

  // Create chat message
  const { data: message, error } = await supabase
    .from("chats")
    .insert({
      card_id: data.card_id,
      participant_id: data.participant_id || null,
      message: data.message,
      is_from_owner: data.is_from_owner,
      emoji_reaction: data.emoji_reaction || null,
    })
    .select()
    .single();

  if (error) {
    return { error: "Failed to send message" };
  }

  return { success: true, message };
}

export async function getChatMessages(cardId: string, userId?: string) {
  const supabase = createClient();

  // Verify card exists
  const { data: card } = await supabase
    .from("cards")
    .select("id, owner_id")
    .eq("id", cardId)
    .single();

  if (!card) {
    return { error: "Card not found" };
  }

  // Get messages
  const { data: messages, error } = await supabase
    .from("chats")
    .select(
      `
      *,
      users (
        id,
        name,
        avatar
      )
    `
    )
    .eq("card_id", cardId)
    .order("created_at", { ascending: true });

  if (error) {
    return { error: "Failed to fetch messages" };
  }

  return { success: true, messages: messages || [] };
}

export async function deleteChatMessage(messageId: string, userId: string) {
  const supabase = createClient();

  // Verify message ownership (either from owner or participant)
  const { data: message } = await supabase
    .from("chats")
    .select(
      `
      *,
      cards!inner (
        owner_id
      )
    `
    )
    .eq("id", messageId)
    .single();

  if (!message) {
    return { error: "Message not found" };
  }

  // Check if user is authorized (card owner or message participant)
  const isCardOwner = message.cards.owner_id === userId;
  const isParticipant = message.participant_id === userId;
  const isFromOwner = message.is_from_owner && isCardOwner;

  if (!isCardOwner && !isParticipant) {
    return { error: "Unauthorized" };
  }

  // Delete message
  const { error } = await supabase
    .from("chats")
    .delete()
    .eq("id", messageId);

  if (error) {
    return { error: "Failed to delete message" };
  }

  return { success: true };
}

export async function getCardChatsSummary(userId: string) {
  const supabase = createClient();

  // Get all cards owned by user with chat activity
  const { data: cards, error } = await supabase
    .from("cards")
    .select(
      `
      id,
      recipient,
      character,
      tagline,
      created_at,
      chats (
        id,
        message,
        is_from_owner,
        created_at
      )
    `
    )
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return { error: "Failed to fetch card chats" };
  }

  // Transform to summary format
  const summaries = (cards || []).map((card: any) => ({
    id: card.id,
    recipient: card.recipient,
    character: card.character,
    tagline: card.tagline,
    created_at: card.created_at,
    message_count: card.chats?.length || 0,
    last_message: card.chats?.[card.chats.length - 1] || null,
  }));

  return { success: true, summaries };
}

export async function markChatAsRead(cardId: string, userId: string) {
  // This would be used to track which messages have been read
  // For now, this is a placeholder for future implementation
  const supabase = createClient();

  // Verify card ownership
  const { data: card } = await supabase
    .from("cards")
    .select("owner_id")
    .eq("id", cardId)
    .single();

  if (!card || card.owner_id !== userId) {
    return { error: "Unauthorized" };
  }

  return { success: true };
}
