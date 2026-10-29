import * as admin from 'firebase-admin';

// Runs once: Node caches this module, and every module that touches
// firebase-admin imports from here.
admin.initializeApp();
// Start writing functions
// https://firebase.google.com/docs/functions/typescript

export const db = admin.database();

export { admin };
