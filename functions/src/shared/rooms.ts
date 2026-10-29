import * as logger from 'firebase-functions/logger';
import { db } from './firebase';

/**
 * Reads only `rooms/{roomId}/users` (never the whole room, which holds the
 * full chat history) and resolves the acting user and their partner.
 * Logs and returns null when a notification should be skipped.
 */
export const getRoomPair = async (roomId: string, ownUserId: string | undefined) => {
  const usersSnapshot = await db.ref(`rooms/${roomId}/users`).once('value');
  const users = usersSnapshot.val();

  if (!users || typeof users !== 'object') {
    logger.warn(`Room ${roomId} has no users, skipping notification`);
    return null;
  }

  const otherUserId = Object.keys(users).find((id) => id !== ownUserId);
  if (!otherUserId) {
    logger.debug(`No other user found in room ${roomId}, skipping notification`);
    return null;
  }

  const otherUser = users[otherUserId];
  const ownUser = users[ownUserId as string];

  if (!otherUser || !ownUser) {
    logger.warn(`User data missing in room ${roomId}, skipping notification`);
    return null;
  }

  if (!ownUser.name || !otherUser.name) {
    logger.warn('User names missing, skipping notification');
    return null;
  }

  return { ownUser, otherUser, otherUserId };
};

/**
 * Reads `users/{userId}` and returns its FCM tokens, or null (with the usual
 * log) when the user or their tokens are missing.
 */
export const getUserTokens = async (userId: string) => {
  const userSnapshot = await db.ref(`users/${userId}`).once('value');
  const user = userSnapshot.val();

  if (!user) {
    logger.warn(`User ${userId} not found, skipping notification`);
    return null;
  }

  const tokens = user.fcmtokens;

  if (!tokens) {
    logger.debug('No tokens found, skipping notification');
    return null;
  }

  return tokens;
};
