import * as mongoDB from "mongodb";

export const collections: { profiles?: mongoDB.Collection } = {}

require('dotenv').config();

export async function connectToMongo () {
    const client: mongoDB.MongoClient = new mongoDB.MongoClient(process.env.MONGO_CONN_STRING as string);
    await client.connect();
        
    const db: mongoDB.Db = client.db(process.env.DB_NAME);
   
    const profilesCollection: mongoDB.Collection = db.collection(process.env.MONGO_PROFILE_COLLECTION as string);
    collections.profiles = profilesCollection;
    collections.profiles.createIndex("dbid")
    console.log(`Successfully connected to database: ${db.databaseName} and collection: ${profilesCollection.collectionName}`);
 }