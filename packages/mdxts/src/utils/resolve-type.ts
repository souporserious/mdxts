import {
  Node,
  Type,
  TypeFormatFlags,
  SyntaxKind,
  type ClassDeclaration,
  type FunctionDeclaration,
  type ParameterDeclaration,
  type Project,
  type PropertyDeclaration,
  type PropertySignature,
  type MethodDeclaration,
  type SetAccessorDeclaration,
  type GetAccessorDeclaration,
  type Signature,
  type Symbol,
  type TypeNode,
} from 'ts-morph'
import {
  getJsDocMetadata,
  getPropertyDefaultValueKey,
  getPropertyDefaultValue,
  getSymbolDescription,
} from '@tsxmod/utils'

export interface BaseType {
  /** Distinguishs between different kinds of types, such as primitives, objects, classes, functions, etc. */
  kind?: unknown

  /** Whether the type is a function/method parameter or a object/class/interface property. */
  context?: 'parameter' | 'property'

  /** The name of the symbol or declaration if it exists. */
  name?: string

  /** The description of the symbol or declaration if it exists. */
  description?: string

  /** JSDoc tags for the declaration if present. */
  tags?: { tagName: string; text?: string }[]

  /** A stringified representation of the type. */
  text: string

  /** The path to the file where the symbol declaration is located. */
  path?: string

  /** The line and column number of the symbol declaration. */
  position?: {
    start: { line: number; column: number }
    end: { line: number; column: number }
  }
}

export interface ParameterType extends BaseType {
  /** Whether the type is a function/method parameter. */
  context: 'parameter'

  /** The default value assigned to the property parsed as a literal value if possible. */
  defaultValue?: unknown

  /** Whether or not the property has an optional modifier or default value. */
  isOptional?: boolean
}

export type CreateParameterType<Type> = Type extends any
  ? Type & ParameterType
  : never

export interface PropertyType extends BaseType {
  /** Whether the type is a object/class/interface property. */
  context: 'property'

  /** The default value assigned to the property parsed as a literal value if possible. */
  defaultValue?: unknown

  /** Whether or not the property has an optional modifier or default value. */
  isOptional?: boolean

  /** Whether or not the property has a readonly modifier. */
  isReadonly?: boolean
}

export type CreatePropertyType<Type> = Type extends any
  ? Type & PropertyType
  : never

export interface StringType extends BaseType {
  kind: 'String'
  value?: string
}

export interface NumberType extends BaseType {
  kind: 'Number'
  value?: number
}

export interface BooleanType extends BaseType {
  kind: 'Boolean'
}

export interface SymbolType extends BaseType {
  kind: 'Symbol'
}

export interface ArrayType extends BaseType {
  kind: 'Array'
  element: ResolvedType
}

export interface TupleType extends BaseType {
  kind: 'Tuple'
  elements: ResolvedType[]
}

export interface ObjectType extends BaseType {
  kind: 'Object'
  properties: PropertyTypes[]
}

export interface IntersectionType extends BaseType {
  kind: 'Intersection'
  properties: ResolvedType[]
}

export interface EnumType extends BaseType {
  kind: 'Enum'
  members: Record<string, string | number | undefined>
}

export interface UnionType extends BaseType {
  kind: 'Union'
  members: ResolvedType[]
}

export interface ClassType extends BaseType {
  kind: 'Class'
  constructors?: ReturnType<typeof resolveCallSignatures>
  accessors?: ClassAccessorType[]
  methods?: ClassMethodType[]
  properties?: ClassPropertyType[]
}

export interface SharedClassMemberType extends BaseType {
  scope?: 'abstract' | 'static'
  visibility?: 'private' | 'protected' | 'public'
}

export interface ClassGetAccessorType extends SharedClassMemberType {
  kind: 'ClassGetAccessor'
}

export type ClassSetAccessorType = SharedClassMemberType & {
  kind: 'ClassSetAccessor'
} & Omit<FunctionSignatureType, 'kind'>

export type ClassAccessorType = ClassGetAccessorType | ClassSetAccessorType

export interface ClassMethodType extends SharedClassMemberType {
  kind: 'ClassMethod'
  signatures: FunctionSignatureType[]
}

export type ClassPropertyType = BaseTypes &
  SharedClassMemberType & {
    defaultValue?: unknown
    isReadonly: boolean
  }

export interface FunctionSignatureType extends BaseType {
  kind: 'FunctionSignature'
  modifier?: 'async' | 'generator'
  parameters: ParameterTypes[]
  returnType: string
}

export interface FunctionType extends BaseType {
  kind: 'Function'
  signatures: FunctionSignatureType[]
}

export interface ComponentSignatureType extends BaseType {
  kind: 'ComponentSignature'
  modifier?: 'async' | 'generator'
  parameter?: ObjectType | ReferenceType
  returnType: string
}

export interface ComponentType extends BaseType {
  kind: 'Component'
  signatures: ComponentSignatureType[]
}

export interface PrimitiveType extends BaseType {
  kind: 'Primitive'
}

export interface ReferenceType extends BaseType {
  kind: 'Reference'
}

export interface GenericType extends BaseType {
  kind: 'Generic'
  typeName: string
  arguments: ParameterTypes[]
}

export interface UnknownType extends BaseType {
  kind: 'Unknown'
}

export type BaseTypes =
  | StringType
  | NumberType
  | BooleanType
  | SymbolType
  | ArrayType
  | TupleType
  | ObjectType
  | IntersectionType
  | EnumType
  | UnionType
  | ClassType
  | FunctionType
  | ComponentType
  | PrimitiveType
  | ReferenceType
  | GenericType
  | UnknownType

export type AllTypes =
  | BaseTypes
  | ClassAccessorType
  | ClassMethodType
  | FunctionSignatureType
  | ComponentSignatureType

export type TypeByKind<Type, Key> = Type extends { kind: Key } ? Type : never

export type TypeOfKind<Key extends AllTypes['kind']> = TypeByKind<AllTypes, Key>

export type ParameterTypes = CreateParameterType<BaseTypes>

export type PropertyTypes = CreatePropertyType<BaseTypes>

export type ResolvedType = BaseTypes | ParameterTypes | PropertyTypes

export type SymbolMetadata = ReturnType<typeof getSymbolMetadata>

export type SymbolFilter = (symbolMetadata: SymbolMetadata) => boolean

const typeReferences = new WeakSet<Type>()
const objectReferences = new Set<string>()
const enclosingNodeMetadata = new WeakMap<Node, SymbolMetadata>()
const defaultFilter = (metadata: SymbolMetadata) => !metadata.isInNodeModules
const TYPE_FORMAT_FLAGS =
  TypeFormatFlags.NoTruncation |
  TypeFormatFlags.UseAliasDefinedOutsideCurrentScope |
  TypeFormatFlags.WriteArrayAsGenericType

/** Process type metadata. */
export function resolveType(
  type: Type,
  enclosingNode?: Node,
  filter: SymbolFilter = defaultFilter,
  isRootType: boolean = true,
  defaultValues?: Record<string, unknown> | unknown,
  useReferences: boolean = true
): ResolvedType | undefined {
  const symbol =
    // First, attempt to get the aliased symbol for imported and aliased types
    type.getAliasSymbol() ||
    // Next, try to get the symbol of the type itself
    type.getSymbol() ||
    // Finally, try to get the symbol of the apparent type
    type.getApparentType().getSymbol()
  const symbolMetadata = getSymbolMetadata(symbol, enclosingNode)
  const symbolDeclaration = symbol?.getDeclarations().at(0)
  const isPrimitive = isPrimitiveType(type)
  const declaration = symbolDeclaration || enclosingNode
  const typeArguments = type.getTypeArguments()
  const aliasTypeArguments = type.getAliasTypeArguments()
  let typeName: string | undefined = symbolDeclaration
    ? (symbolDeclaration as any)?.getNameNode?.()?.getText()
    : undefined
  let typeText = type.getText(enclosingNode, TYPE_FORMAT_FLAGS)
  let declarationLocation: ReturnType<typeof getDeclarationLocation> = {}

  if (declaration) {
    /* Use the enclosing node's location if it is a member. */
    const isMember =
      Node.isVariableDeclaration(enclosingNode) ||
      Node.isPropertyAssignment(enclosingNode) ||
      Node.isPropertySignature(enclosingNode) ||
      Node.isMethodSignature(enclosingNode) ||
      Node.isParameterDeclaration(enclosingNode) ||
      Node.isPropertyDeclaration(enclosingNode) ||
      Node.isMethodDeclaration(enclosingNode) ||
      Node.isGetAccessorDeclaration(enclosingNode) ||
      Node.isSetAccessorDeclaration(enclosingNode)

    declarationLocation = getDeclarationLocation(
      isMember ? enclosingNode : declaration
    )
  }

  /* Use the generic name and type text if the type is a type alias or property signature. */
  let genericTypeArguments: TypeNode[] = []
  let genericTypeName = ''
  let genericTypeText = ''

  if (
    typeArguments.length === 0 &&
    (Node.isTypeAliasDeclaration(enclosingNode) ||
      Node.isPropertySignature(enclosingNode))
  ) {
    const typeNode = enclosingNode.getTypeNode()

    if (Node.isTypeReference(typeNode)) {
      genericTypeArguments = typeNode.getTypeArguments()
      genericTypeName = typeNode.getTypeName().getText()
      genericTypeText = typeNode.getText()
    }
  }

  if (useReferences) {
    /** Determine if the enclosing type is referencing a type in node modules. */
    if (symbol && enclosingNode && !isPrimitive) {
      const enclosingSymbolMetadata = enclosingNodeMetadata.get(enclosingNode)
      const inSeparateProjects =
        enclosingSymbolMetadata?.isInNodeModules === false &&
        symbolMetadata.isInNodeModules

      if (inSeparateProjects) {
        /**
         * Additionally, we check if type arguments exist and are all located in node_modules before
         * treating the entire expression as a reference.
         */
        if (
          typeArguments.length === 0 ||
          isEveryTypeInNodeModules(typeArguments)
        ) {
          if (aliasTypeArguments.length > 0) {
            const resolvedTypeArguments = aliasTypeArguments
              .map((type) => resolveType(type, declaration, filter, false))
              .filter(Boolean) as ResolvedType[]

            if (resolvedTypeArguments.length === 0) {
              return
            }

            return {
              kind: 'Generic',
              text: typeText,
              typeName: typeName!,
              arguments: resolvedTypeArguments.map((type) => ({
                ...type,
                context: 'parameter',
              })),
              ...declarationLocation,
            } satisfies GenericType
          } else {
            if (!declarationLocation.filePath) {
              throw new Error(
                `[resolveType]: No file path found for "${typeText}". Please file an issue if you encounter this error.`
              )
            }
            return {
              kind: 'Reference',
              text: typeText,
              ...declarationLocation,
            } satisfies ReferenceType
          }
        }
      }
    }

    /*
     * Determine if the symbol should be treated as a reference.
     * TODO: this should account for what's actually exported from package.json exports to determine what's resolved.
     */
    const isLocallyExportedReference =
      !isRootType &&
      !symbolMetadata.isInNodeModules &&
      !symbolMetadata.isExternal &&
      symbolMetadata.isExported
    const isExternalNonNodeModuleReference =
      symbolMetadata.isExternal && !symbolMetadata.isInNodeModules
    const isNodeModuleReference =
      !symbolMetadata.isGlobal && symbolMetadata.isInNodeModules
    const hasNoTypeArguments =
      typeArguments.length === 0 &&
      aliasTypeArguments.length === 0 &&
      genericTypeArguments.length === 0
    const hasReference = typeReferences.has(type)

    if (
      hasReference ||
      ((isLocallyExportedReference ||
        isExternalNonNodeModuleReference ||
        isNodeModuleReference) &&
        hasNoTypeArguments)
    ) {
      if (!declarationLocation.filePath) {
        throw new Error(
          `[resolveType]: No file path found for "${typeText}". Please file an issue if you encounter this error.`
        )
      }

      /* Check if the reference is an object. This is specifically used in the `isComponent` function. */
      let isObject = false

      if (
        isLocallyExportedReference ||
        isExternalNonNodeModuleReference ||
        isNodeModuleReference
      ) {
        const resolvedReferenceType = resolveType(
          type,
          enclosingNode,
          filter,
          isRootType,
          defaultValues,
          false
        )

        if (resolvedReferenceType?.kind === 'Object') {
          isObject = true
        } else if (resolvedReferenceType?.kind === 'Union') {
          isObject = resolvedReferenceType.members.every(
            (property) => property.kind === 'Object'
          )
        }

        if (isObject) {
          const referenceId = getReferenceId({
            text: typeText,
            ...declarationLocation,
          })
          objectReferences.add(referenceId)
        }
      }

      return {
        kind: 'Reference',
        text: typeText,
        ...declarationLocation,
      } satisfies ReferenceType
    }
  }

  /* If the type is not virtual, store it as a reference. */
  if (!symbolMetadata.isVirtual) {
    typeReferences.add(type)
  }

  let resolvedType: ResolvedType = {
    kind: 'Unknown',
    text: typeText,
  } satisfies UnknownType

  if (type.isBoolean() || type.isBooleanLiteral()) {
    resolvedType = {
      kind: 'Boolean',
      name: symbolMetadata.name,
      text: typeText,
    } satisfies BooleanType
  } else if (type.isNumber() || type.isNumberLiteral()) {
    resolvedType = {
      kind: 'Number',
      name: symbolMetadata.name,
      text: typeText,
      value: type.getLiteralValue() as number,
    } satisfies NumberType
  } else if (type.isString() || type.isStringLiteral()) {
    resolvedType = {
      kind: 'String',
      name: symbolMetadata.name,
      text: typeText,
      value: type.getLiteralValue() as string,
    } satisfies StringType
  } else if (isSymbol(type)) {
    resolvedType = {
      kind: 'Symbol',
      name: symbolMetadata.name,
      text: typeText,
    } satisfies SymbolType
  } else if (type.isArray()) {
    const elementType = type.getArrayElementTypeOrThrow()
    const resolvedElementType = resolveType(
      elementType,
      declaration,
      filter,
      false
    )
    if (resolvedElementType) {
      resolvedType = {
        kind: 'Array',
        name: symbolMetadata.name,
        text: typeText,
        element: resolvedElementType,
      } satisfies ArrayType
    } else {
      typeReferences.delete(type)
      return
    }
  } else {
    /* Attempt to resolve generic type arguments if they exist. */
    if (aliasTypeArguments.length === 0 && genericTypeArguments.length > 0) {
      const resolvedTypeArguments = genericTypeArguments
        .map((type) => {
          const resolvedType = resolveType(type.getType(), type, filter, false)
          if (resolvedType) {
            return {
              ...resolvedType,
              type: type.getText(),
            }
          }
        })
        .filter(Boolean) as ResolvedType[]
      const everyTypeArgumentIsReference = resolvedTypeArguments.every(
        (type) => type.kind === 'Reference'
      )

      /* If the any of the type arguments are references, they need need to be linked to the generic type. */
      if (everyTypeArgumentIsReference && resolvedTypeArguments.length > 0) {
        typeReferences.delete(type)

        return {
          kind: 'Generic',
          text: genericTypeText,
          typeName: genericTypeName,
          arguments: resolvedTypeArguments.map((type) => ({
            ...type,
            context: 'parameter',
          })),
          ...declarationLocation,
        } satisfies GenericType
      }
    }

    if (type.isClass()) {
      if (Node.isClassDeclaration(symbolDeclaration)) {
        resolvedType = resolveClass(symbolDeclaration, filter)
        if (symbolMetadata.name) {
          resolvedType.name = symbolMetadata.name
        }
      } else {
        throw new Error(
          `[resolveType]: No class declaration found for "${symbolMetadata.name}". Please file an issue if you encounter this error.`
        )
      }
    } else if (type.isEnum()) {
      if (Node.isEnumDeclaration(symbolDeclaration)) {
        resolvedType = {
          kind: 'Enum',
          name: symbolMetadata.name,
          text: typeText,
          members: Object.fromEntries(
            symbolDeclaration
              .getMembers()
              .map((member) => [member.getName(), member.getValue()])
          ) as Record<string, string | number | undefined>,
        } satisfies EnumType
      } else {
        throw new Error(
          `[resolveType]: No enum declaration found for "${symbolMetadata.name}". Please file an issue if you encounter this error.`
        )
      }
    } else if (type.isUnion()) {
      const typeNode = Node.isTypeAliasDeclaration(symbolDeclaration)
        ? symbolDeclaration.getTypeNode()
        : undefined

      /* type.isIntersection() will be `false` when mixed with unions so we resolve the type nodes individually instead. */
      if (Node.isIntersectionTypeNode(typeNode)) {
        const resolvedIntersectionTypes = typeNode
          .getTypeNodes()
          .map((typeNode) =>
            resolveType(typeNode.getType(), typeNode, filter, false)
          )
          .filter(Boolean) as ResolvedType[]

        if (resolvedIntersectionTypes.length === 0) {
          typeReferences.delete(type)
          return
        }

        resolvedType = {
          kind: 'Intersection',
          name: symbolMetadata.name,
          text: typeText,
          properties: resolvedIntersectionTypes,
        } satisfies IntersectionType
      } else {
        const resolvedUnionTypes: ResolvedType[] = []

        for (const unionType of type.getUnionTypes()) {
          const resolvedType = resolveType(
            unionType,
            declaration,
            filter,
            false,
            defaultValues
          )

          if (resolvedType) {
            const previousProperty = resolvedUnionTypes.at(-1)

            // Flatten boolean literals to just 'boolean' if both values are present
            if (
              resolvedType.kind === 'Boolean' &&
              previousProperty?.kind === 'Boolean'
            ) {
              resolvedUnionTypes.pop()
              resolvedType.text = 'boolean'
            }

            resolvedUnionTypes.push(resolvedType)
          }
        }

        if (resolvedUnionTypes.length === 0) {
          typeReferences.delete(type)
          return
        }

        resolvedType = {
          kind: 'Union',
          name: symbolMetadata.name,
          text: typeText,
          members: resolvedUnionTypes,
        } satisfies UnionType
      }
    } else if (type.isIntersection()) {
      const resolvedIntersectionTypes = type
        .getIntersectionTypes()
        .map((intersectionType) =>
          resolveType(
            intersectionType,
            declaration,
            filter,
            false,
            defaultValues
          )
        )
        .filter(Boolean) as ResolvedType[]

      // Intersection types can safely merge the immediate object properties to reduce nesting
      const properties: ResolvedType[] = []
      let isObject = true

      for (const resolvedType of resolvedIntersectionTypes) {
        if (resolvedType.kind === 'Object') {
          properties.push(...resolvedType.properties)
        } else {
          properties.push(resolvedType)
          isObject = false
        }
      }

      if (properties.length === 0) {
        typeReferences.delete(type)
        return
      }

      if (isObject) {
        resolvedType = {
          kind: 'Object',
          name: symbolMetadata.name,
          text: typeText,
          properties: properties.map((property) => ({
            ...property,
            context: 'property',
          })),
        } satisfies ObjectType
      } else {
        resolvedType = {
          kind: 'Intersection',
          name: symbolMetadata.name,
          text: typeText,
          properties,
        } satisfies IntersectionType
      }
    } else if (type.isTuple()) {
      const elements = resolveTypeTupleElements(
        type,
        declaration,
        filter,
        false
      )

      if (elements.length === 0) {
        typeReferences.delete(type)
        return
      }

      resolvedType = {
        kind: 'Tuple',
        name: symbolMetadata.name,
        text: typeText,
        elements,
      } satisfies TupleType
    } else {
      const callSignatures = type.getCallSignatures()

      if (callSignatures.length > 0) {
        const resolvedCallSignatures = resolveCallSignatures(
          callSignatures,
          declaration,
          filter,
          false
        )

        if (isComponent(symbolMetadata.name, resolvedCallSignatures)) {
          resolvedType = {
            kind: 'Component',
            name: symbolMetadata.name,
            text: typeText,
            signatures: resolvedCallSignatures.map(
              ({ parameters, ...resolvedCallSignature }) => {
                return {
                  ...resolvedCallSignature,
                  kind: 'ComponentSignature',
                  parameter: parameters.at(0) as
                    | ObjectType
                    | ReferenceType
                    | undefined,
                } satisfies ComponentSignatureType
              }
            ),
          } satisfies ComponentType
        } else {
          resolvedType = {
            kind: 'Function',
            name: symbolMetadata.name,
            text: typeText,
            signatures: resolvedCallSignatures,
          } satisfies FunctionType
        }
      } else if (isPrimitive) {
        resolvedType = {
          kind: 'Primitive',
          text: typeText,
        } satisfies PrimitiveType
      } else if (type.isObject()) {
        const properties = resolveTypeProperties(
          type,
          enclosingNode,
          filter,
          false,
          defaultValues
        )

        if (properties.length === 0 && typeArguments.length > 0) {
          const resolvedTypeArguments = typeArguments
            .map((type) =>
              resolveType(type, declaration, filter, false, defaultValues)
            )
            .filter(Boolean) as ResolvedType[]

          if (resolvedTypeArguments.length === 0) {
            typeReferences.delete(type)
            return
          }

          resolvedType = {
            kind: 'Generic',
            name: symbolMetadata.name,
            text: typeText,
            typeName: typeName!,
            arguments: resolvedTypeArguments.map((type) => ({
              ...type,
              context: 'parameter',
            })),
          } satisfies GenericType
        } else if (properties.length === 0) {
          typeReferences.delete(type)
          return
        } else {
          resolvedType = {
            kind: 'Object',
            name: symbolMetadata.name,
            text: typeText,
            properties: properties.map((property) => ({
              ...property,
              context: 'property',
            })),
          } satisfies ObjectType
        }
      } else {
        /** Finally, try to resolve the apparent type if it is different from the current type. */
        const apparentType = type.getApparentType()

        if (type !== apparentType) {
          typeReferences.delete(type)

          return resolveType(
            apparentType,
            declaration,
            filter,
            false,
            defaultValues
          )
        }
      }
    }
  }

  typeReferences.delete(type)

  let metadataDeclaration = declaration

  /* If the type is a variable declaration, use the parent statement to retrieve jsdoc metadata. */
  if (Node.isVariableDeclaration(enclosingNode)) {
    metadataDeclaration = enclosingNode
  }

  return {
    ...(metadataDeclaration ? getJsDocMetadata(metadataDeclaration) : {}),
    ...resolvedType,
    ...declarationLocation,
  }
}

/** Process all function signatures of a given type including their parameters and return types. */
export function resolveCallSignatures(
  signatures: Signature[],
  enclosingNode?: Node,
  filter: SymbolFilter = defaultFilter,
  isRootType: boolean = true
): FunctionSignatureType[] {
  return signatures
    .map((signature) =>
      resolveSignature(signature, enclosingNode, filter, isRootType)
    )
    .filter(Boolean) as FunctionSignatureType[]
}

/** Process a single function signature including its parameters and return type. */
export function resolveSignature(
  signature: Signature,
  enclosingNode?: Node,
  filter: SymbolFilter = defaultFilter,
  isRootType: boolean = true
): FunctionSignatureType | undefined {
  const signatureDeclaration = signature.getDeclaration()
  const signatureParameters = signature.getParameters()
  const parameterDeclarations = signatureParameters.map((parameter) =>
    parameter.getDeclarations().at(0)
  ) as (ParameterDeclaration | undefined)[]
  const generics = signature
    .getTypeParameters()
    .map((parameter) => parameter.getText())
    .join(', ')
  const genericsText = generics ? `<${generics}>` : ''
  const resolvedParameters = signatureParameters
    .map((parameter, index) => {
      const parameterDeclaration = parameterDeclarations[index]
      const isOptional = parameterDeclaration
        ? parameterDeclaration.hasQuestionToken()
        : undefined
      const declaration = parameterDeclaration || enclosingNode

      if (declaration) {
        const defaultValue = parameterDeclaration
          ? getPropertyDefaultValue(parameterDeclaration)
          : undefined
        const resolvedType = resolveType(
          parameter.getTypeAtLocation(signatureDeclaration),
          declaration,
          filter,
          isRootType,
          defaultValue
        )

        if (resolvedType) {
          let name: string | undefined = parameter.getName()

          if (name.startsWith('__')) {
            name = undefined
          }

          return {
            ...resolvedType,
            context: 'parameter',
            name,
            defaultValue,
            isOptional: isOptional ?? Boolean(defaultValue),
            description: getSymbolDescription(parameter),
          } satisfies ParameterTypes
        }
      } else {
        throw new Error(
          `[resolveCallSignatures]: No parameter declaration found for "${parameter.getName()}". You must pass the enclosing node as the second argument to "resolveCallSignatures".`
        )
      }
    })
    .filter(Boolean) as ParameterTypes[]

  /** Skip signatures with filtered parameters if they are in node_modules. */
  if (
    signatureParameters.length !== 0 &&
    resolvedParameters.length === 0 &&
    signatureDeclaration.getSourceFile().isInNodeModules()
  ) {
    return
  }

  const returnType = signature
    .getReturnType()
    .getText(undefined, TypeFormatFlags.UseAliasDefinedOutsideCurrentScope)
  const parametersText = resolvedParameters
    .map((parameter) => {
      const questionMark = parameter.isOptional ? '?' : ''
      return parameter.name
        ? `${parameter.name}${questionMark}: ${parameter.text}`
        : parameter.text
    })
    .join(', ')
  let simplifiedTypeText: string

  if (Node.isFunctionDeclaration(signatureDeclaration)) {
    simplifiedTypeText = `function ${signatureDeclaration.getName()}${genericsText}(${parametersText}): ${returnType}`
  } else {
    simplifiedTypeText = `${genericsText}(${parametersText}) => ${returnType}`
  }

  const modifier: ReturnType<typeof getModifier> =
    Node.isFunctionDeclaration(signatureDeclaration) ||
    Node.isMethodDeclaration(signatureDeclaration)
      ? getModifier(signatureDeclaration)
      : undefined

  return {
    kind: 'FunctionSignature',
    text: simplifiedTypeText,
    parameters: resolvedParameters,
    modifier,
    returnType,
  }
}

/** Process all apparent properties of a given type. */
export function resolveTypeProperties(
  type: Type,
  enclosingNode?: Node,
  filter: SymbolFilter = defaultFilter,
  isRootType: boolean = true,
  defaultValues?: Record<string, unknown> | unknown
): ResolvedType[] {
  const isReadonly = isTypeReadonly(type, enclosingNode)

  return type
    .getApparentProperties()
    .map((property) => {
      const symbolMetadata = getSymbolMetadata(property, enclosingNode)
      const propertyDeclaration = property.getDeclarations().at(0) as
        | PropertySignature
        | undefined
      const declaration = propertyDeclaration || enclosingNode
      const filterResult = filter(symbolMetadata)

      if (filterResult === false) {
        return
      }

      if (declaration) {
        const name = property.getName()
        const defaultValue =
          defaultValues && propertyDeclaration
            ? (defaultValues as Record<string, unknown>)[
                getPropertyDefaultValueKey(propertyDeclaration)
              ]
            : undefined

        // Store the metadata of the enclosing node for file location comparison used in resolveType
        enclosingNodeMetadata.set(declaration, symbolMetadata)

        const propertyType = property.getTypeAtLocation(declaration)
        const resolvedProperty = resolveType(
          propertyType,
          declaration,
          filter,
          isRootType,
          defaultValue
        )

        if (resolvedProperty) {
          const isOptional = Boolean(
            propertyDeclaration?.hasQuestionToken() || defaultValue
          )
          const isPropertyReadonly = propertyDeclaration
            ? 'isReadonly' in propertyDeclaration
              ? propertyDeclaration.isReadonly()
              : false
            : false

          return {
            ...resolvedProperty,
            ...getJsDocMetadata(declaration),
            context: 'property',
            name,
            defaultValue,
            isOptional,
            isReadonly: isReadonly || isPropertyReadonly,
          } satisfies PropertyTypes
        }
      } else {
        throw new Error(
          `[resolveTypeProperties]: No property declaration found for "${property.getName()}". You must pass the enclosing node as the second argument to "resolveTypeProperties".`
        )
      }
    })
    .filter(Boolean) as PropertyTypes[]
}

/** Process all elements of a tuple type. */
function resolveTypeTupleElements(
  type: Type,
  enclosingNode?: Node,
  filter?: SymbolFilter,
  isRootType: boolean = true
) {
  const tupleNames = type
    .getText()
    .slice(1, -1)
    .split(',')
    .map((signature) => {
      const [name] = signature.split(':')
      return name ? name.trim() : undefined
    })
  return type
    .getTupleElements()
    .map((tupleElementType, index) => {
      const resolvedType = resolveType(
        tupleElementType,
        enclosingNode,
        filter,
        isRootType
      )
      if (resolvedType) {
        return {
          ...resolvedType,
          context: 'parameter',
          name: tupleNames[index],
        } satisfies ResolvedType
      }
    })
    .filter(Boolean) as ResolvedType[]
}

/** Check if every type argument is in node_modules. */
function isEveryTypeInNodeModules(types: (Type | TypeNode)[]) {
  if (types.length === 0) {
    return false
  }
  return types.every((type) =>
    type.getSymbol()?.getDeclarations().at(0)?.getSourceFile().isInNodeModules()
  )
}

/** Checks if a type is a primitive type. */
function isPrimitiveType(type: Type) {
  return (
    type.isBoolean() ||
    type.isBooleanLiteral() ||
    type.isNumber() ||
    type.isNumberLiteral() ||
    type.isString() ||
    type.isStringLiteral() ||
    type.isTemplateLiteral() ||
    type.isUndefined() ||
    type.isNull() ||
    type.isAny() ||
    type.isUnknown() ||
    type.isNever() ||
    isSymbol(type) ||
    isBigInt(type)
  )
}

/** Check if a type is a symbol. */
function isSymbol(type: Type) {
  const symbol = type.getSymbol()
  return symbol?.getName() === 'Symbol'
}

/** Check if a type is a bigint. */
function isBigInt(type: Type) {
  return type.getText() === 'bigint'
}

/** Gather metadata about a symbol. */
function getSymbolMetadata(
  symbol?: Symbol,
  enclosingNode?: Node
): {
  /** The name of the symbol if it exists. */
  name?: string

  /** Whether or not the symbol is exported. */
  isExported: boolean

  /** Whether or not the symbol is external to the current source file. */
  isExternal: boolean

  /** Whether or not the symbol is located in node_modules. */
  isInNodeModules: boolean

  /** Whether or not the symbol is global. */
  isGlobal: boolean

  /** Whether or not the node is generated by the compiler. */
  isVirtual: boolean
} {
  if (!symbol) {
    return {
      isExported: false,
      isExternal: false,
      isInNodeModules: false,
      isGlobal: false,
      isVirtual: true,
    }
  }

  const declarations = symbol.getDeclarations()

  if (declarations.length === 0) {
    return {
      isExported: false,
      isExternal: false,
      isInNodeModules: false,
      isGlobal: false,
      isVirtual: false,
    }
  }

  const declaration = declarations.at(0)!
  const declarationSourceFile = declaration?.getSourceFile()
  const enclosingNodeSourceFile = enclosingNode?.getSourceFile()

  /** Attempt to get the name of the symbol. */
  let name: string | undefined

  if (
    // If the symbol value declaration is a variable use the name from the enclosing node if provided
    Node.isVariableDeclaration(symbol.getValueDeclaration()) ||
    // Otherwise, use the enclosing node if it is a variable declaration
    Node.isVariableDeclaration(enclosingNode)
  ) {
    if (
      Node.isVariableDeclaration(enclosingNode) &&
      declaration !== enclosingNode
    ) {
      name = enclosingNode.getName()
    }
    // Don't use the name from the symbol if this fails to prevent using apparent names like String, Number, etc.
  } else {
    name = symbol.getName()
  }

  // Ignore private symbol names e.g. __type, __call, __0, etc.
  if (name?.startsWith('__')) {
    name = undefined
  }

  /** Check if the symbol is exported if it is not the enclosing node. */
  let isExported = false

  if (declaration !== enclosingNode) {
    if ('isExported' in declaration) {
      // @ts-expect-error - isExported is not defined on all declaration types
      isExported = declaration.isExported()
    } else {
      // alternatively, check if the declaration's parent is an exported variable declaration
      const variableDeclaration = declaration.getParent()
      if (Node.isVariableDeclaration(variableDeclaration)) {
        isExported = variableDeclaration.isExported()
      }
    }
  }

  /** Check if a type is external to the enclosing source file. */
  let isExternal = false

  // TODO: this is not sufficient because the enclosing node can be from node modules e.g. Promise
  // this should use a root source file to determine if the symbol is external
  if (enclosingNodeSourceFile && !enclosingNodeSourceFile.isInNodeModules()) {
    isExternal = enclosingNodeSourceFile !== declarationSourceFile
  }

  const isInNodeModules = declarationSourceFile.isInNodeModules()

  return {
    name,
    isExported,
    isExternal,
    isInNodeModules,
    isGlobal: isInNodeModules && !isExported,
    isVirtual: false,
  }
}

/** Gets the location of a declaration. */
function getDeclarationLocation(declaration: Node): {
  /** The file path for the symbol declaration relative to the project. */
  filePath?: string

  /** The line and column number of the symbol declaration. */
  position?: {
    start: { line: number; column: number }
    end: { line: number; column: number }
  }
} {
  const filePath = getFilePathRelativeToProject(declaration)
  const sourceFile = declaration.getSourceFile()

  return {
    filePath,
    position: {
      start: sourceFile.getLineAndColumnAtPos(declaration.getStart()),
      end: sourceFile.getLineAndColumnAtPos(declaration.getEnd()),
    },
  }
}

/** Calculate a file path of a source file relative to the project root. */
function getFilePathRelativeToProject(declaration: Node) {
  const sourceFile = declaration.getSourceFile()
  const rootFilePath = getRootFilePath(sourceFile.getProject())
  let trimmedFilePath = sourceFile.getFilePath().replace(rootFilePath, '')

  if (trimmedFilePath.includes('node_modules')) {
    trimmedFilePath = trimmedFilePath.slice(
      trimmedFilePath.lastIndexOf('node_modules') - 1
    )
  }

  return trimmedFilePath.slice(1)
}

const rootFilePaths = new WeakMap<Project, string>()

/** Gets the root source file path for a project. */
function getRootFilePath(project: Project) {
  let rootFilePath: string

  if (!rootFilePaths.has(project)) {
    rootFilePath = project.getFileSystem().getCurrentDirectory()
    rootFilePaths.set(project, rootFilePath)
  } else {
    rootFilePath = rootFilePaths.get(project)!
  }

  return rootFilePath
}

/** Get the modifier of a function or method declaration. */
function getModifier(node: FunctionDeclaration | MethodDeclaration) {
  if (node.isAsync()) {
    return 'async'
  }

  if (node.isGenerator()) {
    return 'generator'
  }
}

/** Get the visibility of a class member. */
function getVisibility(
  node:
    | MethodDeclaration
    | SetAccessorDeclaration
    | GetAccessorDeclaration
    | PropertyDeclaration
) {
  if (node.hasModifier(SyntaxKind.PrivateKeyword)) {
    return 'private'
  }

  if (node.hasModifier(SyntaxKind.ProtectedKeyword)) {
    return 'protected'
  }

  if (node.hasModifier(SyntaxKind.PublicKeyword)) {
    return 'public'
  }
}

/** Get the scope of a class member. */
function getScope(
  node:
    | MethodDeclaration
    | SetAccessorDeclaration
    | GetAccessorDeclaration
    | PropertyDeclaration
) {
  if (node.isAbstract()) {
    return 'abstract'
  }

  if (node.isStatic()) {
    return 'static'
  }
}

/** Processes a class declaration into a metadata object. */
export function resolveClass(
  classDeclaration: ClassDeclaration,
  filter?: SymbolFilter
): ClassType {
  const classMetadata: ClassType = {
    kind: 'Class',
    name: classDeclaration.getName(),
    text: classDeclaration
      .getType()
      .getText(classDeclaration, TYPE_FORMAT_FLAGS),
    ...getJsDocMetadata(classDeclaration),
  }

  const constructorSignatures = classDeclaration
    .getConstructors()
    .map((constructor) => constructor.getSignature())

  if (constructorSignatures.length) {
    classMetadata.constructors = resolveCallSignatures(
      constructorSignatures,
      classDeclaration,
      filter
    )
  }

  classDeclaration.getMembers().forEach((member) => {
    if (
      Node.isGetAccessorDeclaration(member) ||
      Node.isSetAccessorDeclaration(member)
    ) {
      if (!member.hasModifier(SyntaxKind.PrivateKeyword)) {
        if (!classMetadata.accessors) {
          classMetadata.accessors = []
        }
        classMetadata.accessors.push(resolveClassAccessor(member, filter))
      }
    } else if (Node.isMethodDeclaration(member)) {
      if (!member.hasModifier(SyntaxKind.PrivateKeyword)) {
        if (!classMetadata.methods) {
          classMetadata.methods = []
        }
        classMetadata.methods.push(resolveClassMethod(member, filter))
      }
    } else if (Node.isPropertyDeclaration(member)) {
      if (!member.hasModifier(SyntaxKind.PrivateKeyword)) {
        if (!classMetadata.properties) {
          classMetadata.properties = []
        }
        classMetadata.properties.push(resolveClassProperty(member))
      }
    }
  })

  return classMetadata
}

/** Processes a class accessor (getter or setter) declaration into a metadata object. */
function resolveClassAccessor(
  accessor: GetAccessorDeclaration | SetAccessorDeclaration,
  filter?: SymbolFilter
): ClassAccessorType {
  const sharedMetadata: SharedClassMemberType = {
    name: accessor.getName(),
    scope: getScope(accessor),
    visibility: getVisibility(accessor),
    text: accessor.getType().getText(accessor, TYPE_FORMAT_FLAGS),
    ...getJsDocMetadata(accessor),
  }

  if (Node.isSetAccessorDeclaration(accessor)) {
    const resolvedSignature = resolveSignature(
      accessor.getSignature(),
      accessor,
      filter
    )

    if (resolvedSignature) {
      return {
        ...resolvedSignature,
        ...sharedMetadata,
        kind: 'ClassSetAccessor',
        text: accessor.getType().getText(accessor, TYPE_FORMAT_FLAGS),
      } satisfies ClassSetAccessorType
    }

    throw new Error(
      `[resolveClassAccessor] Setter "${accessor.getName()}" could not be resolved. This declaration was either filtered, should be marked as internal, or filed as an issue for support.`
    )
  }

  return {
    ...sharedMetadata,
    kind: 'ClassGetAccessor',
  } satisfies ClassGetAccessorType
}

/** Processes a method declaration into a metadata object. */
function resolveClassMethod(
  method: MethodDeclaration,
  filter?: SymbolFilter
): ClassMethodType {
  const callSignatures = method.getType().getCallSignatures()

  return {
    kind: 'ClassMethod',
    name: method.getName(),
    scope: getScope(method),
    visibility: getVisibility(method),
    signatures: resolveCallSignatures(callSignatures, method, filter),
    text: method.getType().getText(method, TYPE_FORMAT_FLAGS),
    ...getJsDocMetadata(method),
  } satisfies ClassMethodType
}

/** Processes a class property declaration into a metadata object. */
function resolveClassProperty(
  property: PropertyDeclaration,
  filter?: SymbolFilter
): ClassPropertyType {
  const propertyType = property.getType()
  const resolvedType = resolveType(propertyType, property, filter)

  if (resolvedType) {
    return {
      ...resolvedType,
      ...getJsDocMetadata(property),
      name: property.getName(),
      defaultValue: getPropertyDefaultValue(property),
      scope: getScope(property),
      visibility: getVisibility(property),
      isReadonly: property.isReadonly(),
    } satisfies ClassPropertyType
  }

  throw new Error(
    `[resolveClassPropertyDeclaration] Property "${property.getName()}" could not be resolved. This declaration was either filtered, should be marked as internal, or filed as an issue for support.`
  )
}

/** Determines if a type is readonly. */
function isTypeReadonly(type: Type, enclosingNode: Node | undefined) {
  let isReadonly = false

  /** Check if the type is marked as Readonly using the TypeScript utility type. */
  if (type.getText().startsWith('Readonly')) {
    isReadonly = Boolean(
      type
        .getSymbol()
        ?.getDeclarations()
        .at(0)
        ?.getSourceFile()
        .getFilePath()
        .includes('node_modules/typescript')
    )
  }

  /** Alternatively, check for const assertion. */
  if (isReadonly === false && Node.isVariableDeclaration(enclosingNode)) {
    const initializer = enclosingNode.getInitializer()

    if (Node.isAsExpression(initializer)) {
      const typeNode = initializer.getTypeNode()

      if (typeNode) {
        isReadonly = typeNode.getText() === 'const'
      }
    }
  }

  return isReadonly
}

/** Generate an id based on the type metadata. */
function getReferenceId(typeMetadata: BaseType) {
  return (
    typeMetadata.text +
    typeMetadata.path +
    typeMetadata.position?.start.line +
    typeMetadata.position?.start.column
  )
}

/** Determines if a function is a component based on its name and call signature shape. */
export function isComponent(
  name: string | undefined,
  callSignatures: FunctionSignatureType[]
) {
  if (!name) {
    return false
  }

  const isFirstLetterCapitalized = /[A-Z]/.test(name.charAt(0))

  if (!isFirstLetterCapitalized || callSignatures.length === 0) {
    return false
  }

  return callSignatures.every((signature) => {
    if (
      signature.returnType === 'ReactNode' ||
      signature.returnType.endsWith('Element')
    ) {
      return true
    } else if (signature.parameters.length === 1) {
      const firstParameter = signature.parameters.at(0)!

      if (firstParameter.kind === 'Object') {
        return true
      }

      if (firstParameter.kind === 'Union') {
        return firstParameter.members.every(
          (property) => property.kind === 'Object'
        )
      }

      if (firstParameter.kind === 'Reference') {
        const referenceId = getReferenceId(firstParameter)
        return Boolean(objectReferences.has(referenceId))
      }
    }
  })
}

export function isParameterType(
  property: AllTypes
): property is ParameterTypes {
  return property.context === 'parameter'
}

export function isPropertyType(property: AllTypes): property is PropertyTypes {
  return property.context === 'property'
}