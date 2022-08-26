/*!
 * is-plain-object <https://github.com/jonschlinkert/is-plain-object>
 *
 * Copyright (c) 2014-2017, Jon Schlinkert.
 * Released under the MIT License.
 */

export function isPlainObject(o: unknown): boolean {
  if (o === null || o === undefined) return false;

  if (!isObject(o)) return false;

  // If has modified constructor
  const ctor = (o as any).constructor;
  if (ctor === undefined) return true;

  // If has modified prototype
  if (!isObject(ctor.prototype)) return false;

  // If constructor does not have an Object-specific method
  if (!ctor.prototype.hasOwnProperty("isPrototypeOf")) return false;

  // Most likely a plain Object
  return true;
}

function isObject(o: unknown): boolean {
  return Object.prototype.toString.call(o) === "[object Object]";
}
