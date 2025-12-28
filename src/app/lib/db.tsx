import mongoose from "mongoose";

// Pre-load models to avoid compilation errors in API routes
import "./../models/Company";
import "./../models/Department";
import "./../models/Employee";
import "./../models/Holiday";
import "./../models/LeaveRequest";
import "./../models/LeaveType";
import "./../models/Payment";
import "./../models/Purchase";
import "./../models/Salary";
import "./../models/TaxConfiguration";
import "./../models/User";

const MONGODB_URI = process.env.MONGO_URL;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGO_URL environment variable inside .env.local");
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Declare global cache to preserve connection across HMR reloading in dev
let cached: MongooseCache = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function dbConnect(retries = 3, delay = 5000): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      // frequently fixes intermittent ENOTFOUND issues in Node environments
      family: 4,
    };

    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
      console.log("Database connected successfully");
      return mongoose;
    }).catch((error) => {
      console.error("Initial DB Connection Error:", error);
      cached!.promise = null; // Reset promise on failure so we can retry
      throw error;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    if (retries > 0) {
      console.log(`Retrying DB connection in ${delay / 1000}s... (${retries} left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return dbConnect(retries - 1, delay);
    }
    throw e;
  }

  return cached.conn;
}

export default dbConnect;
