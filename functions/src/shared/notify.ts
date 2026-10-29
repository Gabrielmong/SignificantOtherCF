import * as logger from 'firebase-functions/logger';
import { admin } from './firebase';

/**
 * Sends a multicast push and logs the outcome. Never rejects: send errors are
 * logged, not thrown (same `.then`/`.catch` chain every trigger used inline).
 */
export const sendMulticast = (message: admin.messaging.MulticastMessage) =>
  admin
    .messaging()
    .sendEachForMulticast(message)
    .then((response) => {
      logger.debug(`Successfully sent message: ${JSON.stringify(response)}`);
    })
    .catch((error) => {
      logger.error(`Error sending message: ${JSON.stringify(error)}`);
    });

/**
 * Data-only push telling the partner's home-screen widget to refresh with the
 * sender's current flower / message / feeling. Never rejects.
 */
export const sendWidgetRefresh = (
  tokens: string[],
  ownUser: {
    selectedFlower?: string;
    message?: string;
    selectedFeeling?: string;
    name?: string;
  },
) =>
  admin
    .messaging()
    .sendEachForMulticast({
      tokens,
      data: {
        type: 'widget-refresh',
        flower: ownUser.selectedFlower ?? '',
        message: ownUser.message ?? '',
        feeling: ownUser.selectedFeeling ?? '',
        partnerName: ownUser.name ?? '',
      },
    })
    .then((response) => {
      logger.debug(`Widget refresh push sent: ${JSON.stringify(response)}`);
    })
    .catch((error) => {
      logger.error(`Error sending widget refresh push: ${JSON.stringify(error)}`);
    });
