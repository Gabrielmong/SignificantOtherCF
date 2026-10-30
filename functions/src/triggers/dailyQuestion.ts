import { onValueCreated } from 'firebase-functions/v2/database';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as logger from 'firebase-functions/logger';
import { admin, db } from '../shared/firebase';

// The couple's day follows America/Costa_Rica: UTC−6 all year, no DST.
// Must match utils/dailyQuestion.ts in the app.
const COUPLE_UTC_OFFSET_MS = -6 * 60 * 60 * 1000;

const coupleDateKey = (now: number = Date.now()): string => {
  const date = new Date(now + COUPLE_UTC_OFFSET_MS);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
};

const sendToUser = async (userId: string, title: string, body: string) => {
  const userSnapshot = await db.ref(`users/${userId}`).once('value');
  const tokens = userSnapshot.val()?.fcmtokens;

  if (!tokens) {
    logger.debug(`No tokens for user ${userId}, skipping notification`);
    return;
  }

  const response = await admin.messaging().sendEachForMulticast({
    tokens,
    notification: { title, body },
    android: {
      notification: {
        defaultVibrateTimings: true,
        icon: 'notification_icon',
      },
    },
  });
  logger.debug(`Sent "${title}" to ${userId}: ${JSON.stringify(response)}`);
};

export const onDailyAnswerCreated = onValueCreated(
  {
    ref: 'rooms/{roomId}/dailyQuestions/{dateKey}/answers/{userId}',
  },
  async (event) => {
    const { roomId, dateKey, userId } = event.params;

    try {
      const usersSnapshot = await db.ref(`rooms/${roomId}/users`).once('value');
      const users = usersSnapshot.val();

      if (!users || typeof users !== 'object') {
        logger.warn(`Room ${roomId} has no users, skipping daily answer notification`);
        return;
      }

      const otherUserId = Object.keys(users).find((id) => id !== userId);
      if (!otherUserId) {
        logger.debug(`No partner in room ${roomId}, skipping daily answer notification`);
        return;
      }

      const name = users[userId]?.name;
      if (!name) {
        logger.warn(`Name missing for ${userId} in room ${roomId}, skipping notification`);
        return;
      }

      const otherAnswer = await db
        .ref(`rooms/${roomId}/dailyQuestions/${dateKey}/answers/${otherUserId}`)
        .once('value');

      // Answers for a day that has ended are allowed, marked late in the app
      if (dateKey < coupleDateKey()) {
        await sendToUser(
          otherUserId,
          `${name} answered a missed question ⏰`,
          otherAnswer.exists() ?
            'See their late answer in Daily questions.' :
            'Answer it too to see what they said.',
        );
      } else if (otherAnswer.exists()) {
        await sendToUser(
          otherUserId,
          'You both answered 💬',
          `See what ${name} said about today's question.`,
        );
      } else {
        await sendToUser(
          otherUserId,
          `${name} answered today's question 👀`,
          'Answer yours to see what they said.',
        );
      }
    } catch (error) {
      logger.error(`Daily answer notification failed for room ${roomId}: ${error}`);
    }
  },
);

// Notifies everyone who hasn't answered today's question yet and whose
// partner has joined their room
const remindUnanswered = async (title: string, body: string) => {
  const today = coupleDateKey();

  // Read the small users node rather than every room (rooms hold
  // messages, whiteboards, etc.).
  const usersSnapshot = await db.ref('users').once('value');
  const users = usersSnapshot.val() || {};

  const roomUserCounts = new Map<string, number>();

  // Only the fields this reminder reads; records can be partial
  type UserRecord = { roomId?: string; fcmtokens?: string[] } | null;
  for (const [userId, user] of Object.entries<UserRecord>(users)) {
    const roomId = user?.roomId;
    if (!roomId || !user?.fcmtokens) continue;

    try {
      // Skip people whose room has no partner yet (read once per room).
      let userCount = roomUserCounts.get(roomId);
      if (userCount === undefined) {
        const roomUsers = await db.ref(`rooms/${roomId}/users`).once('value');
        userCount = Object.keys(roomUsers.val() || {}).length;
        roomUserCounts.set(roomId, userCount);
      }
      if (userCount < 2) continue;

      const answer = await db
        .ref(`rooms/${roomId}/dailyQuestions/${today}/answers/${userId}`)
        .once('value');
      if (answer.exists()) continue;

      await sendToUser(userId, title, body);
    } catch (error) {
      logger.error(`Daily question reminder "${title}" failed for user ${userId}: ${error}`);
    }
  }
};

// Three reminders through the couple's day; each skips whoever has answered
export const dailyQuestionMorningReminder = onSchedule(
  {
    schedule: '0 10 * * *',
    timeZone: 'America/Costa_Rica',
  },
  () =>
    remindUnanswered(
      'Today\'s question is here 💭',
      'Answer it to see what your partner says.',
    ),
);

export const dailyQuestionAfternoonReminder = onSchedule(
  {
    schedule: '30 14 * * *',
    timeZone: 'America/Costa_Rica',
  },
  () =>
    remindUnanswered(
      'Still thinking about today\'s question? 🤔',
      'There\'s time to answer and see your partner\'s answer.',
    ),
);

// Keeps its original export name: renaming a function deletes and recreates it
export const dailyQuestionReminder = onSchedule(
  {
    schedule: '0 22 * * *',
    timeZone: 'America/Costa_Rica',
  },
  () =>
    remindUnanswered(
      'Two hours left ⏳',
      'Today\'s question closes at midnight. Answer to see your partner\'s answer.',
    ),
);
