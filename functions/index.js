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
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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

const addToCollection = async (data) => {
  data.createdAt = new Date().toISOString();
  debugger;
  // Push the new message into Firestore using the Firebase Admin SDK.
  const writeResult = await db.collection("generations").add(data);
  return {
    result: `Message with ID: ${writeResult.id} added.`,
    docId: writeResult.id,
  };
};

exports.Queue = onRequest(async (req, res) => {
  debugger;
  if (req.method == "POST") {
    logger.log("Received request to add generation to queue");
    const body = req.body;
    
    if (!body || Object.keys(body).length === 0) {
      res.status(400).send("Request body is missing or empty");
      return;
    }

    if(!body.prompt){
      res.status(400).send("Missing 'prompt' in request body");
      return;
    }

    const result = await addToCollection(body);
    res.json(result);
  } else if (req.method == "GET") {
    const generationId = req.params[0];

    if (!generationId) {
      res.status(400).send("Missing generationId parameter");
      return;
    }
    logger.log("Received request to get generation status", generationId);

    try {
      const docRef = getFirestore()
        .collection("generations")
        .doc(generationId);
      const doc = await docRef.get();

      if (!doc.exists) {
        res.status(404).send("Generation not found");
        return;
      }

      res.json({ id: doc.id, ...doc.data() });
    } catch (error) {
      logger.error("Error getting generation", error);
      res.status(500).send("Internal Server Error");
    }
  }
});

exports.processGeneration = onDocumentCreated(
  "/generations/{generationId}",
  (event) => {
    // Grab the current value of what was written to Firestore.
    try {
      const generation = event.data.data();
      debugger;

      // Access the parameter `{generationId}` with `event.params`
      logger.log("Processing", event.params.generationId, generation);
      // delay between 30 or 60 seconds to simulate a long process
      const delayTime = Math.floor(Math.random() * 30_000) + 30_000;
      const start = Date.now();
      while (Date.now() - start < delayTime) {
        // Do nothing
      }

      // mock success with %70 probability
      let success;
      if (Math.random() < 0.7) {
        success = true;
        logger.log("Generation succeeded for", event.params.documentId);
      } else {
        success = false;
        logger.error("Generation failed for", event.params.documentId);
      }

      const status = success ? "done" : "failed";
      const mockImageUrl = success
        ? `https://picsum.photos/seed/${event.params.documentId}/${IMAGE_SIZE}/${IMAGE_SIZE}`
        : "";
      const updatedAt = new Date().toISOString();
      const errorMessage = success
        ? ""
        : "Generation process failed due to an internal error.";

      // You must return a Promise when performing
      // asynchronous tasks inside a function
      // such as writing to Firestore.
      // Setting an 'uppercase' field in Firestore document returns a Promise.
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
