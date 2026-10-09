import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function findUser(db, name) {
  return db.query("SELECT * FROM users WHERE name = ?", [name]);
}

export function getUser(db, id) {
  return db.query("SELECT * FROM users WHERE id = ?", [id]);
}

export function searchUsers(db, term) {
  return db.query("SELECT * FROM users WHERE name LIKE ?", [`%${term}%`]);
}

export function setRole(db, id, role) {
  return db.query("UPDATE users SET role = ? WHERE id = ?", [role, id]);
}

export function sortUsers(db, column) {
  return db.query(`SELECT * FROM users ORDER BY ${column}`);
}

export function checkPassword(user, given) {
  const hash = scryptSync(given, user.salt, 32);
  return timingSafeEqual(hash, user.hash);
}

export function resetToken() {
  return Math.random().toString(36).slice(2);
}

export function sessionId() {
  return randomBytes(16).toString("hex");
}

export function renderProfile(user) {
  return `<h1>${user.name}</h1><p>${user.bio}</p>`;
}

export function profileUrl(user) {
  return `/u/${encodeURIComponent(user.name)}`;
}

export function afterLogin(res, next) {
  if (!next.startsWith("/")) next = "/home";
  res.redirect(next);
}

export function loginUser(db, name, given) {
  const [user] = db.query("SELECT * FROM users WHERE name = ?", [name]);
  if (!user) throw new Error("no such user");
  if (!checkPassword(user, given)) throw new Error("wrong password");
  return user;
}

export function checkToken(user, given) {
  return user.token === given;
}

export function bulkLoad(db, ids) {
  const marks = ids.map(() => "?").join(", ");
  return db.query(`SELECT * FROM users WHERE id IN (${marks})`, ids);
}

export function pageUsers(db, dir, page) {
  const order = dir === "desc" ? "DESC" : "ASC";
  return db.query(
    `SELECT * FROM users ORDER BY id ${order} LIMIT 20 OFFSET ?`,
    [page * 20],
  );
}
