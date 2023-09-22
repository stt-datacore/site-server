import * as mongoDB from "mongodb";

export const collections: { 
    profiles?: mongoDB.Collection;
    voyageHistory?: mongoDB.Collection  
} = {}

require('dotenv').config();

export async function connectToMongo() {
    const client: mongoDB.MongoClient = new mongoDB.MongoClient(process.env.MONGO_CONN_STRING as string);
    await client.connect();
        
    const db: mongoDB.Db = client.db(process.env.MONGO_DB_NAME);
   
    const profilesCollection: mongoDB.Collection = db.collection(process.env.MONGO_PROFILE_COLLECTION as string);
    const voyageHistoryCollection: mongoDB.Collection = db.collection(process.env.MONGO_VOYAGE_HISTORY_COLLECTION as string);

    collections.profiles = profilesCollection;
    collections.profiles.createIndex("dbid");

    collections.voyageHistory = voyageHistoryCollection;    
    
    collections.voyageHistory.createIndex("dbid");
    collections.voyageHistory.createIndex("tracker_id");
    collections.voyageHistory.createIndex("voyage_id");

    console.log(`Successfully connected to database: ${db.databaseName}`);  
    Object.values(collections).forEach((col: mongoDB.Collection) => {
        console.log(` - Collection: ${col.collectionName}`);
    });
    
    return true;
 }