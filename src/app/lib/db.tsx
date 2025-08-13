import mongoose from "mongoose";

interface Connection {
  isConnected?: number;
}

const connection: Connection = {};

async function dbConnect(retries = 3, delay = 5000): Promise<void> {
  if (connection.isConnected) {
    return;
  }

  try {
    const db = await mongoose.connect(process.env.MONGO_URL!);
    connection.isConnected = db.connections[0].readyState;
    console.log("Database connected successfully");
  } catch (error) {
    console.error("Error connecting to the database:", error);
    
    if (retries > 0) {
      console.log(`Retrying connection in ${delay/1000} seconds... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return dbConnect(retries - 1, delay);
    } else {
      console.error("Failed to connect to database after all retries");
      throw error;
    }
  }
}

export default dbConnect;
