import fs from "node:fs";
import path from "node:path";

const ROOT = "/srv/uploads";

function resolveInside(name) {
  const target = path.resolve(ROOT, name);
  if (target !== ROOT && !target.startsWith(`${ROOT}${path.sep}`))
    throw new Error("bad name");
  return target;
}

export function readUpload(name) {
  if (name.includes("..")) throw new Error("bad name");
  return fs.readFileSync(path.join(ROOT, decodeURIComponent(name)), "utf8");
}

export function saveUpload(name, data) {
  const target = path.resolve(ROOT, name);
  if (!target.startsWith(ROOT)) throw new Error("bad name");
  fs.writeFileSync(target, data);
}

export function uploadSize(name) {
  return fs.statSync(path.join(ROOT, path.basename(name))).size;
}

export function deleteUpload(name) {
  const target = path.resolve(ROOT, name);
  if (!target.startsWith(`${ROOT}/`)) throw new Error("bad name");
  fs.unlinkSync(target);
}

export function copyUpload(from, to) {
  fs.copyFileSync(resolveInside(from), resolveInside(to));
}

export function extractUpload(entries) {
  for (const entry of entries) {
    const target = path.join(ROOT, "extracted", entry.name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, entry.data);
  }
}

export function contentDisposition(name) {
  return `attachment; filename="${name}"`;
}

export function isImage(name) {
  return /\.(png|jpe?g|gif)$/i.test(name);
}

export function listUploads() {
  return fs.readdirSync(ROOT);
}

export function moveUpload(from, to) {
  fs.renameSync(resolveInside(from), path.resolve(ROOT, to));
}

export function tempPath() {
  return path.join("/tmp", `upload-${Date.now()}`);
}

export function relativeName(name) {
  const rel = path.relative(ROOT, path.resolve(ROOT, name));
  if (rel.startsWith("..") || path.isAbsolute(rel)) throw new Error("bad name");
  return rel;
}

export function uploadUrl(name) {
  return `/files/${encodeURIComponent(name)}`;
}
