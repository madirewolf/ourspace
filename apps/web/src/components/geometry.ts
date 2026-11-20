import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Helpers for building rooms out of merged primitives: every piece that shares
 * a material is baked into one geometry, so a whole wall is one draw call.
 */

export type Vec3 = [number, number, number];

/** Apply a local transform (and optionally a parent one) to a geometry. */
export function place(
  geometry: THREE.BufferGeometry,
  position: Vec3,
  rotation: Vec3 = [0, 0, 0],
  parent?: THREE.Matrix4,
): THREE.BufferGeometry {
  const matrix = new THREE.Matrix4()
    .makeRotationFromEuler(new THREE.Euler(...rotation))
    .setPosition(...position);
  if (parent) matrix.premultiply(parent);
  geometry.applyMatrix4(matrix);
  return geometry;
}

/** A plane whose UVs count tiles (one per `tileW` × `tileH` metres). */
export function tiledPlane(
  width: number,
  height: number,
  tileW: number,
  tileH: number,
  position: Vec3,
  rotation: Vec3 = [0, 0, 0],
): THREE.BufferGeometry {
  const geometry = new THREE.PlaneGeometry(width, height);
  const uv = geometry.getAttribute("uv");
  for (let index = 0; index < uv.count; index++) {
    uv.setXY(index, (uv.getX(index) * width) / tileW, (uv.getY(index) * height) / tileH);
  }
  return place(geometry, position, rotation);
}

/** A plane showing one cell of a texture atlas (u0..u1 × v0..v1). */
export function atlasPlane(
  width: number,
  height: number,
  [u0, v0, u1, v1]: [number, number, number, number],
  position: Vec3,
  rotation: Vec3 = [0, 0, 0],
): THREE.BufferGeometry {
  const geometry = new THREE.PlaneGeometry(width, height);
  const uv = geometry.getAttribute("uv");
  for (let index = 0; index < uv.count; index++) {
    uv.setXY(index, u0 + uv.getX(index) * (u1 - u0), v0 + uv.getY(index) * (v1 - v0));
  }
  return place(geometry, position, rotation);
}

export function box(
  size: Vec3,
  position: Vec3,
  rotation: Vec3 = [0, 0, 0],
  parent?: THREE.Matrix4,
) {
  return place(new THREE.BoxGeometry(...size), position, rotation, parent);
}

/** Merge same-material pieces into one draw call. */
export function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = mergeGeometries(parts) ?? new THREE.BufferGeometry();
  for (const part of parts) part.dispose();
  return merged;
}

/** Polyhedra come non-indexed; merging needs every part the same. */
export function unindexed(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  if (!geometry.index) return geometry;
  const flat = geometry.toNonIndexed();
  geometry.dispose();
  return flat;
}

/** Give every vertex of a geometry one colour (for vertex-coloured merges). */
export function tint(geometry: THREE.BufferGeometry, color: THREE.ColorRepresentation) {
  const value = new THREE.Color(color);
  const count = geometry.getAttribute("position").count;
  const colors = new Float32Array(count * 3);
  for (let index = 0; index < count; index++) {
    colors[index * 3] = value.r;
    colors[index * 3 + 1] = value.g;
    colors[index * 3 + 2] = value.b;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geometry;
}
