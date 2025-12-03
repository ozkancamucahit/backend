const { setGlobalOptions } = require("firebase-functions");
const { onRequest } = require("firebase-functions/https");
const logger = require("firebase-functions/logger");
const { onDocumentCreated } = require("firebase-functions/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp();
const db = getFirestore();
// issue on python : https://github.com/firebase/firebase-tools/issues/8571

const IMAGE_SIZE = 1024;

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });


exports.processGeneration = onDocumentCreated(
  "/generations/{generationId}",
  (event) => {
    try {
      const generation = event.data.data();
      debugger;

      logger.log("Processing", event.params.generationId, generation);
      // delay between 5 or 10 seconds to simulate a long process
      const delayTime = Math.floor(Math.random() * 5_000) + 5_000;
      const start = Date.now();
      while (Date.now() - start < delayTime) {
        // Do nothing
      }

      // mock success with %50 probability
      let success;
      if (Math.random() < 0.5) {
        success = true;
        logger.log("Generation succeeded for", event.params.generationId);
      } else {
        success = false;
        logger.error("Generation failed for", event.params.generationId);
      }

      const status = success ? "done" : "failed";
      const mockImageUrl = success
        ? `https://picsum.photos/seed/${event.params.generationId}/${IMAGE_SIZE}/${IMAGE_SIZE}`
        : "";
      const updatedAt = new Date().toISOString();
      const errorMessage = success
        ? ""
        : "Generation process failed due to an internal error.";

      return event.data.ref.set(
        { status, imageUrl: mockImageUrl, errorMessage, updatedAt },
        { merge: true }
      );
    } catch (error) {
      logger.error("Error processing generation", error);
      return event.data.ref.set({
        status: "failed",
        errorMessage: "Generation process failed due to an internal error.",
      });
    }
  }
);
