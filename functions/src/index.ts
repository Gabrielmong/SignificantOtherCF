import { onValueUpdated } from 'firebase-functions/v2/database';
import * as logger from 'firebase-functions/logger';
import * as admin from 'firebase-admin';

admin.initializeApp();
// Start writing functions
// https://firebase.google.com/docs/functions/typescript

const db = admin.database();

export const onFlowerUpdated = onValueUpdated(
  {
    ref: 'rooms/{roomId}/users/{userId}/selectedFlower',
  },
  (event) => {
    const { roomId, userId } = event.params;
    const flower = event.data.after;
    logger.debug(`User ${userId} selected flower ${flower}`);
    logger.debug(JSON.stringify(event.data));

    const roomRef = db.ref(`rooms/${roomId}`);

    roomRef.once('value', (snapshot) => {
      const room = snapshot.val();
      const otherUserId = Object.keys(room.users).find((id) => id !== userId);
      const otherUser = room.users[otherUserId as string];
      const ownUserId = Object.keys(room.users).find((id) => id === userId);
      const ownUser = room.users[ownUserId as string];

      const usersRef = db.ref(`users/${otherUserId}`);

      usersRef.once('value', (snapshot) => {
        const user = snapshot.val();
        logger.debug(`User: ${ownUser.name}`);

        logger.debug(`Sending notification to ${otherUser.name}`);

        const tokens = user.fcmTokens;

        if (!tokens) {
          logger.debug('No tokens found, skipping notification');
          return;
        }

        logger.debug(`Sending notification to tokens: ${tokens}`);

        admin
          .messaging()
          .sendEachForMulticast({
            tokens,
            notification: {
              title: 'New Flower.',
              body: `${ownUser.name} selected a new flower.`,
            },
          })
          .then((response) => {
            logger.debug(`Successfully sent message: ${JSON.stringify(response)}`);
          })
          .catch((error) => {
            logger.error(`Error sending message: ${JSON.stringify(error)}`);
          });
      });
    });

    return Promise.resolve();
  },
);

const FEELINGS_LABELS: {
  [key: string]: string;
} = {
  anxious: 'anxious',
  bored: 'bored',
  euphoric: 'euphoric',
  flirty: 'flirty',
  happy: 'happy',
  horny: 'horny',
  hurt: 'hurt',
  inlove: 'in love',
  neutral: 'neutral',
  overstimulated: 'overstimulated',
  sad: 'sad',
  tired: 'tired',
  uncomfortable: 'uncomfortable',
  upset: 'upset',
  worried: 'worried',
} as const;

export const onFeelingUpdated = onValueUpdated(
  {
    ref: 'rooms/{roomId}/users/{userId}/selectedFeeling',
  },
  (event) => {
    const { roomId, userId } = event.params;
    logger.debug(JSON.stringify(event.data));

    const roomRef = db.ref(`rooms/${roomId}`);

    roomRef.once('value', (snapshot) => {
      const room = snapshot.val();
      const otherUserId = Object.keys(room.users).find((id) => id !== userId);
      const otherUser = room.users[otherUserId as string];
      const ownUserId = Object.keys(room.users).find((id) => id === userId);
      const ownUser = room.users[ownUserId as string];
      const feeling = ownUser.selectedFeeling;
      const usersRef = db.ref(`users/${otherUserId}`);

      usersRef.once('value', (snapshot) => {
        const user = snapshot.val();
        logger.debug(`User: ${ownUser.name}`);

        logger.debug(`Sending notification to ${otherUser.name}`);

        const tokens = user.fcmTokens;

        if (!tokens) {
          logger.debug('No tokens found, skipping notification');
          return;
        }

        logger.debug(`Sending notification to tokens: ${tokens}`);

        admin
          .messaging()
          .sendEachForMulticast({
            tokens,
            notification: {
              title: 'Change in the mood.',
              body: `${ownUser.name} feels ${FEELINGS_LABELS[feeling]}.`,
            },
          })
          .then((response) => {
            logger.debug(`Successfully sent message: ${JSON.stringify(response)}`);
          })
          .catch((error) => {
            logger.error(`Error sending message: ${JSON.stringify(error)}`);
          });
      });
    });

    return Promise.resolve();
  },
);
