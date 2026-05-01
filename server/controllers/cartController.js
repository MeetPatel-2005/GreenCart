import User from "../models/User.js";
import Product from "../models/Product.js";

// Update User CartData : /api/cart/update

export const updateCart = async (req, res) => {
  try {
    const { userId, cartItems } = req.body;

    const itemEntries = Object.entries(cartItems || {}).filter(
      ([, quantity]) => Number(quantity) > 0,
    );

    for (const [productId] of itemEntries) {
      const product = await Product.findById(productId).select("inStock");
      if (!product || !product.inStock) {
        return res.json({
          success: false,
          message:
            "One or more items are out of stock. Please refresh your cart.",
        });
      }
    }

    await User.findByIdAndUpdate(userId, { cartItems });
    res.json({ success: true, message: "Cart Updated" });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};
