import "server-only"

import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

// Initialize postgres connection
const connectionString = process.env.POSTGRES_URL
if (!connectionString) throw new Error("POSTGRES_URL is not set")

// For queries
const queryClient = postgres(connectionString)
const db = drizzle(queryClient)

export { db, queryClient }
