import { onValueUpdated } from 'firebase-functions/v2/database';
import * as logger from 'firebase-functions/logger';
import { getRoomPair, getUserTokens } from '../shared/rooms';
import { sendMulticast, sendWidgetRefresh } from '../shared/notify';

export const onFlowerUpdated = onValueUpdated(
  {
    ref: 'rooms/{roomId}/users/{userId}/selectedFlower',
  },
  async (event) => {
    const { roomId, userId } = event.params;
    const flower = event.data.after;
    logger.debug(`User ${userId} selected flower ${flower}`);
    logger.debug(JSON.stringify(event.data));

    const pair = await getRoomPair(roomId, userId);
    if (!pair) return;
    const { ownUser, otherUser, otherUserId } = pair;

    logger.debug(`User: ${ownUser.name}`);
    logger.debug(`Sending notification to ${otherUser.name}`);

    const tokens = await getUserTokens(otherUserId);
    if (!tokens) return;

    logger.debug(`Sending notification to tokens: ${tokens}`);

    await Promise.all([
      sendMulticast({
        tokens,
        notification: {
          title: 'New Flower.',
          body: `${ownUser.name} selected a new flower.`,
        },
        android: {
          notification: {
            defaultVibrateTimings: true,
            icon: 'notification_icon',
          },
        },
      }),
      sendWidgetRefresh(tokens, ownUser),
    ]);
  },
);

export const FEELINGS_LABELS: {
  [key: string]: string;
} = {
  angry: 'angry',
  anxious: 'anxious',
  bored: 'bored',
  calm: 'calm',
  euphoric: 'euphoric',
  flirty: 'flirty',
  happy: 'happy',
  headachy: 'headachy',
  horny: 'horny',
  hungry: 'hungry',
  hurt: 'hurt',
  inlove: 'in love',
  neutral: 'neutral',
  nervous: 'nervous',
  overstimulated: 'overstimulated',
  sad: 'sad',
  safe: 'safe',
  sick: 'sick',
  sleepy: 'sleepy',
  tired: 'tired',
  uncomfortable: 'uncomfortable',
  unsure: 'unsure',
  upset: 'upset',
  worried: 'worried',
} as const;

export const onFeelingUpdated = onValueUpdated(
  {
    ref: 'rooms/{roomId}/users/{userId}/selectedFeeling',
  },
  async (event) => {
    const { roomId, userId } = event.params;
    logger.debug(JSON.stringify(event.data));

    const pair = await getRoomPair(roomId, userId);
    if (!pair) return;
    const { ownUser, otherUser, otherUserId } = pair;

    const feeling = ownUser.selectedFeeling;

    logger.debug(`User: ${ownUser.name}`);
    logger.debug(`Sending notification to ${otherUser.name}`);

    const tokens = await getUserTokens(otherUserId);
    if (!tokens) return;

    logger.debug(`Sending notification to tokens: ${tokens}`);

    await Promise.all([
      sendMulticast({
        tokens,
        notification: {
          title: 'Change in the mood.',
          body: `${ownUser.name} feels ${FEELINGS_LABELS[feeling] || feeling || 'something new'}.`,
        },
        android: {
          notification: {
            defaultVibrateTimings: true,
            icon: 'notification_icon',
          },
        },
      }),
      sendWidgetRefresh(tokens, ownUser),
    ]);
  },
);
