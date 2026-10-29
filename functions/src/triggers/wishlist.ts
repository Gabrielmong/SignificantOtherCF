import { onValueCreated } from 'firebase-functions/v2/database';
import * as logger from 'firebase-functions/logger';
import { getRoomPair, getUserTokens } from '../shared/rooms';
import { sendMulticast } from '../shared/notify';

export const onNewWish = onValueCreated(
  {
    ref: 'rooms/{roomId}/wishlist/{activityId}/{wishId}',
  },
  async (event) => {
    const { roomId } = event.params;
    const wish = event.data.val();
    logger.debug(`New wish in room ${roomId}: ${JSON.stringify(wish)}`);

    const pair = await getRoomPair(roomId, wish?.uid);
    if (!pair) return;
    const { ownUser, otherUser, otherUserId } = pair;

    logger.debug(`User ${ownUser.name} added wish ${wish}`);
    logger.debug(`User: ${ownUser.name}`);
    logger.debug(`Sending notification to ${otherUser.name}`);

    const tokens = await getUserTokens(otherUserId);
    if (!tokens) return;

    logger.debug(`Sending notification to tokens: ${tokens}`);

    await sendMulticast({
      tokens,
      notification: {
        title: 'New wish.',
        body: `${ownUser.name} added a new wish.`,
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
