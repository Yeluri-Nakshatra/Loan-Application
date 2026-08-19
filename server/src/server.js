require("dotenv").config();

const express = require("express");
const cors = require("cors");

const supertokens = require("supertokens-node");
const { middleware, errorHandler } = require("supertokens-node/framework/express");

const connectDB = require("./config/db");

// SuperTokens configuration
require("./config/supertokens");

const authRoutes = require("./routes/authRoutes");
const kycRoutes = require("./routes/kycRoutes");
const eligibilityRoutes = require("./routes/eligibilityRoutes");
const applicationRoutes = require("./routes/applicationRoutes");

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// SuperTokens middleware
app.use(middleware());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/kyc", kycRoutes);
app.use("/api/eligibility", eligibilityRoutes);
app.use("/api/application", applicationRoutes);

// SuperTokens error handler
app.use(errorHandler());

connectDB();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});