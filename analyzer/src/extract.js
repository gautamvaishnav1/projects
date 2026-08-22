import _traverse from "@babel/traverse";
const traverse = _traverse.default ?? _traverse;

const SDK_MAP = {
  stripe: "Stripe API",
  razorpay: "Razorpay API",
  braintree: "Braintree API",
  twilio: "Twilio API",
  nodemailer: "Email Service",
  sendgrid: "SendGrid Email",
  mailgun: "Mailgun Email",
  "firebase-admin": "Firebase",
  firebase: "Firebase",
  "aws-sdk": "AWS SDK",
  "@aws-sdk": "AWS SDK",
  openai: "OpenAI API",
  cloudinary: "Cloudinary",
  s3: "S3 Storage",
};

const HTTP_METHODS = new Set(["get", "post", "put", "patch", "delete", "all"]);

function paramText(p) {
  if (!p) return "";
  switch (p.type) {
    case "Identifier": return p.name;
    case "RestElement": return `...${paramText(p.argument)}`;
    case "AssignmentPattern": return `${paramText(p.left)}=`;
    case "ObjectPattern": {
      const keys = p.properties.map((pr) => (pr.key ? pr.key.name || pr.key.value : "...")).filter(Boolean);
      return `{ ${keys.join(", ")} }`;
    }
    case "ArrayPattern": return "[ ]";
    case "TSParameterProperty": return paramText(p.parameter);
    default: return "arg";
  }
}

function collectReturns(fnNode) {
  const out = [];
  const walk = (n) => {
    if (!n || typeof n.type !== "string") return;
    if (/Function(Declaration|Expression|ArrowFunctionExpression)/.test(n.type) && n !== fnNode) return;
    if (n.type === "ReturnStatement") out.push(n.argument);
    for (const k of Object.keys(n)) {
      if (k === "loc" || k === "leadingComments" || k === "trailingComments" || k === "extra") continue;
      const v = n[k];
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === "object") walk(v);
    }
  };
  walk(fnNode.body);
  return out;
}

function inferReturn(node, async) {
  const wrap = (t) => (async ? `Promise<${t}>` : t);
  if (!node) return wrap("void");
  switch (node.type) {
    case "JSXElement":
    case "JSXFragment": return wrap("JSX");
    case "BooleanLiteral": return wrap("boolean");
    case "NumericLiteral": return wrap("number");
    case "StringLiteral":
    case "TemplateLiteral": return wrap("string");
    case "ObjectExpression": return wrap("object");
    case "ArrayExpression": return wrap("array");
    case "CallExpression": {
      const c = node.callee;
      let prop = null;
      if (c.type === "MemberExpression" && !c.computed) prop = c.property.name;
      else if (c.type === "Identifier") prop = c.name;
      if (prop === "json") return "JSON response";
      if (prop === "render") return "rendered view";
      if (prop === "send" || prop === "sendFile") return "response";
      if (prop === "status") return "HTTP response";
      if (prop === "next") return "void";
      return prop ? `${prop}()` : wrap("value");
    }
    case "AwaitExpression": return inferReturn(node.argument, false);
    case "Identifier": return wrap(node.name);
    default: return wrap("value");
  }
}

const VERBS = [
  [/^(get|fetch|load|find|list)/i, "retrieves data"],
  [/^(create|add|post|save|insert|register|signup)/i, "creates a new record"],
  [/^(update|edit|patch|put)/i, "updates existing data"],
  [/^(delete|remove|destroy)/i, "removes data"],
  [/^(login|signin)/i, "authenticates credentials and starts a session"],
  [/^logout/i, "ends the user session"],
  [/validat|^check/i, "checks that the input is valid"],
  [/^render/i, "renders the UI"],
  [/^handle|^on[A-Z]/, "handles its event or request"],
  [/calc|sum|total|count/i, "computes a value"],
  [/hash|encrypt|sign/i, "secures data"],
];

function makePurpose(name, leading) {
  const comment = (leading || []).find((c) => (c.value || "").trim().length > 3);
  if (comment) {
    const line = comment.value
      .split("\n").map((l) => l.replace(/^\s*[/*]+\s?/, "").trim())
      .find((l) => l && !l.startsWith("@"));
    if (line) return line;
  }
  if (!name) return "";
  for (const [re, purpose] of VERBS) if (re.test(name)) return purpose;
  return `implements ${name}`;
}

/** Extract structural facts from one source file. */
export function extractFacts(code) {
  const facts = {
    imports: [],          // { source, names[] }
    mounts: [],           // { prefix, localName }   app.use("/api/x", thingRouter)
    routes: [],           // { method, path }
    functions: [],        // { name, args, returns, purpose, line }
    modelNames: [],
    schemaFields: [],
    httpCalls: [],
    sdkImports: [],
    hasJSX: false,
    hasCreateContext: false,
    usesExpress: false,
    usesMongoose: false,
    exportCount: 0,
    parseError: null,
  };

  let ast;
  try {
    // lazy import keeps parse errors isolated
    ast = require0(code);
  } catch (e) {
    facts.parseError = e.message;
    return facts;
  }

  traverse(ast, {
    ImportDeclaration(p) {
      const src = p.node.source?.value ?? "";
      const names = p.node.specifiers.map((s) => s.local?.name).filter(Boolean);
      facts.imports.push({ source: String(src), names });
      const base = src.split("/")[0].startsWith("@") ? src.split("/").slice(0, 2).join("/") : src.split("/")[0];
      if (SDK_MAP[base]) facts.sdkImports.push(SDK_MAP[base]);
      if (base === "express") facts.usesExpress = true;
      if (base === "mongoose") facts.usesMongoose = true;
    },
    CallExpression(p) {
      const n = p.node;
      const callee = n.callee;

      // require("x")
      if (callee.type === "Identifier" && callee.name === "require" && n.arguments[0]?.value) {
        const src = String(n.arguments[0].value);
        const base = src.split("/")[0].startsWith("@") ? src.split("/").slice(0, 2).join("/") : src.split("/")[0];
        facts.imports.push({ source: src, names: [] });
        if (SDK_MAP[base]) facts.sdkImports.push(SDK_MAP[base]);
        if (base === "express") facts.usesExpress = true;
        if (base === "mongoose") facts.usesMongoose = true;
      }

      // app.get("/path"), router.post(...)
      if (
        callee.type === "MemberExpression" && !callee.computed &&
        callee.object.type === "Identifier" &&
        /^(app|router|api|server)$/i.test(callee.object.name) &&
        HTTP_METHODS.has(callee.property.name) &&
        n.arguments[0]?.type === "StringLiteral"
      ) {
        const method = callee.property.name.toLowerCase();
        facts.routes.push({ method: method === "all" ? "use" : method, path: n.arguments[0].value });
      }

      // router.route("/x").get(handler)
      if (
        callee.type === "MemberExpression" && !callee.computed &&
        HTTP_METHODS.has(callee.property.name) &&
        callee.object.type === "CallExpression" &&
        callee.object.callee?.property?.name === "route" &&
        callee.object.arguments[0]?.type === "StringLiteral"
      ) {
        facts.routes.push({
          method: callee.property.name.toLowerCase(),
          path: callee.object.arguments[0].value,
        });
      }

      // app.use("/api/users", usersRouter) — mount detection
      if (
        callee.type === "MemberExpression" && !callee.computed &&
        callee.object.type === "Identifier" && /^(app|server)$/i.test(callee.object.name) &&
        callee.property.name === "use" && n.arguments.length >= 1 &&
        n.arguments[0]?.type === "StringLiteral" && n.arguments[1]?.type === "Identifier"
      ) {
        facts.mounts.push({ prefix: n.arguments[0].value, localName: n.arguments[1].name });
      }

      // mongoose.model("User", ...) / model("User")
      if (
        callee.type === "MemberExpression" && !callee.computed &&
        callee.property.name === "model" &&
        ((callee.object.type === "Identifier" && callee.object.name === "mongoose") ||
         (callee.object.type === "MemberExpression" && callee.object.object?.name === "mongoose")) &&
        n.arguments[0]?.type === "StringLiteral"
      ) {
        facts.modelNames.push(n.arguments[0].value);
      }

      // new Schema({ fieldA, fieldB })
      if (n.callee.type === "Identifier" && n.callee.name === "Schema") {
        const body = n.arguments[0];
        if (body?.type === "ObjectExpression") {
          body.properties.forEach((pr) => {
            if (pr.type === "ObjectProperty" && pr.key) facts.schemaFields.push(String(pr.key.name ?? pr.key.value));
          });
        }
      }

      // fetch("...") / axios.get("...")
      if (callee.type === "Identifier" && callee.name === "fetch" && n.arguments[0]?.type === "StringLiteral") {
        facts.httpCalls.push(n.arguments[0].value);
      }
      if (
        callee.type === "MemberExpression" && !callee.computed &&
        callee.object.type === "Identifier" && callee.object.name.startsWith("axios") &&
        n.arguments[0]?.type === "StringLiteral"
      ) {
        facts.httpCalls.push(n.arguments[0].value);
      }

      // createContext(...)
      if (callee.type === "Identifier" && /^createContext/.test(callee.name)) {
        facts.hasCreateContext = true;
      }
    },
    FunctionDeclaration(p) {
      const fn = p.node;
      if (!fn.id) return;
      pushFn(facts, fn.id.name, fn.params, fn.async, fn.body, fn.leadingComments, fn.loc?.start?.line);
    },
    VariableDeclarator(p) {
      const d = p.node;
      if (!d.id?.name) return;
      if (d.init && /Function(Declaration|Expression)$|ArrowFunctionExpression/.test(d.init.type)) {
        pushFn(facts, d.id.name, d.init.params, !!d.init.async, d.init.body, d.leadingComments ?? p.node.leadingComments, d.loc?.start?.line);
      }
    },
    "ClassMethod|ObjectMethod"(p) {
      const m = p.node;
      if (!m.key || typeof m.key.name !== "string") return;
      if (m.kind !== "method") return; // skip constructors/getters
      pushFn(facts, m.key.name, m.params, !!m.async, m.body, m.leadingComments, m.loc?.start?.line);
    },
    JSXElement() { facts.hasJSX = true; },
    ExportDefaultDeclaration() { facts.exportCount++; },
    ExportNamedDeclaration() { facts.exportCount++; },
  });

  facts.sdkImports = [...new Set(facts.sdkImports)];
  return facts;
}

function pushFn(facts, name, params, isAsync, body, leading, line) {
  const args = (params || []).map(paramText).filter(Boolean).join(", ");
  const rets = collectReturns({ type: "FunctionDeclaration", body });
  const returns = rets.length ? [...new Set(rets.map((r) => inferReturn(r, isAsync)))].slice(0, 3).join(" | ") : (isAsync ? "Promise<void>" : "void");
  facts.functions.push({ name, args, returns, purpose: makePurpose(name, leading), line: line ?? 0 });
}

// tiny shim so parse errors surface through try/catch in extractFacts
import { parseCode } from "./parse.js";
function require0(code) {
  return parseCode(code);
}
