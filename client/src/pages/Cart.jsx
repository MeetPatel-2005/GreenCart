import { useEffect, useState } from "react";
import { useAppContext } from "../context/AppContext";
import { assets, dummyAddress } from "../assets/assets";
import toast from "react-hot-toast";

const Cart = () => {
  const {
    products,
    currency,
    cartItems,
    removeFromCart,
    getCartCount,
    updateCartItem,
    navigate,
    getCartAmount,
    axios,
    user,
    setCartItems,
  } = useAppContext();
  const [cartArray, setCartArray] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [showAddress, setShowAddress] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [paymentOption, setPaymentOption] = useState("COD");

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const getCart = () => {
    let tempArray = [];
    for (const key in cartItems) {
      const product = products.find((item) => item._id === key);
      if (product) {
        tempArray.push({ ...product, quantity: cartItems[key] });
      }
    }
    setCartArray(tempArray);
  };

  const hasOutOfStockItems = cartArray.some((item) => !item.inStock);
  const isUserVerified = user && user.isAccountVerified;

  const getUserAddress = async () => {
    try {
      const { data } = await axios.get("/api/address/get");
      if (data.success) {
        setAddresses(data.addresses);
        if (data.addresses.length > 0) {
          setSelectedAddress(data.addresses[0]);
        }
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const placeOrder = async () => {
    try {
      if (!isUserVerified) {
        return toast.error("Please verify your account first");
      }

      if (!selectedAddress) {
        return toast.error("Please select an address");
      }

      if (hasOutOfStockItems) {
        return toast.error(
          "Remove out-of-stock items before placing the order",
        );
      }

      const orderItems = cartArray.map((item) => ({
        product: item._id,
        quantity: item.quantity,
      }));

      // Place Order with COD
      if (paymentOption === "COD") {
        const { data } = await axios.post("/api/order/cod", {
          userId: user._id,
          items: orderItems,
          address: selectedAddress._id,
        });

        if (data.success) {
          toast.success(data.message);
          setCartItems({});
          navigate("/my-orders");
        } else {
          toast.error(data.message);
        }
      } else {
        // Place Order with Razorpay
        const { data } = await axios.post("/api/order/razorpay", {
          userId: user._id,
          items: orderItems,
          address: selectedAddress._id,
        });

        if (!data.success) {
          toast.error(data.message);
          return;
        }

        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded || !window.Razorpay) {
          toast.error("Razorpay SDK failed to load");
          return;
        }

        const sanitizedContact = (user?.phone || "9123456789")
          .toString()
          .replace(/\D/g, "")
          .slice(-10);

        const enabledMethods = {
          upi: true,
          card: true,
          netbanking: true,
          wallet: true,
          paylater: true,
        };

        const displayBlocks = {
          sequence: [
            "block.netbanking",
            "block.cards",
            "block.upi",
            "block.wallet",
            "block.paylater",
          ],
          blocks: {
            netbanking: {
              name: "Pay via Netbanking",
              instruments: [{ method: "netbanking" }],
            },
            cards: {
              name: "Pay via Card",
              instruments: [{ method: "card" }],
            },
            upi: {
              name: "Pay via UPI",
              instruments: [{ method: "upi" }],
            },
            wallet: {
              name: "Pay via Wallet",
              instruments: [{ method: "wallet" }],
            },
            paylater: {
              name: "Pay Later",
              instruments: [{ method: "paylater" }],
            },
          },
          preferences: {
            show_default_blocks: true,
          },
        };

        const options = {
          key: data.keyId,
          amount: data.order.amount,
          currency: data.currency,
          name: "GreenCart",
          description: "GreenCart Online Payment",
          order_id: data.order.id,
          prefill: {
            name: user.name,
            email: user.email || "success@razorpay.com",
            contact: sanitizedContact,
          },
          method: enabledMethods,
          config: {
            display: displayBlocks,
          },
          retry: {
            enabled: true,
            max_count: 3,
          },
          notes: {
            purpose: "GreenCart order",
          },
          theme: {
            color: "#16a34a",
          },
          handler: async function (response) {
            const verifyPayload = {
              ...response,
              orderId: data.orderId,
            };

            const verifyResponse = await axios.post(
              "/api/order/razorpay/verify",
              verifyPayload,
            );

            if (verifyResponse.data.success) {
              toast.success("Payment successful");
              setCartItems({});
              navigate("/my-orders");
            } else {
              toast.error(verifyResponse.data.message);
            }
          },
          modal: {
            ondismiss: () => {
              toast.error("Payment cancelled");
            },
          },
        };

        const razorpay = new window.Razorpay(options);
        razorpay.on("payment.failed", function (response) {
          const reason = response?.error?.description || "Payment failed";
          toast.error(reason);
        });
        razorpay.open();
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  useEffect(() => {
    if (products.length > 0 && cartItems) {
      getCart();
    }
  }, [products, cartItems]);

  useEffect(() => {
    if (user) {
      getUserAddress();
    }
  }, [user]);

  return products.length > 0 && cartItems ? (
    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8 xl:gap-12 mt-16">
      <div className="flex-1 min-w-0">
        <h1 className="text-3xl font-medium mb-6">
          Shopping Cart{" "}
          <span className="text-sm text-primary">{getCartCount()} Items</span>
        </h1>

        <div className="grid grid-cols-[2fr_1fr_1fr] text-gray-500 text-base font-medium pb-3">
          <p className="text-left">Product Details</p>
          <p className="text-center">Subtotal</p>
          <p className="text-center">Action</p>
        </div>

        {cartArray.map((product, index) => (
          <div
            key={index}
            className="grid grid-cols-[2fr_1fr_1fr] text-gray-500 items-center text-sm md:text-base font-medium pt-3"
          >
            <div className="flex items-center md:gap-6 gap-3">
              <div
                onClick={() => {
                  navigate(
                    `/products/${product.category.toLowerCase()}/${product._id}`,
                  );
                  scrollTo(0, 0);
                }}
                className="cursor-pointer w-24 h-24 flex items-center justify-center border border-gray-300 rounded"
              >
                <img
                  className="max-w-full h-full object-cover"
                  src={product.image[0]}
                  alt={product.name}
                />
              </div>
              <div>
                <p className="hidden md:block font-semibold">{product.name}</p>
                <div className="font-normal text-gray-500/70">
                  <p>
                    Weight: <span>{product.weight || "N/A"}</span>
                  </p>
                  {!product.inStock && (
                    <p className="text-red-600 font-medium">Out of Stock</p>
                  )}
                  <div className="flex items-center">
                    <p>Qty:</p>
                    <select
                      onChange={(e) =>
                        updateCartItem(product._id, Number(e.target.value))
                      }
                      value={cartItems[product._id]}
                      className="outline-none"
                      disabled={!product.inStock}
                    >
                      {Array(
                        cartItems[product._id] > 9 ? cartItems[product._id] : 9,
                      )
                        .fill("")
                        .map((_, index) => (
                          <option key={index} value={index + 1}>
                            {index + 1}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-center">
              {currency}
              {product.offerPrice * product.quantity}
            </p>
            <button
              onClick={() => removeFromCart(product._id)}
              className="cursor-pointer mx-auto"
            >
              <img
                src={assets.remove_icon}
                alt="remove"
                className="inline-block w-6 h-6"
              />
            </button>
          </div>
        ))}

        <button
          onClick={() => {
            navigate("/products");
            scrollTo(0, 0);
          }}
          className="group cursor-pointer flex items-center mt-8 gap-2 text-primary font-medium"
        >
          <img
            className="group-hover:-translate-x-1 transition"
            src={assets.arrow_right_icon_colored}
            alt="arrow"
          />
          Continue Shopping
        </button>
      </div>

      <div className="w-full md:w-[360px] md:flex-shrink-0 bg-gray-100/40 p-5 max-md:mt-16 border border-gray-300/70">
        <h2 className="text-xl md:text-xl font-medium">Order Summary</h2>
        <hr className="border-gray-300 my-5" />

        <div className="mb-6">
          <p className="text-sm font-medium uppercase">Delivery Address</p>
          <div className="relative flex justify-between items-start mt-2">
            <p className="text-gray-500">
              {selectedAddress
                ? `${selectedAddress.street}, ${selectedAddress.city}, ${selectedAddress.state}, ${selectedAddress.country}`
                : "No address found"}
            </p>
            <button
              onClick={() => setShowAddress(!showAddress)}
              className="text-primary hover:underline cursor-pointer"
            >
              Change
            </button>
            {showAddress && (
              <div className="absolute top-12 py-1 bg-white border border-gray-300 text-sm w-full">
                {addresses.map((address, index) => (
                  <p
                    onClick={() => {
                      setSelectedAddress(address);
                      setShowAddress(false);
                    }}
                    className="text-gray-500 p-2 hover:bg-gray-100"
                  >
                    {address.street}, {address.city}, {address.state},{" "}
                    {address.country}
                  </p>
                ))}
                <p
                  onClick={() => navigate("/add-address")}
                  className="text-primary text-center cursor-pointer p-2 hover:bg-primary/10"
                >
                  Add address
                </p>
              </div>
            )}
          </div>

          <p className="text-sm font-medium uppercase mt-6">Payment Method</p>

          <select
            onChange={(e) => setPaymentOption(e.target.value)}
            className="w-full border border-gray-300 bg-white px-3 py-2 mt-2 outline-none"
          >
            <option value="COD">Cash On Delivery</option>
            <option value="Online">Online Payment</option>
          </select>
        </div>

        <hr className="border-gray-300" />

        <div className="text-gray-500 mt-4 space-y-2">
          <p className="flex justify-between">
            <span>Price</span>
            <span>
              {currency}
              {getCartAmount()}
            </span>
          </p>
          <p className="flex justify-between">
            <span>Shipping Fee</span>
            <span className="text-green-600">Free</span>
          </p>
          <p className="flex justify-between">
            <span>Tax (2%)</span>
            <span>
              {currency}
              {(getCartAmount() * 2) / 100}
            </span>
          </p>
          <p className="flex justify-between text-lg font-medium mt-3">
            <span>Total Amount:</span>
            <span>
              {currency}
              {getCartAmount() + (getCartAmount() * 2) / 100}
            </span>
          </p>
        </div>

        {hasOutOfStockItems && (
          <p className="text-sm text-red-600 mt-4">
            Some items are out of stock. Remove them to continue.
          </p>
        )}

        {!isUserVerified && (
          <p className="text-sm text-red-600 mt-4">
            Please verify your email to place an order.{" "}
            <button
              onClick={() => navigate("/verify-email")}
              className="text-primary hover:underline font-medium"
            >
              Verify now
            </button>
          </p>
        )}

        <button
          onClick={placeOrder}
          disabled={hasOutOfStockItems || !isUserVerified}
          className={`w-full py-3 mt-6 font-medium transition ${hasOutOfStockItems || !isUserVerified ? "bg-gray-300 text-white cursor-not-allowed" : "cursor-pointer bg-primary text-white hover:bg-primary-dull"}`}
        >
          {paymentOption === "COD" ? "Place Order" : "Proceed to Checkout"}
        </button>
      </div>
    </div>
  ) : null;
};

export default Cart;
