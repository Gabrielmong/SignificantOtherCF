import { onValueCreated } from 'firebase-functions/v2/database';
import * as logger from 'firebase-functions/logger';
import { getRoomPair, getUserTokens } from '../shared/rooms';
import { sendMulticast } from '../shared/notify';

export const onNewJournalEntry = onValueCreated(
  {
    ref: 'rooms/{roomId}/journal/{entryId}',
  },
  async (event) => {
    const { roomId } = event.params;
    const entry = event.data.val();
    logger.debug(`New journal entry in room ${roomId}: ${JSON.stringify(entry)}`);

    if (!entry?.notifyPartner) return;

    const pair = await getRoomPair(roomId, entry.authorId);
    if (!pair) return;
    const { ownUser, otherUser, otherUserId } = pair;

    logger.debug(`User ${ownUser.name} added journal entry ${entry}`);
    logger.debug(`User: ${ownUser.name}`);
    logger.debug(`Sending notification to ${otherUser.name}`);

    const tokens = await getUserTokens(otherUserId);
    if (!tokens) return;

    logger.debug(`Sending notification to tokens: ${tokens}`);

    await sendMulticast({
      tokens,
      notification: {
        title: `${ownUser.name} just wrote something 👀`,
        body: `There's a new journal entry from ${ownUser.name}.`,
      },
      android: {
        notification: {
          defaultVibrateTimings: true,
          icon: 'notification_icon',
        },
      },
    });
  },
);
