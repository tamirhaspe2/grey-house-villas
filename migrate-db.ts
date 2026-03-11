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

async function migrateDatabase() {
    console.log("🔄 Starting database migration...");

    try {
        const docRef = db.collection('config').doc('villas');
        const doc = await docRef.get();

        if (!doc.exists) {
            console.log("❌ No live data found in Firestore. Nothing to migrate.");
            return;
        }

        const liveData = doc.data()?.data;
        if (!Array.isArray(liveData) || liveData.length === 0) {
            console.log("❌ Live data format is invalid.");
            return;
        }

        console.log("✅ Successfully fetched live data from Firestore.");

        // Find the old units from the live data
        const oldOneiro = liveData.find((v: any) => v.id === 'villa-oneiro' || v.name.includes('Oneiro'));
        const oldOmorfi = liveData.find((v: any) => v.id === 'omorfi-suite' || v.name.includes('Omorphy'));
        const oldPetra = liveData.find((v: any) => v.id === 'villa-petra' || v.name.includes('Pétra'));

        if (!oldOneiro || !oldOmorfi || !oldPetra) {
            console.log("⚠️ Could not find all 3 old units in the live database. Cannot perform automatic merge.");
            return;
        }

        // Construct the new Option A (Oneiro + Omorfi)
        const combinedOptionAImages = [...new Set([...(oldOneiro.gallery || []), ...(oldOmorfi.gallery || [])])];
        const newOptionA = {
            id: "villa-oneiro",
            name: "Oneiro",
            subtitle: "The Main House & Suite",
            description: "A masterful 175m² two-story residence combining high-end Italian design with raw natural textures, plus a discreet 25m² suite tucked beneath the main outdoor pool. Features multi-zone outdoor lighting, underfloor heating, and expansive natural stone terraces.",
            image: oldOneiro.image || "/VILLA_ONEIRO/image.png",
            specs: [
                { label: "Space", value: "200m² Total (Main House + Suite)" },
                { label: "Bedrooms", value: "3 Bedrooms (12000 BTU AC each)" },
                { label: "Baths", value: "3.5 Baths (Luxury showers, heated mirrors)" },
                { label: "Kitchen", value: "Italian Kitchen & 15KW Soapstone Stove" }
            ],
            gallery: combinedOptionAImages
        };

        // Construct the new Option B (Petra)
        // Keep Petra exactly as it is in live, but update text if it's outdated. We'll merge live text/images over the new structure.
        const newOptionB = {
            id: "villa-petra",
            name: "Villa Pétra",
            subtitle: oldPetra.subtitle || "The Private Enclave",
            description: oldPetra.description || "Situated 50 meters below the main house, offering ultimate seclusion. Accessed via a private road with its own dedicated parking and terraced living spaces.",
            image: oldPetra.image || "/Villa_PETRA/image1.png",
            specs: [
                { label: "Space", value: "50m² Living Space + 100m² Parking" },
                { label: "Bedrooms", value: "1 Bedroom (12000 BTU AC)" },
                { label: "Pool", value: "4x1.5m Private Plunge Pool" },
                { label: "Kitchen", value: "Kitchen & 10KW Soapstone Stove" }
            ],
            gallery: oldPetra.gallery || []
        };

        // Construct the new Option C (Grey Estate)
        // Combine ALL images from all 3 live units
        const combinedOptionCImages = [...new Set([...(oldOneiro.gallery || []), ...(oldOmorfi.gallery || []), ...(oldPetra.gallery || [])])];
        const newOptionC = {
            id: "grey-estate",
            name: "Grey Estate",
            subtitle: "The Ultimate Sanctuary",
            description: "The complete 3000m² private estate experience. Includes Villa Oneiro, the Omorfi Suite, and Villa Pétra. Exclusive access to the main saltwater pool, outdoor pizza oven, multiple terraces, and the private plunge pool down at Pétra.",
            image: oldOneiro.image || "/VILLA_ONEIRO/image.png",
            specs: [
                { label: "Space", value: "250m² Total Living Space" },
                { label: "Bedrooms", value: "4 Bedrooms" },
                { label: "Baths", value: "4.5 Baths" },
                { label: "Amenities", value: "Main Pool, Plunge Pool, Pizza Oven" }
            ],
            gallery: combinedOptionCImages
        };

        const newPackages = [newOptionA, newOptionB, newOptionC];

        // Backup the live data locally just in case
        fs.writeFileSync(path.join(process.cwd(), 'villas_backup_live.json'), JSON.stringify(liveData, null, 2));
        console.log("💾 Saved a backup of the old live data to villas_backup_live.json");

        // Write the new structure to Firestore
        await docRef.set({ data: newPackages });
        console.log("🚀 Successfully uploaded the new merged packages to Firestore!");

        // Also update local src/data/villas.json so local matches live perfectly
        fs.writeFileSync(path.join(process.cwd(), "src", "data", "villas.json"), JSON.stringify(newPackages, null, 2));
        console.log("💻 Synced local src/data/villas.json with the new structure.");

        console.log("✨ Migration complete! You can now safely push the code to live without losing your images.");

    } catch (error) {
        console.error("❌ Migration failed:", error);
    }
}

migrateDatabase();
