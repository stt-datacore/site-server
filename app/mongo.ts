import * as mongoDB from "mongodb";

export const collections: { 
    profiles?: mongoDB.Collection;
    trackedVoyages?: mongoDB.Collection  
    trackedAssignments?: mongoDB.Collection  
} = {}

require('dotenv').config();

export async function connectToMongo() {
    //
    try {
        const client: mongoDB.MongoClient = new mongoDB.MongoClient(process.env.MONGO_CONN_STRING as string);
        await client.connect();
        
        const db: mongoDB.Db = client.db(process.env.MONGO_DB_NAME);
       
        const profilesCollection: mongoDB.Collection = db.collection(process.env.MONGO_PROFILE_COLLECTION as string);
        const trackedVoyagesCollection: mongoDB.Collection = db.collection(process.env.MONGO_TRACKED_VOYAGES_COLLECTION as string);
        const trackedAssignmentsCollection: mongoDB.Collection = db.collection(process.env.MONGO_TRACKED_ASSIGNMENTS_COLLECTION as string);
    
        collections.profiles = profilesCollection;
        collections.profiles.createIndex("dbid");
        collections.profiles.createIndex("fleet");
        collections.profiles.createIndex("squadron");
    
        collections.trackedVoyages = trackedVoyagesCollection;    
        
        collections.trackedVoyages.createIndex("dbid");
        collections.trackedVoyages.createIndex("trackerId");
        collections.trackedVoyages.createIndex("voyageId");
    
        collections.trackedAssignments = trackedAssignmentsCollection;    
        
        collections.trackedAssignments.createIndex("dbid");
        collections.trackedAssignments.createIndex("crew");
        collections.trackedAssignments.createIndex("trackerId");
    
        console.log(`Successfully connected to MongoDB database: ${db.databaseName}`);  
        Object.values(collections).forEach((col: mongoDB.Collection) => {
            console.log(` - Collection: ${col.collectionName}`);
        });
        
        return true;
    }
    catch(err) {
        console.log("Connection to MongoDB did not succeed!");
        console.log(err);
    }

    return false;

 }