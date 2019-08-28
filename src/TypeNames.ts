import { SymbolReferenceTracker } from './SymbolReferenceTracker';
import { moduleSeparator, SymbolSpec } from './SymbolSpecs';

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

  public toString() {
    return this.reference(undefined);
  }

  public union(other: TypeNameOrString) {
    return TypeNames.unionType(this, other);
  }

  public param(...typeArgs: TypeNameOrString[]) {
    return TypeNames.parameterizedType(this, ...typeArgs);
  }

  public useShortArraySyntax(): boolean {
    return true;
  }
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
    if (name === 'Array' && this.typeArgs.every(t => t.useShortArraySyntax())) {
      return `${typeArgs.join(', ')}[]`;
    } else {
      return `${name}<${typeArgs.join(', ')}>`;
    }
  }

  public useShortArraySyntax(): boolean {
    return false;
  }
}

export enum Combiner {
  UNION = '|',
  INTERSECT = '&',
}

export enum BoundModifier {
  KEY_OF = 'keyof',
}

export class Bound {
  constructor(public type: TypeName, public combiner: Combiner = Combiner.UNION, public modifier?: BoundModifier) {}
}

export class TypeVariable extends TypeName {
  constructor(public name: string, public bounds: Bound[]) {
    super();
  }

  public reference(trackedBy?: SymbolReferenceTracker): string {
    return this.name;
  }

  public useShortArraySyntax(): boolean {
    return false;
  }
}

export class Member {
  constructor(public name: string, public type: TypeName, public optional: boolean = false) {}
}

export class Anonymous extends TypeName {
  constructor(public members: Member[]) {
    super();
  }

  public reference(trackedBy?: SymbolReferenceTracker): string {
    const entries = this.members
      .map(it => {
        const name = it.name;
        const opt = it.optional ? '?' : '';
        const type = it.type.reference(trackedBy);
        return `${name}${opt}: ${type}`;
      })
      .join(', ');
    return `{ ${entries} }`;
  }
}

export class Tuple extends TypeName {
  constructor(public memberTypes: TypeName[]) {
    super();
  }

  public reference(trackedBy?: SymbolReferenceTracker): string {
    const typeRequirements = this.memberTypes.map(it => {
      it.reference(trackedBy);
    });
    return `[${typeRequirements.join(', ')}]`;
  }

  public useShortArraySyntax(): boolean {
    return false;
  }
}

export class Intersection extends TypeName {
  constructor(public typeRequirements: TypeName[]) {
    super();
  }

  public reference(trackedBy?: SymbolReferenceTracker): string {
    return this.typeRequirements.map(it => it.reference(trackedBy)).join(' & ');
  }

  public useShortArraySyntax(): boolean {
    return false;
  }
}

export class Union extends TypeName {
  constructor(public typeChoices: TypeName[]) {
    super();
  }

  public reference(trackedBy?: SymbolReferenceTracker): string {
    return this.typeChoices.map(it => it.reference(trackedBy)).join(' | ');
  }

  public useShortArraySyntax(): boolean {
    return false;
  }
}

export class Lambda extends TypeName {
  constructor(public parameters: Map<string, TypeName> = new Map(), public returnType: TypeName = TypeNames.VOID) {
    super();
  }

  public reference(trackedBy?: SymbolReferenceTracker): string {
    const params: string[] = [];
    this.parameters.forEach((value, key) => {
      params.push(`${key}: ${value.reference(trackedBy)}`);
    });
    return `(${params.join(', ')}) => ${this.returnType.reference(trackedBy)}`;
  }

  public useShortArraySyntax(): boolean {
    return false;
  }
}

/** Accept an existing TypeName or a string that could be a type literal or an import spec. */
export type TypeNameOrString = TypeName | string;

/** Provides public factory methods for all of the type name variants. */
export class TypeNames {
  public static readonly NULL = TypeNames.anyType('null');
  public static readonly UNDEFINED = TypeNames.anyType('undefined');
  public static readonly NEVER = TypeNames.anyType('never');
  public static readonly VOID = TypeNames.anyType('void');
  public static readonly ANY = TypeNames.anyType('any');
  public static readonly BOOLEAN = TypeNames.anyType('boolean');
  public static readonly NUMBER = TypeNames.anyType('number');
  public static readonly STRING = TypeNames.anyType('string');
  public static readonly OBJECT = TypeNames.anyType('Object');
  public static readonly DATE = TypeNames.anyType('Date');
  public static readonly ARRAY = TypeNames.anyType('Array');
  public static readonly SET = TypeNames.anyType('Set');
  public static readonly MAP = TypeNames.anyType('Map');
  public static readonly PROMISE = TypeNames.anyType('Promise');
  public static readonly BUFFER = TypeNames.anyType('Buffer');
  public static readonly ARRAY_BUFFER = TypeNames.anyType('ArrayBuffer');

  /**
   * An imported type name
   *
   * @param spec Import spec for type name
   */
  public static importedType(spec: string): Any {
    const symbolSpec = SymbolSpec.from(spec);
    return TypeNames.anyType(symbolSpec.value, symbolSpec);
  }

  /**
   * Any class/enum/primitive/etc type name
   *
   * @param name Name for the type, will be symbolized
   */
  public static anyType(name: string, imported?: SymbolSpec): Any {
    if (imported === undefined) {
      const match = name.match(moduleSeparator);
      if (match && match.index !== undefined) {
        const idx = match.index;
        const usage = name.substring(0, idx);
        imported = SymbolSpec.from(`${usage.split('.')[0]}${name.substring(idx)}`);
        return new Any(usage.length === 0 ? imported.value : usage, imported);
      }
    }
    return new Any(name, imported);
  }

  /**
   * A literal type value, e.g. 'one' or 1.
   */
  public static typeLiteral(value: string | number | boolean) {
    if (typeof value === 'string') {
      return TypeNames.anyType(`'${value}'`);
    } else {
      return TypeNames.anyType(`${value}`);
    }
  }

  public static anyTypeMaybeString(type: TypeNameOrString): TypeName {
    return type instanceof TypeName ? type : TypeNames.anyType(type);
  }

  public static typesOrStrings(types: TypeNameOrString[]): TypeName[] {
    return types.map(t => this.anyTypeMaybeString(t));
  }

  /**
   * Type name for the generic Array type
   *
   * @param elementType Element type of the array
   * @return Type name of the new array type
   */
  public static arrayType(elementType: TypeNameOrString): TypeName {
    return TypeNames.parameterizedType(TypeNames.ARRAY, elementType);
  }

  /**
   * Type name for the generic Set type
   *
   * @param elementType Element type of the set
   * @return Type name of the new set type
   */
  public static setType(elementType: TypeNameOrString): TypeName {
    return TypeNames.parameterizedType(TypeNames.SET, elementType);
  }

  /**
   * Type name for the generic Map type
   *
   * @param keyType Key type of the map
   * @param valueType Value type of the map
   * @return Type name of the new map type
   */
  public static mapType(keyType: TypeNameOrString, valueType: TypeNameOrString): TypeName {
    return TypeNames.parameterizedType(TypeNames.MAP, keyType, valueType);
  }

  /**
   * Parameterized type that represents a concrete
   * usage of a generic type
   *
   * @param rawType Generic type to invoke with arguments
   * @param typeArgs Names of the provided type arguments
   * @return Type name of the new parameterized type
   */
  public static parameterizedType(rawType: TypeName, ...typeArgs: TypeNameOrString[]): Parameterized {
    return new Parameterized(rawType, this.typesOrStrings(typeArgs));
  }

  /**
   * Type variable represents a single variable type in a
   * generic type or function.
   *
   * @param name The name of the variable as it will be used in the definition
   * @param bounds Bound constraints that will be required during instantiation
   * @return Type name of the new type variable
   */
  public static typeVariable(name: string, ...bounds: Bound[]): TypeVariable {
    return new TypeVariable(name, bounds);
  }

  /**
   * Factory for type variable bounds
   */
  public static bound(type: TypeNameOrString, combiner: Combiner = Combiner.UNION, modifier?: BoundModifier): Bound {
    return new Bound(TypeNames.anyTypeMaybeString(type), combiner, modifier);
  }

  /**
   * Factory for type variable bounds
   */
  public static unionBound(type: TypeNameOrString, keyOf: boolean = false): Bound {
    return TypeNames.bound(type, Combiner.UNION, keyOf ? BoundModifier.KEY_OF : undefined);
  }

  /**
   * Factory for type variable bounds
   */
  public static intersectBound(type: TypeNameOrString, keyOf: boolean = false): Bound {
    return TypeNames.bound(type, Combiner.INTERSECT, keyOf ? BoundModifier.KEY_OF : undefined);
  }

  /**
   * Anonymous type name (e.g. `{ length: number, name: string }`)
   *
   * @param members Member pairs to define the anonymous type
   * @return Type name representing the anonymous type
   */
  public static anonymousType(...members: Array<Member | [string, TypeName]>): Anonymous {
    return new Anonymous(
      members.map(it => {
        return it instanceof Member ? it : new Member(it[0], it[1], false);
      })
    );
  }

  /**
   * Tuple type name (e.g. `[number, boolean, string]`}
   *
   * @param memberTypes Each argument represents a distinct member type
   * @return Type name representing the tuple type
   */
  public static tupleType(...memberTypes: TypeName[]): Tuple {
    return new Tuple(memberTypes);
  }

  /**
   * Intersection type name (e.g. `Person & Serializable & Loggable`)
   *
   * @param typeRequirements Requirements of the intersection as individual type names
   * @return Type name representing the intersection type
   */
  public static intersectionType(...typeRequirements: TypeName[]): Intersection {
    return new Intersection(typeRequirements);
  }

  /**
   * Union type name (e.g. `int | number | any`)
   *
   * @param typeChoices All possible choices allowed in the union
   * @return Type name representing the union type
   */
  public static unionType(...typeChoices: TypeNameOrString[]): Union {
    return new Union(this.typesOrStrings(typeChoices));
  }

  /** Returns a lambda type with `returnType` and parameters of listed in `parameters`. */
  public static lambda(parameters: Map<string, TypeName> = new Map(), returnType: TypeName): Lambda {
    return new Lambda(parameters, returnType);
  }

  /** Returns a lambda type with `returnType` and parameters of listed in `parameters`. */
  public static lambda2(parameters: Array<[string, TypeName]> = [], returnType: TypeName): Lambda {
    return new Lambda(new Map(parameters), returnType);
  }
}
