import { createServerFn } from "@tanstack/react-start";
import { signup, login, logout, getSession, verifySession } from "./auth";
import {
  createCard,
  getCard,
  getPublicCard,
  getUserCards,
  updateCard,
  deleteCard,
  incrementCardSent,
} from "./cards";
import {
  sendChatMessage,
  getChatMessages,
  deleteChatMessage,
  getCardChatsSummary,
} from "./chat";
import {
  createNotification,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getUnreadCount,
  notifyCardSaved,
  notifyCardShared,
  notifyNewChatMessage,
} from "./notifications";

// ══════════════════════════════════════════════════════
// AUTHENTICATION SERVER ACTIONS
// ══════════════════════════════════════════════════════

export const signupAction = createServerFn({ method: "POST" })
  .validator((data: { name: string; email: string; password: string; avatar?: string }) => data)
  .handler(async ({ data }) => {
    return await signup(data);
  });

export const loginAction = createServerFn({ method: "POST" })
  .validator((data: { email: string; password: string }) => data)
  .handler(async ({ data }) => {
    return await login(data);
  });

export const logoutAction = createServerFn({ method: "POST" })
  .validator((data: { sessionToken: string }) => data)
  .handler(async ({ data }) => {
    return await logout(data.sessionToken);
  });

export const getSessionAction = createServerFn({ method: "GET" })
  .validator((data: { sessionToken: string }) => data)
  .handler(async ({ data }) => {
    return await getSession(data.sessionToken);
  });

export const verifySessionAction = createServerFn({ method: "POST" })
  .validator((data: { sessionToken: string }) => data)
  .handler(async ({ data }) => {
    const isValid = await verifySession(data.sessionToken);
    return { valid: isValid };
  });

// ══════════════════════════════════════════════════════
// CARDS SERVER ACTIONS
// ══════════════════════════════════════════════════════

export const createCardAction = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    return await createCard(data);
  });

export const getCardAction = createServerFn({ method: "GET" })
  .validator((data: { cardId: string }) => data)
  .handler(async ({ data }) => {
    return await getCard(data.cardId);
  });

export const getPublicCardAction = createServerFn({ method: "GET" })
  .validator((data: { cardId: string }) => data)
  .handler(async ({ data }) => {
    return await getPublicCard(data.cardId);
  });

export const getUserCardsAction = createServerFn({ method: "GET" })
  .validator((data: { userId: string }) => data)
  .handler(async ({ data }) => {
    return await getUserCards(data.userId);
  });

export const updateCardAction = createServerFn({ method: "POST" })
  .validator((data: { cardId: string; userId: string; cardData: any }) => data)
  .handler(async ({ data }) => {
    return await updateCard(data.cardId, data.userId, data.cardData);
  });

export const deleteCardAction = createServerFn({ method: "POST" })
  .validator((data: { cardId: string; userId: string }) => data)
  .handler(async ({ data }) => {
    return await deleteCard(data.cardId, data.userId);
  });

export const incrementCardSentAction = createServerFn({ method: "POST" })
  .validator((data: { userId: string }) => data)
  .handler(async ({ data }) => {
    return await incrementCardSent(data.userId);
  });

// ══════════════════════════════════════════════════════
// CHAT SERVER ACTIONS
// ══════════════════════════════════════════════════════

export const sendChatMessageAction = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    return await sendChatMessage(data);
  });

export const getChatMessagesAction = createServerFn({ method: "GET" })
  .validator((data: { cardId: string; userId?: string }) => data)
  .handler(async ({ data }) => {
    return await getChatMessages(data.cardId, data.userId);
  });

export const deleteChatMessageAction = createServerFn({ method: "POST" })
  .validator((data: { messageId: string; userId: string }) => data)
  .handler(async ({ data }) => {
    return await deleteChatMessage(data.messageId, data.userId);
  });

export const getCardChatsSummaryAction = createServerFn({ method: "GET" })
  .validator((data: { userId: string }) => data)
  .handler(async ({ data }) => {
    return await getCardChatsSummary(data.userId);
  });

// ══════════════════════════════════════════════════════
// NOTIFICATIONS SERVER ACTIONS
// ══════════════════════════════════════════════════════

export const createNotificationAction = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    return await createNotification(data);
  });

export const getUserNotificationsAction = createServerFn({ method: "GET" })
  .validator((data: { userId: string; unreadOnly?: boolean }) => data)
  .handler(async ({ data }) => {
    return await getUserNotifications(data.userId, data.unreadOnly);
  });

export const markNotificationAsReadAction = createServerFn({ method: "POST" })
  .validator((data: { notificationId: string; userId: string }) => data)
  .handler(async ({ data }) => {
    return await markNotificationAsRead(data.notificationId, data.userId);
  });

export const markAllNotificationsAsReadAction = createServerFn({ method: "POST" })
  .validator((data: { userId: string }) => data)
  .handler(async ({ data }) => {
    return await markAllNotificationsAsRead(data.userId);
  });

export const deleteNotificationAction = createServerFn({ method: "POST" })
  .validator((data: { notificationId: string; userId: string }) => data)
  .handler(async ({ data }) => {
    return await deleteNotification(data.notificationId, data.userId);
  });

export const getUnreadCountAction = createServerFn({ method: "GET" })
  .validator((data: { userId: string }) => data)
  .handler(async ({ data }) => {
    return await getUnreadCount(data.userId);
  });

// Helper notification actions
export const notifyCardSavedAction = createServerFn({ method: "POST" })
  .validator((data: { userId: string; recipient: string; character: string }) => data)
  .handler(async ({ data }) => {
    return await notifyCardSaved(data.userId, data.recipient, data.character);
  });

export const notifyCardSharedAction = createServerFn({ method: "POST" })
  .validator((data: { userId: string; recipient: string }) => data)
  .handler(async ({ data }) => {
    return await notifyCardShared(data.userId, data.recipient);
  });

export const notifyNewChatMessageAction = createServerFn({ method: "POST" })
  .validator((data: { userId: string; cardId: string; senderName: string }) => data)
  .handler(async ({ data }) => {
    return await notifyNewChatMessage(data.userId, data.cardId, data.senderName);
  });
