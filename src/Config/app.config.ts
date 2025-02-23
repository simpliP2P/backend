export default () => ({
  env: process.env.NODE_ENV || "development",
  isAppInProduction: process.env.NODE_ENV === "production",
  branchName: process.env.BRANCH_NAME,
  port: process.env.PORT,
  database: {
    host: process.env.PG_HOST,
    port: parseInt(process.env.PG_PORT || "5432", 10),
    username: process.env.PG_USERNAME,
    password: process.env.PG_PASSWORD,
    name: process.env.PG_DBNAME,
  },
  tokenSecrets: {
    accessToken: {
      secret: process.env.ACCESS_TOKEN_SECRET || "hgjfj",
      expiresIn: "500h",
    },
    resetToken: { secret: process.env.RESET_TOKEN_SECRET, expiresIn: "6h" },
    verificationToken: {
      secret: process.env.VERIFICATION_TOKEN_SECRET,
      expiresIn: "6h",
    },
    newsletterSubscription: {
      secret: process.env.NEWSLETTER_SUBSCRIPTION_SECRET,
      expiresIn: "24h",
    },
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN,
  },
  brevo: {
    apiKey: process.env.BREVO_API_KEY,
    email: "adamsakorede5@gmail.com",
  },
  clients: {
    staging: {
      landingPage: "http://localhost:3000",
    },
    production: {
      landingPage: "https://simplip2p.vercel.app",
    },
  },
  oauth: {
    google: {
      clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      redirectUrl: {
        stagingLink: "http://localhost:3000/auth/google/callback",
        productionLink: "https://simplip2p.vercel.app/auth/google/callback",
      },
    },
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  },
  aws: {
    region: process.env.AWS_REGION || "us-east-1",
    bucketName: process.env.AWS_S3_BUCKET_NAME,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD,
  },
});
