import { onValueUpdated } from 'firebase-functions/v2/database';
import * as logger from 'firebase-functions/logger';
import { getRoomPair, getUserTokens } from '../shared/rooms';
import { sendMulticast } from '../shared/notify';

export const onZoneEntered = onValueUpdated(
  {
    ref: 'rooms/{roomId}/zoneStatus/{userId}/{zoneId}',
  },
  async (event) => {
    const beforeStatus = event.data.before.val()?.status;
    const afterStatus = event.data.after.val()?.status;

    // Only trigger if transitioning TO 'inside' from any other status
    if (beforeStatus !== 'inside' && afterStatus === 'inside') {
      const { roomId, userId } = event.params;
      const zoneData = event.data.after.val();

      if (!zoneData) {
        logger.warn(`Zone data not found for user ${userId}, skipping notification`);
        return;
      }

      if (!zoneData.zoneName) {
        logger.warn('Zone name missing, skipping notification');
        return;
      }

      logger.debug(`User ${userId} entered zone ${zoneData.zoneName} in room ${roomId}`);

      const pair = await getRoomPair(roomId, userId);
      if (!pair) return;
      const { ownUser, otherUser, otherUserId } = pair;

      logger.debug(`User ${ownUser.name} entered zone ${zoneData.zoneName}`);
      logger.debug(`Sending notification to ${otherUser.name}`);

      const tokens = await getUserTokens(otherUserId);
      if (!tokens) return;

      logger.debug(`Sending notification to tokens: ${tokens}`);

      await sendMulticast({
        tokens,
        notification: {
          title: 'Zone arrival',
          body: `${ownUser.name} arrived at ${zoneData.zoneName}`,
        },
        android: {
          notification: {
            defaultVibrateTimings: true,
            icon: 'notification_icon',
          },
        },
      });
    }
  },
);

export const onZoneExited = onValueUpdated(
  {
    ref: 'rooms/{roomId}/zoneStatus/{userId}/{zoneId}',
  },
  async (event) => {
    const beforeStatus = event.data.before.val()?.status;
    const afterStatus = event.data.after.val()?.status;

    // Only trigger if transitioning FROM 'inside' to any other status
    if (beforeStatus === 'inside' && afterStatus !== 'inside') {
      const { roomId, userId } = event.params;
      const zoneData = event.data.before.val(); // Use 'before' for zone name

      if (!zoneData) {
        logger.warn(`Zone data not found for user ${userId}, skipping notification`);
        return;
      }

      if (!zoneData.zoneName) {
        logger.warn('Zone name missing, skipping notification');
        return;
      }

      logger.debug(`User ${userId} exited zone ${zoneData.zoneName} in room ${roomId}`);

      const pair = await getRoomPair(roomId, userId);
      if (!pair) return;
      const { ownUser, otherUser, otherUserId } = pair;

      logger.debug(`User ${ownUser.name} exited zone ${zoneData.zoneName}`);
      logger.debug(`Sending notification to ${otherUser.name}`);

      const tokens = await getUserTokens(otherUserId);
      if (!tokens) return;

      logger.debug(`Sending notification to tokens: ${tokens}`);

      await sendMulticast({
        tokens,
        notification: {
          title: 'Zone departure',
          body: `${ownUser.name} left ${zoneData.zoneName}`,
        },
        android: {
          notification: {
            defaultVibrateTimings: true,
            icon: 'notification_icon',
          },
        },
      });
    }
  },
);
