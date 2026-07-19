import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as cors from "cors";

const corsOrigin = cors({origin: true});

admin.initializeApp(functions.config().firebase);
const database = admin.database();

// // Start writing functions
// // https://firebase.google.com/docs/functions/typescript
//
export const helloWorld = functions.https.onRequest((request, response) => {
  functions.logger.info("Hello logs!", {structuredData: true});
  response.send("Hello from Firebase!");
});

interface Guest {
  first: string;
  last: string;
  joining?: string;
  restriction?: string;
  exist?: boolean;
}

export const addGuests = functions.https.onRequest(async (request, response) => {
  corsOrigin(request, response, async () => {
    const guests = request.body.guests as Guest[];

    for (const guest of guests) {
      functions.logger.info(`guest: ${guest.first}_${guest.last}`);
      await database.ref(`names/${guest.first}_${guest.last}`).once("value", (snapshot) => {
        if (!snapshot.exists()) {
          return response.sendStatus(403);
        }
      });
    }

    for (const guest of guests) {
      await database.ref(`guests/${guest.first}_${guest.last}`).set({
        joining: guest.joining,
        restriction: guest.restriction,
      });
    }

    return response.sendStatus(204);
  });
});

export const guestsExists = functions.https.onRequest(async (request, response) => {
  corsOrigin(request, response, async () => {
    const guests = request.body.guests as Guest[];

    for (const guest of guests) {
      await database.ref(`guests/${guest.first}_${guest.last}`).once("value", (snapshot) => {
        if (snapshot.exists()) {
          return response.send({exists: true});
        }
      }, (err) => {
        console.error(`An error occurred while getting the guest: ${guest.first}_${guest.last}`, err);
      });
    }
    return response.send({exists: false});
  });
});

export const namesExists = functions.https.onRequest(async (request, response) => {
  corsOrigin(request, response, async () => {
    const names = request.body.names as Guest[];

    for (const name of names) {
      await database.ref(`names/${name.first}_${name.last}`).once("value", (snapshot) => {
        if (!snapshot.exists()) {
          return response.send({exist: false});
        }
      }, (err) => {
        console.error(`An error occurred while getting the guest: ${name.first}_${name.last}`, err);
      });
    }
    return response.send({exists: true});
  });
});
