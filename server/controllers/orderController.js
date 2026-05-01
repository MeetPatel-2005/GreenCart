import crypto from "crypto";
import Razorpay from "razorpay";
import stripe from "stripe";

import Order from "../models/Order.js";
import Product from "../models/Product.js";
import User from "../models/User.js";

const getRazorpayInstance = () => {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

const validateOrderRequest = async (userId, items, address) => {
  if (!address || items.length === 0) {
    return { success: false, message: "Invalid data" };
  }

  const user = await User.findById(userId).select("isAccountVerified");
  if (!user || !user.isAccountVerified) {
    return {
      success: false,
      message: "Please verify your account before placing an order",
    };
  }

  for (const item of items) {
    const product = await Product.findById(item.product).select(
      "name inStock offerPrice",
    );
    if (!product) {
      return {
        success: false,
        message: "Some products no longer exist. Please refresh your cart.",
      };
    }
    if (!product.inStock) {
      return {
        success: false,
        message: `${product.name} is out of stock.`,
      };
    }
  }

  let amount = await items.reduce(async (acc, item) => {
    const product = await Product.findById(item.product);
    return (await acc) + product.offerPrice * item.quantity;
  }, 0);

  amount += Math.floor(amount * 0.02);

  return { success: true, amount };
};

export const placeOrderCOD = async (req, res) => {
  try {
    const { userId, items, address } = req.body;
    const validation = await validateOrderRequest(userId, items, address);

    if (!validation.success) {
      return res.json(validation);
    }

    await Order.create({
      userId,
      items,
      amount: validation.amount,
      address,
      paymentType: "COD",
      isPaid: false,
    });

    return res.json({ success: true, message: "Order Placed Successfully" });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const placeOrderRazorpay = async (req, res) => {
  let order;

  try {
    const { userId, items, address } = req.body;
    const validation = await validateOrderRequest(userId, items, address);

    if (!validation.success) {
      return res.json(validation);
    }

    order = await Order.create({
      userId,
      items,
      amount: validation.amount,
      address,
      paymentType: "Online",
      isPaid: false,
    });

    const razorpay = getRazorpayInstance();
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(validation.amount * 100),
      currency: "INR",
      receipt: `receipt_${order._id}`,
      notes: {
        orderId: order._id.toString(),
        userId,
      },
    });

    await Order.findByIdAndUpdate(order._id, {
      razorpayOrderId: razorpayOrder.id,
    });

    return res.json({
      success: true,
      keyId: process.env.RAZORPAY_KEY_ID,
      order: razorpayOrder,
      amount: validation.amount,
      currency: "INR",
      orderId: order._id,
    });
  } catch (error) {
    if (order?._id) {
      await Order.findByIdAndDelete(order._id);
    }
    return res.json({ success: false, message: error.message });
  }
};

export const verifyRazorpayPayment = async (req, res) => {
  try {
    const {
      orderId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (
      !orderId ||
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.json({ success: false, message: "Invalid payment data" });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.json({ success: false, message: "Order not found" });
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.json({ success: false, message: "Invalid signature" });
    }

    if (order.razorpayOrderId && order.razorpayOrderId !== razorpay_order_id) {
      return res.json({ success: false, message: "Order id mismatch" });
    }

    if (!order.isPaid) {
      await Order.findByIdAndUpdate(orderId, {
        isPaid: true,
        paymentId: razorpay_payment_id,
        razorpayOrderId: razorpay_order_id,
      });

      await User.findByIdAndUpdate(order.userId, { cartItems: {} });
    }

    return res.json({
      success: true,
      message: "Payment verified successfully",
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const stripeWebhooks = async (request, response) => {
  const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);

  const sig = request.headers["stripe-signature"];
  let event;

  try {
    event = stripeInstance.webhooks.constructEvent(
      request.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (error) {
    return response.status(400).send(`Webhook Error: ${error.message}`);
  }

  switch (event.type) {
    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object;
      const paymentIntentId = paymentIntent.id;

      const session = await stripeInstance.checkout.sessions.list({
        payment_intent: paymentIntentId,
      });

      const { orderId, userId } = session.data[0].metadata;
      await Order.findByIdAndUpdate(orderId, { isPaid: true });
      await User.findByIdAndUpdate(userId, { cartItems: {} });
      break;
    }
    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object;
      const paymentIntentId = paymentIntent.id;

      const session = await stripeInstance.checkout.sessions.list({
        payment_intent: paymentIntentId,
      });

      const { orderId } = session.data[0].metadata;
      await Order.findByIdAndDelete(orderId);
      break;
    }
    default:
      console.error(`Unhandled event type ${event.type}`);
      break;
  }

  response.json({ received: true });
};

export const razorpayWebhooks = async (request, response) => {
  try {
    const secret = process.env.RAZORPAY_KEY_SECRET;
    const signature = request.headers["x-razorpay-signature"];
    const body = request.body;

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    if (!signature || signature !== expectedSignature) {
      return response.status(400).send("Invalid signature");
    }

    const event = JSON.parse(body.toString());

    if (event.event === "payment.captured") {
      const payment = event.payload.payment.entity;
      const paymentId = payment.id;
      const razorpayOrderId = payment.order_id;
      const notes = payment.notes || {};
      const orderId = notes.orderId || null;
      const userId = notes.userId || null;

      if (orderId) {
        await Order.findByIdAndUpdate(orderId, {
          isPaid: true,
          paymentId,
          razorpayOrderId,
        });
      } else if (razorpayOrderId) {
        await Order.findOneAndUpdate(
          { razorpayOrderId },
          { isPaid: true, paymentId, razorpayOrderId },
        );
      }

      if (userId) {
        await User.findByIdAndUpdate(userId, { cartItems: {} });
      }
    }

    if (event.event === "payment.failed") {
      const payment = event.payload.payment.entity;
      const notes = payment.notes || {};
      const orderId = notes.orderId || null;
      const razorpayOrderId = payment.order_id || null;

      if (orderId) {
        await Order.findByIdAndDelete(orderId);
      } else if (razorpayOrderId) {
        await Order.findOneAndDelete({ razorpayOrderId });
      }
    }

    return response.json({ received: true });
  } catch (error) {
    return response
      .status(500)
      .json({ success: false, message: error.message });
  }
};

export const getUserOrders = async (req, res) => {
  try {
    const { userId } = req.body;
    const orders = await Order.find({
      userId,
      $or: [{ paymentType: "COD" }, { isPaid: true }],
    })
      .populate("items.product address")
      .sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      $or: [{ paymentType: "COD" }, { isPaid: true }],
    })
      .populate("items.product address")
      .sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};
