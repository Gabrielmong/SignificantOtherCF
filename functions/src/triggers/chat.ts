import { onValueCreated } from 'firebase-functions/v2/database';
import * as logger from 'firebase-functions/logger';
import { getRoomPair, getUserTokens } from '../shared/rooms';
import { sendMulticast } from '../shared/notify';

const MESSAGE_PREVIEW_LENGTH = 200;

const ATTACHMENT_NOUNS: { [kind: string]: string } = {
  countdown: 'countdown',
  wishlist: 'wish',
  favorite: 'favorite',
  place: 'place',
  milestone: 'milestone',
  journal: 'journal entry',
};

// What the notification says: the text itself, or what was shared when the
// message is just an attachment card.
const getMessagePreview = (message: {
  message?: unknown;
  attachment?: { kind?: string; title?: string };
  image?: unknown;
  audio?: unknown;
}) => {
  const text = typeof message?.message === 'string' ? message.message.trim() : '';
  if (text) {
    return text.length > MESSAGE_PREVIEW_LENGTH ?
      `${text.slice(0, MESSAGE_PREVIEW_LENGTH - 1)}…` :
      text;
  }

  // Media messages have no text (a photo's caption, if any, is the text)
  if (message?.image) return '📷 Photo';
  if (message?.audio) return '🎤 Voice note';

  const attachment = message?.attachment;
  if (attachment) {
    const noun = ATTACHMENT_NOUNS[attachment.kind ?? ''] ?? 'something';
    return attachment.title ? `Shared a ${noun}: ${attachment.title}` : `Shared a ${noun}`;
  }

  return 'Sent a message';
};

export const onNewMessage = onValueCreated(
  {
    ref: 'rooms/{roomId}/messages/{messageId}',
  },
  async (event) => {
    const { roomId, messageId } = event.params;
    const message = event.data.val();
    logger.debug(`New message in room ${roomId}: ${JSON.stringify(message)}`);

    const pair = await getRoomPair(roomId, message?.uid);
    if (!pair) return;
    const { ownUser, otherUser, otherUserId } = pair;

    logger.debug(`User ${ownUser.name} sent message ${message}`);
    logger.debug(`User: ${ownUser.name}`);
    logger.debug(`Sending notification to ${otherUser.name}`);

    const tokens = await getUserTokens(otherUserId);
    if (!tokens) return;

    logger.debug(`Sending notification to tokens: ${tokens}`);

    const body = getMessagePreview(message);

    await sendMulticast({
      tokens,
      // No top-level `notification`: Android would show that itself, and a
      // system-drawn notification can't have the inline Reply action. The
      // app draws it from this data instead (all values must be strings).
      data: {
        type: 'chat-message',
        roomId,
        messageId,
        senderName: ownUser.name,
        body,
      },
      // High priority so the data message wakes the app (and survives Doze)
      android: {
        priority: 'high',
      },
      // iOS has no app-drawn path here, so APNs shows the alert itself
      apns: {
        payload: {
          aps: {
            alert: {
              title: ownUser.name,
              body,
            },
            sound: 'default',
          },
        },
      },
    });
  },
);
