import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv"; // ✅ Explicit import
dotenv.config(); // ✅ Properly load .env

import connectDB from "./configs/db.js";
import connectCloudinary from "./configs/cloudinary.js";

import userRouter from "./routes/userRoute.js";
import sellerRouter from "./routes/sellerRoute.js";
import productRouter from "./routes/productRoute.js";
import cartRouter from "./routes/cartRoute.js";
import addressRouter from "./routes/addressRoute.js";
import orderRouter from "./routes/orderRoute.js";
import {
  stripeWebhooks,
  razorpayWebhooks,
} from "./controllers/orderController.js";

const app = express();
const port = process.env.PORT || 4000;

await connectDB();
await connectCloudinary();

// CORS setup
const allowedOrigins = (
  process.env.CLIENT_URLS || "https://green-cart-ten-chi.vercel.app/"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.post("/stripe", express.raw({ type: "application/json" }), stripeWebhooks);
app.post(
  "/razorpay",
  express.raw({ type: "application/json" }),
  razorpayWebhooks,
);

// Middlewares
app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: allowedOrigins, credentials: true }));

// Routes
app.get("/", (req, res) => res.send("API is Working"));
app.use("/api/user", userRouter);
app.use("/api/seller", sellerRouter);
app.use("/api/product", productRouter);
app.use("/api/cart", cartRouter);
app.use("/api/address", addressRouter);
app.use("/api/order", orderRouter);

app.listen(port, () => {
  console.log(`✅ Server is running on http://localhost:${port}`);
});
