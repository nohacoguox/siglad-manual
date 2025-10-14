import jwt from "jsonwebtoken";

export function signToken(payload, expiresIn = "4h") {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
}

/** Middleware para validar token JWT */
export function requireAuth(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

/** Middleware de roles flexible */
export function requireRole(roles) {
  const required = Array.isArray(roles) ? roles : [roles];
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthenticated" });
    }
    if (!required.includes(req.user.role)) {
      return res.status(403).json({
        error: "Forbidden: insufficient role",
        required,
        current: req.user.role,
      });
    }
    next();
  };
}

/** Genera tokens según tipo de usuario */
export function generateRoleToken(role) {
  const baseUser = {
    sub: role === "ADMIN" ? 1 : role === "AGENTE" ? 2 : 3,
    email:
      role === "ADMIN"
        ? "admin@siglad.local"
        : role === "AGENTE"
        ? "agente@siglad.local"
        : "trans@siglad.local",
    role,
  };
  return signToken(baseUser);
}
