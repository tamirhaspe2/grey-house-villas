import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

// Initialize Firestore
const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
let firestoreConfig: any = {};

if (credentialsPath && fs.existsSync(credentialsPath)) {
    firestoreConfig.credential = admin.credential.cert(credentialsPath);
} else if (fs.existsSync(path.join(process.cwd(), 'gcp-key.json'))) {
    firestoreConfig.credential = admin.credential.cert(path.join(process.cwd(), 'gcp-key.json'));
} else if (process.env.GCP_KEY_JSON) {
    firestoreConfig.credential = admin.credential.cert(JSON.parse(process.env.GCP_KEY_JSON));
} else {
    console.error("❌ No GCP credentials found. Make sure gcp-key.json exists or GCP_KEY_JSON is in .env");
    process.exit(1);
}

admin.initializeApp(firestoreConfig);
const db = admin.firestore();

async function syncHomeData() {
    console.log("🔄 Pulling live Home Data from Firestore...");

    try {
        const docRef = db.collection('config').doc('home');
        const doc = await docRef.get();

        if (!doc.exists) {
            console.log("❌ No live home data found in Firestore.");
            return;
        }

        const liveData = doc.data()?.data;

        console.log("✅ Successfully fetched live home data.");

        // Backup the live data locally just in case
        fs.writeFileSync(path.join(process.cwd(), 'home_backup_live.json'), JSON.stringify(liveData, null, 2));

        // 1. We want to keep ALL their live images and texts.
        // 2. But we want to inject the specific change we made to the residences heading: "Three Distinct Rental Options."
        if (liveData.residences) {
            liveData.residences.heading = "Three Distinct Rental Options.";
        }

        // Write the updated structure back to Firestore so the live website gets the text update
        await docRef.set({ data: liveData });
        console.log("🚀 Injected the new text into the live Firestore without losing your images!");

        // Overwrite the local home.json so your local dev environment gets your new live pictures
        fs.writeFileSync(path.join(process.cwd(), "src", "data", "home.json"), JSON.stringify(liveData, null, 2));
        console.log("💻 Synced local src/data/home.json with live images. Next time you run local, it will look like live!");

        console.log("✨ Done!");

    } catch (error) {
        console.error("❌ Sync failed:", error);
    }
}

syncHomeData();
