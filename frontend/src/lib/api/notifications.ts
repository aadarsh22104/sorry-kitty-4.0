import { createClient } from "../supabase/server";

export interface NotificationData {
  user_id: string;
  type: string;
  title: string;
  message?: string;
  icon?: string;
}

export async function createNotification(data: NotificationData) {
  const supabase = createClient();

  // Validate input
  if (!data.user_id || !data.type || !data.title) {
    return { error: "User ID, type, and title are required" };
  }

  // Create notification
  const { data: notification, error } = await supabase
    .from("notifications")
    .insert({
      user_id: data.user_id,
      type: data.type,
      title: data.title,
      message: data.message || "",
      icon: data.icon || "🔔",
      read: false,
    })
    .select()
    .single();

  if (error) {
    return { error: "Failed to create notification" };
  }

  return { success: true, notification };
}

export async function getUserNotifications(userId: string, unreadOnly = false) {
  const supabase = createClient();

  let query = supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId);

  if (unreadOnly) {
    query = query.eq("read", false);
  }

  const { data: notifications, error } = await query.order("created_at", { ascending: false });

  if (error) {
    return { error: "Failed to fetch notifications" };
  }

  return { success: true, notifications: notifications || [] };
}

export async function markNotificationAsRead(notificationId: string, userId: string) {
  const supabase = createClient();

  // Verify ownership
  const { data: notification } = await supabase
    .from("notifications")
    .select("user_id")
    .eq("id", notificationId)
    .single();

  if (!notification || notification.user_id !== userId) {
    return { error: "Unauthorized" };
  }

  // Mark as read
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId);

  if (error) {
    return { error: "Failed to mark notification as read" };
  }

  return { success: true };
}

export async function markAllNotificationsAsRead(userId: string) {
  const supabase = createClient();

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false);

  if (error) {
    return { error: "Failed to mark all notifications as read" };
  }

  return { success: true };
}

export async function deleteNotification(notificationId: string, userId: string) {
  const supabase = createClient();

  // Verify ownership
  const { data: notification } = await supabase
    .from("notifications")
    .select("user_id")
    .eq("id", notificationId)
    .single();

  if (!notification || notification.user_id !== userId) {
    return { error: "Unauthorized" };
  }

  // Delete notification
  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", notificationId);

  if (error) {
    return { error: "Failed to delete notification" };
  }

  return { success: true };
}

export async function getUnreadCount(userId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact" })
    .eq("user_id", userId)
    .eq("read", false);

  if (error) {
    return { error: "Failed to get unread count" };
  }

  return { success: true, count: data?.length || 0 };
}

// Helper function to create common notification types
export async function notifyCardSaved(userId: string, recipient: string, character: string) {
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

  return createNotification({
    user_id: userId,
    type: "card_saved",
    title: "Card saved! 🎉",
    message: `Your sorry card for ${recipient} is ready to share.`,
    icon: charEmojis[character] || "🐱",
  });
}

export async function notifyCardShared(userId: string, recipient: string) {
  return createNotification({
    user_id: userId,
    type: "card_shared",
    title: "Card shared! 📤",
    message: `You shared a card with ${recipient}.`,
    icon: "📤",
  });
}

export async function notifyNewChatMessage(userId: string, cardId: string, senderName: string) {
  return createNotification({
    user_id: userId,
    type: "new_chat_message",
    title: "New message 💬",
    message: `${senderName} sent you a message on your card.`,
    icon: "💬",
  });
}
