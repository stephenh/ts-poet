import { SymbolReferenceTracker } from "./SymbolReferenceContainer";
import { SymbolSpec } from "./SymbolSpecs";

/**
 * Name of any possible type that can be referenced.
 */
export abstract class TypeName {
  /**
   * Produces a string representation of the type name
   * in TypeScript syntax.
   *
   * @param trackedBy An optional symbol tracker that is notified of each symbol used
   * @return String type representation in TypeScript syntax
   */
  public abstract reference(trackedBy?: SymbolReferenceTracker): string;
}

export class Any extends TypeName {
  constructor(public usage: string, public imported?: SymbolSpec) {
    super();
  }

  public reference(trackedBy?: SymbolReferenceTracker): string {
    if (this.imported) {
      this.imported.reference(trackedBy);
    }
    return this.usage;
  }
}

export class Parameterized extends TypeName {
  constructor(public name: TypeName, public typeArgs: TypeName[]) {
    super();
  }

  public reference(trackedBy?: SymbolReferenceTracker): string {
    const name = this.name.reference(trackedBy);
    const typeArgs = this.typeArgs.map(it => it.reference(trackedBy));
    return `${name}<${typeArgs.join(", ")}>`;
  }
}

export enum Combiner {
  UNION = "|", INTERSECT = "&"
}

export enum BoundModifier {
  KEY_OF = "keyof"
}

export class Bound {
  constructor(
    public type: TypeName,
    public combiner: Combiner = Combiner.UNION,
    public modifier?: BoundModifier) {
  }
}

export class TypeVariable extends TypeName {
  constructor(public name: string, public bounds: Bound[]) {
    super();
  }

  public reference(trackedBy?: SymbolReferenceTracker): string {
    return this.name;
  }
}

export class Member {
  constructor(public name: string, public type: TypeName, public optional: boolean) {
  }
}

export class Anonymous extends TypeName {
  constructor(public members: Member[]) {
    super();
  }

  public reference(trackedBy?: SymbolReferenceTracker): string {
    const entries = this.members.map(it => {
      const name = it.name;
      const opt = (it.optional) ? "?" : "";
      const type = it.type.reference(trackedBy);
      return `${name}${opt}: ${type}`;
    }).join(", ");
    return `{ ${entries} }`;
  }
}

class Tuple extends TypeName {
  constructor(public memberTypes: TypeName[]) {
    super();
  }

  public reference(trackedBy?: SymbolReferenceTracker): string {
    const typeRequirements = this.memberTypes.map(it => {
      it.reference(trackedBy);
    });
    return `[${typeRequirements.join(", ")}]`;
  }
}

class Intersection extends TypeName {
  constructor(public typeRequirements: TypeName[]) {
    super();
  }

  public reference(trackedBy?: SymbolReferenceTracker): string {
    return this.typeRequirements.map(it => it.reference(trackedBy)).join(" & ");
  }
}

class Union extends TypeName {
  constructor(public typeChoices: TypeName[]) {
    super();
  }

  public reference(trackedBy?: SymbolReferenceTracker): string {
    return this.typeChoices.map(it => it.reference(trackedBy)).join(" | ");
  }
}

export class Lambda extends TypeName {
  constructor(
    public parameters: Map<string, TypeName> = new Map(),
    public returnType: TypeName = VOID) {
    super();
  }

  public reference(trackedBy?: SymbolReferenceTracker): string {
    const params: string[] = [];
    this.parameters.forEach((value, key) => {
      params.push(`${key}: ${value.reference(trackedBy)}`);
    })
    return `(${params.join(", ")}) => ${this.returnType.reference(trackedBy)}`;
  }
}

export const NULL = anyType("null");
export const UNDEFINED = anyType("undefined");
export const NEVER = anyType("never");
export const VOID = anyType("void");
export const ANY = anyType("any");
export const BOOLEAN = anyType("boolean");
export const NUMBER = anyType("number");
export const STRING = anyType("string");
export const OBJECT = anyType("Object");
export const DATE = anyType("Date");
export const ARRAY = anyType("Array");
export const SET = anyType("Set");
export const MAP = anyType("Map");
export const BUFFER = anyType("Buffer");
export const ARRAY_BUFFER = anyType("ArrayBuffer");

/**
 * An imported type name
 *
 * @param spec Import spec for type name
 */
export function importedType(spec: string): Any {
  const symbolSpec = SymbolSpec.from(spec);
  return anyType(symbolSpec.value, symbolSpec);
}

/**
 * Any class/enum/primitive/etc type name
 *
 * @param name Name for the type, will be symbolized
 */
export function anyType(name: string, imported?: SymbolSpec): Any {
  if (imported === undefined) {
    const match = name.match(/[\*@\+]/);
    if (match && match.index) {
      const idx = match.index;
      const usage = name.substring(0, idx);
      imported = SymbolSpec.from(
        `${usage.split('.')[0]}${name.substring(idx)}`);
      return new Any(usage.length === 0 ? imported.value : usage, imported);
    }
  }
  return new Any(name, imported);
}

/**
 * Type name for the generic Array type
 *
 * @param elementType Element type of the array
 * @return Type name of the new array type
 */
export function arrayType(elementType: TypeName): TypeName {
  return parameterizedType(ARRAY, elementType);
}

/**
 * Type name for the generic Set type
 *
 * @param elementType Element type of the set
 * @return Type name of the new set type
 */
export function setType(elementType: TypeName): TypeName {
  return parameterizedType(SET, elementType);
}

/**
 * Type name for the generic Map type
 *
 * @param keyType Key type of the map
 * @param valueType Value type of the map
 * @return Type name of the new map type
 */
export function mapType(keyType: TypeName, valueType: TypeName): TypeName {
  return parameterizedType(MAP, keyType, valueType);
}

/**
 * Parameterized type that represents a concrete
 * usage of a generic type
 *
 * @param rawType Generic type to invoke with arguments
 * @param typeArgs Names of the provided type arguments
 * @return Type name of the new parameterized type
 */
export function parameterizedType(rawType: TypeName, ...typeArgs: TypeName[]): Parameterized {
  return new Parameterized(rawType, typeArgs);
}

/**
 * Type variable represents a single variable type in a
 * generic type or function.
 *
 * @param name The name of the variable as it will be used in the definition
 * @param bounds Bound constraints that will be required during instantiation
 * @return Type name of the new type variable
 */
export function typeVariable(name: string, ...bounds: Bound[]): TypeVariable {
  return new TypeVariable(name, bounds);
}

/**
 * Factory for type variable bounds
 */
export function bound(
  type: TypeName | string,
  combiner: Combiner = Combiner.UNION,
  modifier?: BoundModifier): Bound {
  return new Bound(type instanceof TypeName ? type : anyType(type), combiner, modifier);
}

/**
 * Factory for type variable bounds
 */
export function unionBound(type: TypeName | string, keyOf: boolean = false): Bound {
  const t = type instanceof TypeName ? type : anyType(type);
  return bound(t, Combiner.UNION, keyOf ? BoundModifier.KEY_OF : undefined);
}

/**
 * Factory for type variable bounds
 */
export function intersectBound(type: TypeName | string, keyOf: boolean = false): Bound {
  const t = type instanceof TypeName ? type : anyType(type);
  return bound(t, Combiner.INTERSECT, keyOf ? BoundModifier.KEY_OF : undefined);
}

/**
 * Anonymous type name (e.g. `{ length: number, name: string }`)
 *
 * @param members Member pairs to define the anonymous type
 * @return Type name representing the anonymous type
 */
export function anonymousType(...members: Array<Member | [string, TypeName]>): Anonymous {
  return new Anonymous(members.map(it => {
    return (it instanceof Member) ? it : new Member(it[0], it[1], false);
  }));
}

/**
 * Tuple type name (e.g. `[number, boolean, string]`}
 *
 * @param memberTypes Each argument represents a distinct member type
 * @return Type name representing the tuple type
 */
export function tupleType(...memberTypes: TypeName[]): Tuple {
  return new Tuple(memberTypes);
}

/**
 * Intersection type name (e.g. `Person & Serializable & Loggable`)
 *
 * @param typeRequirements Requirements of the intersection as individual type names
 * @return Type name representing the intersection type
 */
export function intersectionType(...typeRequirements: TypeName[]): Intersection {
  return new Intersection(typeRequirements);
}

/**
 * Union type name (e.g. `int | number | any`)
 *
 * @param typeChoices All possible choices allowed in the union
 * @return Type name representing the union type
 */
function unionType(...typeChoices: TypeName[]): Union {
  return new Union(typeChoices);
}

/** Returns a lambda type with `returnType` and parameters of listed in `parameters`. */
function lambda(parameters: Map<string, TypeName> = new Map(), returnType: TypeName): Lambda {
  return new Lambda(parameters, returnType);
}

/** Returns a lambda type with `returnType` and parameters of listed in `parameters`. */
function lambda2(parameters: Array<[string, TypeName]> = [], returnType: TypeName): Lambda {
  return new Lambda(new Map(parameters), returnType);
}


