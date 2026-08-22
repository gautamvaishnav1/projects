import type { CityJSON, BuildingNode, Kind, FunctionNode } from "../types";

const B = (
  id: string,
  name: string,
  kind: Kind,
  loc: number,
  health: BuildingNode["health"] = "ok",
  functions: FunctionNode[] = [],
): BuildingNode => ({ id, name, kind, loc, health, functions });

export const SAMPLE_CITY: CityJSON = {
  project: { name: "ShopSphere — MERN Ecommerce", stack: "MERN" },
  districts: [
    {
      id: "fe-auth", name: "Authentication", stack: "frontend", buildings: [
        B("fe-login", "Login.jsx", "page", 120, "ok", [
          { name: "login", args: "email, password", returns: "AuthResult", purpose: "validates credentials and starts the auth request" },
          { name: "validateUser", args: "email, password", returns: "boolean", purpose: "checks format of credentials" },
        ]),
        B("fe-signup", "Signup.jsx", "page", 140),
        B("fe-authctx", "AuthContext.jsx", "context", 90, "ok", [
          { name: "createSession", args: "token", returns: "void", purpose: "stores token and hydrates user state" },
        ]),
      ],
    },
    {
      id: "fe-cart", name: "Cart", stack: "frontend", buildings: [
        B("fe-cart", "Cart.jsx", "page", 110),
        B("fe-cartctx", "CartContext.jsx", "context", 70),
      ],
    },
    {
      id: "fe-pay", name: "Payment", stack: "frontend", buildings: [B("fe-payment", "Payment.jsx", "page", 160, "warn")],
    },
    {
      id: "fe-prod", name: "Products", stack: "frontend", buildings: [
        B("fe-prodlist", "ProductList.jsx", "page", 95),
        B("fe-prodcard", "ProductCard.jsx", "component", 60),
      ],
    },
    {
      id: "fe-prof", name: "Profile", stack: "frontend", buildings: [B("fe-profile", "Profile.jsx", "page", 85)],
    },
    {
      id: "be-routes", name: "Routes", stack: "backend", buildings: [
        B("be-authroute", "authRoutes.js", "route", 60),
        B("be-cartroute", "cartRoutes.js", "route", 50),
        B("be-payroute", "paymentRoutes.js", "route", 55),
      ],
    },
    {
      id: "be-ctrl", name: "Controllers", stack: "backend", buildings: [
        B("be-authctrl", "authController.js", "controller", 130),
        B("be-cartctrl", "cartController.js", "controller", 90),
        B("be-payctrl", "paymentController.js", "controller", 150, "error"),
      ],
    },
    {
      id: "be-svc", name: "Services", stack: "backend", buildings: [
        B("be-authsvc", "authService.js", "service", 110, "ok", [
          { name: "createToken", args: "user", returns: "JWT", purpose: "signs a JWT for the authenticated user" },
        ]),
        B("be-paysvc", "paymentService.js", "service", 140, "warn"),
      ],
    },
    {
      id: "be-mw", name: "Middleware", stack: "backend", buildings: [
        B("be-authmw", "authMiddleware.js", "middleware", 45),
        B("be-errmw", "errorMiddleware.js", "middleware", 40),
      ],
    },
    {
      id: "db-stores", name: "Data Stores", stack: "database", buildings: [
        B("db-users", "users", "model", 80),
        B("db-products", "products", "model", 70),
        B("db-carts", "carts", "model", 60),
        B("db-orders", "orders", "model", 75),
        B("db-payments", "payments", "model", 65),
      ],
    },
    {
      id: "ext", name: "External Services", stack: "external", buildings: [
        B("ext-stripe", "Stripe API", "api", 50),
        B("ext-email", "Email Service", "api", 40),
      ],
    },
  ],
  edges: [
    { from: "fe-login", to: "be-authroute", kind: "http" },
    { from: "fe-payment", to: "be-payroute", kind: "http" },
    { from: "fe-cart", to: "be-cartroute", kind: "http" },
    { from: "fe-authctx", to: "fe-login", kind: "import" },
    { from: "be-authroute", to: "be-authctrl", kind: "import" },
    { from: "be-payroute", to: "be-payctrl", kind: "import" },
    { from: "be-cartroute", to: "be-cartctrl", kind: "import" },
    { from: "be-authctrl", to: "be-authsvc", kind: "import" },
    { from: "be-payctrl", to: "be-paysvc", kind: "import" },
    { from: "be-authctrl", to: "be-authmw", kind: "import" },
    { from: "be-paysvc", to: "ext-stripe", kind: "http" },
    { from: "be-authsvc", to: "db-users", kind: "query" },
    { from: "be-cartctrl", to: "db-carts", kind: "query" },
    { from: "be-paysvc", to: "db-payments", kind: "query" },
    { from: "be-paysvc", to: "db-orders", kind: "query" },
  ],
  flows: {
    login: ["fe-login", "be-authroute", "be-authctrl", "be-authsvc", "db-users"],
    payment: ["fe-payment", "be-payroute", "be-payctrl", "be-paysvc", "ext-stripe", "db-payments", "db-orders"],
  },
};
