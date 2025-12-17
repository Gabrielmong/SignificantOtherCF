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

      if (!room) {
        logger.warn(`Room ${roomId} not found, skipping notification`);
        return;
      }

      if (!room.users || typeof room.users !== 'object') {
        logger.warn(`Room ${roomId} has no users, skipping notification`);
        return;
      }

      const otherUserId = Object.keys(room.users).find((id) => id !== userId);
      if (!otherUserId) {
        logger.debug(`No other user found in room ${roomId}, skipping notification`);
        return;
      }

      const otherUser = room.users[otherUserId];
      const ownUser = room.users[userId];

      if (!otherUser || !ownUser) {
        logger.warn(`User data missing in room ${roomId}, skipping notification`);
        return;
      }

      if (!ownUser.name || !otherUser.name) {
        logger.warn('User names missing, skipping notification');
        return;
      }

      const usersRef = db.ref(`users/${otherUserId}`);

      usersRef.once('value', (snapshot) => {
        const user = snapshot.val();

        if (!user) {
          logger.warn(`User ${otherUserId} not found, skipping notification`);
          return;
        }

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
  (event) => {
    const { roomId, userId } = event.params;
    logger.debug(JSON.stringify(event.data));

    const roomRef = db.ref(`rooms/${roomId}`);

    roomRef.once('value', (snapshot) => {
      const room = snapshot.val();

      if (!room) {
        logger.warn(`Room ${roomId} not found, skipping notification`);
        return;
      }

      if (!room.users || typeof room.users !== 'object') {
        logger.warn(`Room ${roomId} has no users, skipping notification`);
        return;
      }

      const otherUserId = Object.keys(room.users).find((id) => id !== userId);
      if (!otherUserId) {
        logger.debug(`No other user found in room ${roomId}, skipping notification`);
        return;
      }

      const otherUser = room.users[otherUserId];
      const ownUser = room.users[userId];

      if (!otherUser || !ownUser) {
        logger.warn(`User data missing in room ${roomId}, skipping notification`);
        return;
      }

      if (!ownUser.name || !otherUser.name) {
        logger.warn('User names missing, skipping notification');
        return;
      }

      const feeling = ownUser.selectedFeeling;
      const usersRef = db.ref(`users/${otherUserId}`);

      usersRef.once('value', (snapshot) => {
        const user = snapshot.val();

        if (!user) {
          logger.warn(`User ${otherUserId} not found, skipping notification`);
          return;
        }

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
              body: `${ownUser.name} feels ${FEELINGS_LABELS[feeling] || feeling || 'something new'}.`,
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

      if (!room) {
        logger.warn(`Room ${roomId} not found, skipping notification`);
        return;
      }

      if (!room.users || typeof room.users !== 'object') {
        logger.warn(`Room ${roomId} has no users, skipping notification`);
        return;
      }

      const otherUserId = Object.keys(room.users).find((id) => id !== message.uid);
      if (!otherUserId) {
        logger.debug(`No other user found in room ${roomId}, skipping notification`);
        return;
      }

      const otherUser = room.users[otherUserId];
      const ownUserId = Object.keys(room.users).find((id) => id === message.uid);
      const ownUser = room.users[ownUserId as string];

      if (!otherUser || !ownUser) {
        logger.warn(`User data missing in room ${roomId}, skipping notification`);
        return;
      }

      if (!ownUser.name || !otherUser.name) {
        logger.warn('User names missing, skipping notification');
        return;
      }

      const usersRef = db.ref(`users/${otherUserId}`);

      logger.debug(`User ${ownUser.name} sent message ${message}`);

      usersRef.once('value', (snapshot) => {
        const user = snapshot.val();

        if (!user) {
          logger.warn(`User ${otherUserId} not found, skipping notification`);
          return;
        }

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

      if (!room) {
        logger.warn(`Room ${roomId} not found, skipping notification`);
        return;
      }

      if (!room.users || typeof room.users !== 'object') {
        logger.warn(`Room ${roomId} has no users, skipping notification`);
        return;
      }

      const otherUserId = Object.keys(room.users).find((id) => id !== wish.uid);
      if (!otherUserId) {
        logger.debug(`No other user found in room ${roomId}, skipping notification`);
        return;
      }

      const otherUser = room.users[otherUserId];
      const ownUserId = Object.keys(room.users).find((id) => id === wish.uid);
      const ownUser = room.users[ownUserId as string];

      if (!otherUser || !ownUser) {
        logger.warn(`User data missing in room ${roomId}, skipping notification`);
        return;
      }

      if (!ownUser.name || !otherUser.name) {
        logger.warn('User names missing, skipping notification');
        return;
      }

      const usersRef = db.ref(`users/${otherUserId}`);

      logger.debug(`User ${ownUser.name} added wish ${wish}`);

      usersRef.once('value', (snapshot) => {
        const user = snapshot.val();

        if (!user) {
          logger.warn(`User ${otherUserId} not found, skipping notification`);
          return;
        }

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

export const onNewJournalEntry = onValueCreated(
  {
    ref: 'rooms/{roomId}/journal/{entryId}',
  },
  (event) => {
    const { roomId } = event.params;
    const entry = event.data.val();
    logger.debug(`New journal entry in room ${roomId}: ${JSON.stringify(entry)}`);

    const roomRef = db.ref(`rooms/${roomId}`);

    roomRef.once('value', (snapshot) => {
      const room = snapshot.val();

      if (!room) {
        logger.warn(`Room ${roomId} not found, skipping notification`);
        return;
      }

      if (!room.users || typeof room.users !== 'object') {
        logger.warn(`Room ${roomId} has no users, skipping notification`);
        return;
      }

      const otherUserId = Object.keys(room.users).find((id) => id !== entry.authorId);
      if (!otherUserId) {
        logger.debug(`No other user found in room ${roomId}, skipping notification`);
        return;
      }

      const otherUser = room.users[otherUserId];
      const ownUserId = Object.keys(room.users).find((id) => id === entry.authorId);
      const ownUser = room.users[ownUserId as string];

      if (!otherUser || !ownUser) {
        logger.warn(`User data missing in room ${roomId}, skipping notification`);
        return;
      }

      if (!ownUser.name || !otherUser.name) {
        logger.warn('User names missing, skipping notification');
        return;
      }

      const usersRef = db.ref(`users/${otherUserId}`);

      logger.debug(`User ${ownUser.name} added journal entry ${entry}`);

      usersRef.once('value', (snapshot) => {
        const user = snapshot.val();

        if (!user) {
          logger.warn(`User ${otherUserId} not found, skipping notification`);
          return;
        }

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
              title: `${ownUser.name} just wrote something 👀`,
              body: `There's a new journal entry from ${ownUser.name}.`,
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

export const onZoneEntered = onValueUpdated(
  {
    ref: 'rooms/{roomId}/zoneStatus/{userId}/{zoneId}',
  },
  (event) => {
    const beforeStatus = event.data.before.val()?.status;
    const afterStatus = event.data.after.val()?.status;

    // Only trigger if transitioning TO 'inside' from any other status
    if (beforeStatus !== 'inside' && afterStatus === 'inside') {
      const { roomId, userId } = event.params;
      const zoneData = event.data.after.val();

      if (!zoneData) {
        logger.warn(`Zone data not found for user ${userId}, skipping notification`);
        return Promise.resolve();
      }

      if (!zoneData.zoneName) {
        logger.warn('Zone name missing, skipping notification');
        return Promise.resolve();
      }

      logger.debug(`User ${userId} entered zone ${zoneData.zoneName} in room ${roomId}`);

      const roomRef = db.ref(`rooms/${roomId}`);

      roomRef.once('value', (snapshot) => {
        const room = snapshot.val();

        if (!room) {
          logger.warn(`Room ${roomId} not found, skipping notification`);
          return;
        }

        if (!room.users || typeof room.users !== 'object') {
          logger.warn(`Room ${roomId} has no users, skipping notification`);
          return;
        }

        const otherUserId = Object.keys(room.users).find((id) => id !== userId);
        if (!otherUserId) {
          logger.debug(`No other user found in room ${roomId}, skipping notification`);
          return;
        }

        const otherUser = room.users[otherUserId];
        const ownUser = room.users[userId];

        if (!otherUser || !ownUser) {
          logger.warn(`User data missing in room ${roomId}, skipping notification`);
          return;
        }

        if (!ownUser.name || !otherUser.name) {
          logger.warn('User names missing, skipping notification');
          return;
        }

        const usersRef = db.ref(`users/${otherUserId}`);

        logger.debug(`User ${ownUser.name} entered zone ${zoneData.zoneName}`);

        usersRef.once('value', (snapshot) => {
          const user = snapshot.val();

          if (!user) {
            logger.warn(`User ${otherUserId} not found, skipping notification`);
            return;
          }

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
                title: 'Zone arrival',
                body: `${ownUser.name} arrived at ${zoneData.zoneName}`,
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
    }

    return Promise.resolve();
  },
);

export const onZoneExited = onValueUpdated(
  {
    ref: 'rooms/{roomId}/zoneStatus/{userId}/{zoneId}',
  },
  (event) => {
    const beforeStatus = event.data.before.val()?.status;
    const afterStatus = event.data.after.val()?.status;

    // Only trigger if transitioning FROM 'inside' to any other status
    if (beforeStatus === 'inside' && afterStatus !== 'inside') {
      const { roomId, userId } = event.params;
      const zoneData = event.data.before.val(); // Use 'before' for zone name

      if (!zoneData) {
        logger.warn(`Zone data not found for user ${userId}, skipping notification`);
        return Promise.resolve();
      }

      if (!zoneData.zoneName) {
        logger.warn('Zone name missing, skipping notification');
        return Promise.resolve();
      }

      logger.debug(`User ${userId} exited zone ${zoneData.zoneName} in room ${roomId}`);

      const roomRef = db.ref(`rooms/${roomId}`);

      roomRef.once('value', (snapshot) => {
        const room = snapshot.val();

        if (!room) {
          logger.warn(`Room ${roomId} not found, skipping notification`);
          return;
        }

        if (!room.users || typeof room.users !== 'object') {
          logger.warn(`Room ${roomId} has no users, skipping notification`);
          return;
        }

        const otherUserId = Object.keys(room.users).find((id) => id !== userId);
        if (!otherUserId) {
          logger.debug(`No other user found in room ${roomId}, skipping notification`);
          return;
        }

        const otherUser = room.users[otherUserId];
        const ownUser = room.users[userId];

        if (!otherUser || !ownUser) {
          logger.warn(`User data missing in room ${roomId}, skipping notification`);
          return;
        }

        if (!ownUser.name || !otherUser.name) {
          logger.warn('User names missing, skipping notification');
          return;
        }

        const usersRef = db.ref(`users/${otherUserId}`);

        logger.debug(`User ${ownUser.name} exited zone ${zoneData.zoneName}`);

        usersRef.once('value', (snapshot) => {
          const user = snapshot.val();

          if (!user) {
            logger.warn(`User ${otherUserId} not found, skipping notification`);
            return;
          }

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
                title: 'Zone departure',
                body: `${ownUser.name} left ${zoneData.zoneName}`,
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
    }

    return Promise.resolve();
  },
);
