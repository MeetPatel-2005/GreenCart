import React from "react";
import { assets } from "../assets/assets";
import { useAppContext } from "../context/AppContext";

const ProductCard = ({ product }) => {
  const { currency, addToCart, removeFromCart, cartItems, navigate } =
    useAppContext();
  const isOutOfStock = !product?.inStock;

  return (
    product && (
      <div
        onClick={() => {
          navigate(
            `/products/${product.category.toLowerCase()}/${product._id}`,
          );
          scrollTo(0, 0);
        }}
        className="border border-gray-500/20 rounded-md md:px-4 px-3 py-2 bg-white w-full min-w-0"
      >
        <div className="relative group cursor-pointer flex items-center justify-center px-2">
          <img
            className="group-hover:scale-105 transition max-w-26 md:max-w-36"
            src={product.image[0]}
            alt={product.name}
          />
          {isOutOfStock && (
            <>
              <div className="absolute inset-0 bg-white/65 rounded"></div>
              <span className="absolute top-2 left-1/2 -translate-x-1/2 rotate-[-12deg] bg-red-600 text-white text-[10px] md:text-xs font-semibold px-3 py-1 rounded-sm shadow-sm tracking-wide uppercase">
                Out of Stock
              </span>
            </>
          )}
        </div>
        <div className="text-gray-500/60 text-sm">
          <p>{product.category}</p>
          <p className="text-gray-700 font-medium text-lg truncate w-full">
            {product.name}
          </p>
          <div className="flex items-center gap-0.5">
            {Array(5)
              .fill("")
              .map((_, i) => (
                <img
                  key={i}
                  className="md:w-3.5 w3"
                  src={i < 4 ? assets.star_icon : assets.star_dull_icon}
                  alt=""
                />
              ))}
            <p>(4)</p>
          </div>
          <div className="flex items-end justify-between mt-3">
            <p className="md:text-xl text-base font-medium text-primary">
              {currency}
              {product.offerPrice}{" "}
              <span className="text-gray-500/60 md:text-sm text-xs line-through">
                {currency}
                {product.price}
              </span>
            </p>
            <div
              onClick={(e) => {
                e.stopPropagation();
              }}
              className="text-primary"
            >
              {!cartItems[product._id] ? (
                <button
                  className={`flex items-center justify-center gap-1 md:w-[80px] w-[64px] h-[34px] rounded border ${isOutOfStock ? "bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed" : "bg-primary/10 border-primary/40 cursor-pointer"}`}
                  onClick={() => addToCart(product._id)}
                  disabled={isOutOfStock}
                >
                  {!isOutOfStock && (
                    <img src={assets.cart_icon} alt="cart_icon" />
                  )}
                  {isOutOfStock ? "Out" : "Add"}
                </button>
              ) : (
                <div className="flex items-center justify-center gap-2 md:w-20 w-16 h-[34px] bg-primary/25 rounded select-none">
                  <button
                    onClick={() => {
                      removeFromCart(product._id);
                    }}
                    className="cursor-pointer text-md px-2 h-full"
                    disabled={isOutOfStock}
                  >
                    -
                  </button>
                  <span className="w-5 text-center">
                    {cartItems[product._id]}
                  </span>
                  <button
                    onClick={() => {
                      addToCart(product._id);
                    }}
                    className="cursor-pointer text-md px-2 h-full"
                    disabled={isOutOfStock}
                  >
                    +
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  );
};

export default ProductCard;
