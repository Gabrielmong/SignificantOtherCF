import { onValueCreated, onValueUpdated } from 'firebase-functions/v2/database';
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

        const tokens = user.fcmtokens;

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
            android: {
              notification: {
                defaultVibrateTimings: true,
                icon: 'notification_icon',
              },
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
  horny: 'horny',
  hurt: 'hurt',
  inlove: 'in love',
  neutral: 'neutral',
  nervous: 'nervous',
  overstimulated: 'overstimulated',
  sad: 'sad',
  safe: 'safe',
  sick: 'sick',
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

        const tokens = user.fcmtokens;

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
            android: {
              notification: {
                defaultVibrateTimings: true,
                icon: 'notification_icon',
              },
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

export const onNewMessage = onValueCreated(
  {
    ref: 'rooms/{roomId}/messages/{messageId}',
  },
  (event) => {
    const { roomId } = event.params;
    const message = event.data.val();
    logger.debug(`New message in room ${roomId}: ${JSON.stringify(message)}`);

    const roomRef = db.ref(`rooms/${roomId}`);

    roomRef.once('value', (snapshot) => {
      const room = snapshot.val();
      const otherUserId = Object.keys(room.users).find((id) => id !== message.uid);
      const otherUser = room.users[otherUserId as string];
      const ownUserId = Object.keys(room.users).find((id) => id === message.uid);
      const ownUser = room.users[ownUserId as string];

      const usersRef = db.ref(`users/${otherUserId}`);

      logger.debug(`User ${ownUser.name} sent message ${message}`);

      usersRef.once('value', (snapshot) => {
        const user = snapshot.val();
        logger.debug(`User: ${ownUser.name}`);

        logger.debug(`Sending notification to ${otherUser.name}`);

        const tokens = user.fcmtokens;

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
              title: 'New message.',
              body: `${ownUser.name} sent a new message.`,
            },
            android: {
              notification: {
                defaultVibrateTimings: true,
                icon: 'notification_icon',
              },
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

export const onNewWish = onValueCreated(
  {
    ref: 'rooms/{roomId}/wishlist/{activityId}/{wishId}',
  },
  (event) => {
    const { roomId } = event.params;
    const wish = event.data.val();
    logger.debug(`New wish in room ${roomId}: ${JSON.stringify(wish)}`);

    const roomRef = db.ref(`rooms/${roomId}`);

    roomRef.once('value', (snapshot) => {
      const room = snapshot.val();
      const otherUserId = Object.keys(room.users).find((id) => id !== wish.uid);
      const otherUser = room.users[otherUserId as string];
      const ownUserId = Object.keys(room.users).find((id) => id === wish.uid);
      const ownUser = room.users[ownUserId as string];

      const usersRef = db.ref(`users/${otherUserId}`);

      logger.debug(`User ${ownUser.name} added wish ${wish}`);

      usersRef.once('value', (snapshot) => {
        const user = snapshot.val();
        logger.debug(`User: ${ownUser.name}`);

        logger.debug(`Sending notification to ${otherUser.name}`);

        const tokens = user.fcmtokens;

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
              title: 'New wish.',
              body: `${ownUser.name} added a new wish.`,
            },
            android: {
              notification: {
                defaultVibrateTimings: true,
                icon: 'notification_icon',
              },
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
