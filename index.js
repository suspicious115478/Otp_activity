const express = require('express');
const admin = require('firebase-admin');
const app = express();
const port = process.env.PORT || 10000;

// Initialize Firebase Admin SDK
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://project-6268143036742335384-default-rtdb.firebaseio.com/"
});

const db = admin.database();

// Listen for a new child to be added to the textSync path
db.ref('textSync').on('child_added', async (snapshot) => {
    console.log("New OTP detected in database. Sending FCM message.");

    // Retrieve the FCM token of the main device
    const tokenRef = db.ref('deviceTokens').child('mainDevice');
    const tokenSnapshot = await tokenRef.once('value');
    const deviceToken = tokenSnapshot.val();

    if (!deviceToken) {
        console.error("FCM token not found in the database. Cannot send message.");
        return;
    }

    const payload = {
        data: {
            trigger_otp_screen: "true"
        },
        // This is a crucial addition to ensure the message has high priority.
        android: {
            priority: "high"
        }
    };
    
    // To ensure the message is delivered even if the device is in Doze mode,
    // you can also add this option.
    // apns: {
    //    payload: {
    //        aps: {
    //            contentAvailable: true
    //        }
    //    }
    // },
    // webpush: {
    //    headers: {
    //        Urgency: "high"
    //    }
    // }

    try {
        await admin.messaging().sendToDevice(deviceToken, payload);
        console.log("FCM message sent successfully.");

        // Clean up the database entry after sending the message
        await snapshot.ref.remove();
        console.log("Database entry removed.");

    } catch (error) {
        console.error("Error sending FCM message:", error);
    }
});

// A simple endpoint to keep the service alive
app.get('/', (req, res) => {
    res.send('FCM Listener Service is running!');
});

app.listen(port, () => {
    console.log(`FCM Listener Service listening on port ${port}`);
});
