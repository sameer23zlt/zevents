// Environment variable type declarations for Zevents

declare namespace NodeJS {
  interface ProcessEnv {
    /** MongoDB Atlas connection string */
    MONGODB_URI: string;
    /** MongoDB database name */
    MONGODB_DB: string;
    /** Secret key used to sign/verify JWTs */
    JWT_SECRET: string;
    /** Fixed admin username stored in configuration */
    ADMIN_USERNAME: string;
    /** Fixed admin password stored in configuration */
    ADMIN_PASSWORD: string;
    /** Next.js environment */
    NODE_ENV: "development" | "production" | "test";
  }
}
