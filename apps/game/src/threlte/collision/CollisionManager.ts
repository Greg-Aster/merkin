import type {
  GeneratedCollisionProduct as EngineGeneratedCollisionProduct,
  GeneratedCollisionShape,
} from '../engine/types'

export type Vec3 = [number, number, number]
export type PrimitiveGeometryKind =
  | 'box'
  | 'cylinder'
  | 'octahedron'
  | 'tetrahedron'
  | 'icosahedron'
  | 'dodecahedron'
  | 'torus'
export type CollisionIntent = 'walkable' | 'blocker' | 'trigger' | 'detailMesh'
export type CollisionChannel =
  | 'worldStatic'
  | 'worldDynamic'
  | 'trigger'
  | 'detail'
export type CollisionPolicyMode = 'auto' | 'none' | 'trigger'

export type CollisionGenerationQuality =
  | 'primitive'
  | 'convexHull'
  | 'simplifiedMesh'
  | 'trimesh'

export type CollisionLodTier = 'source' | 'high' | 'medium' | 'low'

export type CollisionGeneratedShape = Exclude<
  GeneratedCollisionShape,
  'cylinder'
>

export type CollisionActorStatus =
  | 'disabled'
  | 'stale'
  | 'generating'
  | 'ready'
  | 'failed'

export interface CollisionPolicy {
  mode: CollisionPolicyMode
  intent?: CollisionIntent
  channel?: CollisionChannel
  quality?: CollisionGenerationQuality
  lodTier?: CollisionLodTier
  maxTriangles?: number
  walkableSlopeLimitDeg?: number
  friction?: number
  restitution?: number
  sensor?: boolean
}

export interface NormalizedCollisionPolicy extends CollisionPolicy {
  mode: CollisionPolicyMode
  intent: CollisionIntent
  channel: CollisionChannel
  quality: CollisionGenerationQuality
  lodTier: CollisionLodTier
  sensor: boolean
}

export type CollisionRenderSource =
  | {
      kind: 'primitive'
      geometry: PrimitiveGeometryKind
      args: number[]
      fingerprint?: string
    }
  | {
      kind: 'mesh'
      url: string
      fingerprint?: string
      localBounds?: CollisionBounds
    }
  | {
      kind: 'prefab'
      type: string
      variant?: string
      assetUrl?: string
      fingerprint?: string
      localBounds?: CollisionBounds
    }
  | {
      kind: 'terrain'
      url: string
      fingerprint?: string
      localBounds?: CollisionBounds
    }

export interface CollisionTransform {
  position: Vec3
  rotation: Vec3
  scale: Vec3
}

export interface CollisionManagedActor {
  id: string
  name?: string
  renderSource: CollisionRenderSource | null
  transform: CollisionTransform
  policy?: Partial<CollisionPolicy> | null
  sourceFingerprint?: string
  generatorVersion?: string
}

export interface CollisionBounds {
  min: Vec3
  max: Vec3
  size: Vec3
  center: Vec3
}

export interface GeneratedCollisionProduct
  extends Omit<
    EngineGeneratedCollisionProduct,
    | 'cacheKey'
    | 'sourceDescriptor'
    | 'sourceMeshFingerprint'
    | 'transformFingerprint'
    | 'policyFingerprint'
    | 'shape'
  > {
  cacheKey: string
  sourceDescriptor: string
  sourceMeshFingerprint: string
  transformFingerprint: string
  policyFingerprint: string
  shape: CollisionGeneratedShape
}

export interface LiveCollisionProduct {
  actorId: string
  cacheKey: string
  shape: CollisionGeneratedShape
  transform: CollisionTransform
  localBounds: CollisionBounds
  friction?: number
  restitution?: number
  sensor: boolean
}

export interface CollisionActorState {
  actorId: string
  status: CollisionActorStatus
  generationKey: string | null
  sourceFingerprint: string | null
  policy: NormalizedCollisionPolicy | null
  product: GeneratedCollisionProduct | null
  liveProduct: LiveCollisionProduct | null
  errors: string[]
  warnings: string[]
  staleReason?: string
  updatedAt: string
}

export interface CollisionGenerationContext {
  actor: CollisionManagedActor
  policy: NormalizedCollisionPolicy
  sourceDescriptor: string
  sourceMeshUrl?: string
  sourceFingerprint: string
  transformFingerprint: string
  policyFingerprint: string
  cacheKey: string
  generatorVersion: string
}

export type CollisionProductGenerator = (
  context: CollisionGenerationContext,
) => GeneratedCollisionProduct | Promise<GeneratedCollisionProduct>

export interface CollisionManagerOptions {
  generatorVersion?: string
  generator?: CollisionProductGenerator
  now?: () => Date
}

export type CollisionManager = {
  registerActor(actor: CollisionManagedActor): void
  unregisterActor(actorId: string): void
  updateActor(actor: CollisionManagedActor): void
  setPolicy(actorId: string, policy: CollisionPolicy): void
  getState(actorId: string): CollisionActorState | null
  getAllStates(): CollisionActorState[]
  requestRegenerate(actorId: string, reason: string): Promise<void>
  requestRegenerateAll(reason: string): Promise<void>
  getPublishProducts(): GeneratedCollisionProduct[]
}

const defaultTransform: CollisionTransform = {
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  scale: [1, 1, 1],
}

function cloneVec3(value: Vec3): Vec3 {
  return [value[0], value[1], value[2]]
}

function cloneTransform(transform: CollisionTransform): CollisionTransform {
  return {
    position: cloneVec3(transform.position),
    rotation: cloneVec3(transform.rotation),
    scale: cloneVec3(transform.scale),
  }
}

function cloneBounds(bounds: CollisionBounds): CollisionBounds {
  return {
    min: cloneVec3(bounds.min),
    max: cloneVec3(bounds.max),
    size: cloneVec3(bounds.size),
    center: cloneVec3(bounds.center),
  }
}

function normalizeFiniteNumber(value: unknown, fallback: number) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

function normalizeVec3(value: Vec3 | undefined, fallback: Vec3): Vec3 {
  return [
    normalizeFiniteNumber(value?.[0], fallback[0]),
    normalizeFiniteNumber(value?.[1], fallback[1]),
    normalizeFiniteNumber(value?.[2], fallback[2]),
  ]
}

function normalizeTransform(
  transform: CollisionManagedActor['transform'] | undefined,
): CollisionTransform {
  return {
    position: normalizeVec3(transform?.position, defaultTransform.position),
    rotation: normalizeVec3(transform?.rotation, defaultTransform.rotation),
    scale: normalizeVec3(transform?.scale, defaultTransform.scale),
  }
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(item => stableStringify(item)).join(',')}]`
  }
  if (value && typeof value === 'object') {
    return `{${Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

function fingerprint(value: unknown): string {
  return stableStringify(value)
}

function getPrimitiveBounds(
  geometry: PrimitiveGeometryKind,
  args: number[],
): CollisionBounds {
  if (geometry === 'cylinder') {
    const radius = Math.max(
      normalizeFiniteNumber(args[0], 0.5),
      normalizeFiniteNumber(args[1], 0.5),
    )
    const height = normalizeFiniteNumber(args[2], 1)
    return boundsFromSize([radius * 2, height, radius * 2])
  }

  if (
    geometry === 'octahedron' ||
    geometry === 'tetrahedron' ||
    geometry === 'icosahedron' ||
    geometry === 'dodecahedron'
  ) {
    const radius = normalizeFiniteNumber(args[0], 0.5)
    return boundsFromSize([radius * 2, radius * 2, radius * 2])
  }

  if (geometry === 'torus') {
    const radius = normalizeFiniteNumber(args[0], 0.5)
    const tube = normalizeFiniteNumber(args[1], 0.2)
    const diameter = (radius + tube) * 2
    return boundsFromSize([diameter, tube * 2, diameter])
  }

  return boundsFromSize([
    normalizeFiniteNumber(args[0], 1),
    normalizeFiniteNumber(args[1], 1),
    normalizeFiniteNumber(args[2], 1),
  ])
}

function boundsFromSize(size: Vec3): CollisionBounds {
  const normalizedSize = normalizeVec3(size, [1, 1, 1])
  return {
    min: [
      -normalizedSize[0] / 2,
      -normalizedSize[1] / 2,
      -normalizedSize[2] / 2,
    ],
    max: [normalizedSize[0] / 2, normalizedSize[1] / 2, normalizedSize[2] / 2],
    size: normalizedSize,
    center: [0, 0, 0],
  }
}

function scaleBounds(bounds: CollisionBounds, scale: Vec3): CollisionBounds {
  const scaledSize: Vec3 = [
    Math.abs(bounds.size[0] * scale[0]),
    Math.abs(bounds.size[1] * scale[1]),
    Math.abs(bounds.size[2] * scale[2]),
  ]
  return {
    ...boundsFromSize(scaledSize),
    center: [
      bounds.center[0] * scale[0],
      bounds.center[1] * scale[1],
      bounds.center[2] * scale[2],
    ],
  }
}

function resolveSourceDescriptor(source: CollisionRenderSource | null): {
  descriptor: string
  meshUrl?: string
  sourceFingerprint: string
  localBounds: CollisionBounds
  warnings: string[]
} | null {
  if (!source) return null

  if (source.kind === 'primitive') {
    const descriptor = fingerprint({
      kind: source.kind,
      geometry: source.geometry,
      args: source.args,
    })
    return {
      descriptor,
      sourceFingerprint: source.fingerprint ?? descriptor,
      localBounds: getPrimitiveBounds(source.geometry, source.args),
      warnings: [],
    }
  }

  if (source.kind === 'prefab') {
    const descriptor = fingerprint({
      kind: source.kind,
      type: source.type,
      variant: source.variant ?? null,
      assetUrl: source.assetUrl ?? null,
    })
    return {
      descriptor,
      meshUrl: source.assetUrl,
      sourceFingerprint: source.fingerprint ?? descriptor,
      localBounds: source.localBounds
        ? cloneBounds(source.localBounds)
        : boundsFromSize([1, 1, 1]),
      warnings: source.localBounds
        ? []
        : [
            'Prefab bounds were not provided; generated product uses fallback bounds.',
          ],
    }
  }

  const descriptor = fingerprint({
    kind: source.kind,
    url: source.url,
  })
  return {
    descriptor,
    meshUrl: source.url,
    sourceFingerprint: source.fingerprint ?? descriptor,
    localBounds: source.localBounds
      ? cloneBounds(source.localBounds)
      : boundsFromSize([1, 1, 1]),
    warnings: source.localBounds
      ? []
      : [
          'Mesh bounds were not provided; generated product uses fallback bounds.',
        ],
  }
}

function getDefaultPolicyForSource(
  source: CollisionRenderSource | null,
): NormalizedCollisionPolicy {
  const quality =
    source?.kind === 'primitive'
      ? 'primitive'
      : source?.kind === 'terrain'
        ? 'simplifiedMesh'
        : 'simplifiedMesh'

  return {
    mode: 'auto',
    intent: source?.kind === 'terrain' ? 'walkable' : 'blocker',
    channel: 'worldStatic',
    quality,
    lodTier: 'source',
    sensor: false,
  }
}

function normalizePolicy(
  source: CollisionRenderSource | null,
  policy: Partial<CollisionPolicy> | null | undefined,
): NormalizedCollisionPolicy {
  const defaults = getDefaultPolicyForSource(source)
  const mode = policy?.mode ?? defaults.mode
  const intent =
    mode === 'trigger' ? 'trigger' : policy?.intent ?? defaults.intent
  const channel =
    mode === 'trigger' ? 'trigger' : policy?.channel ?? defaults.channel

  return {
    ...defaults,
    ...policy,
    mode,
    intent,
    channel,
    quality: policy?.quality ?? defaults.quality,
    lodTier: policy?.lodTier ?? defaults.lodTier,
    sensor: mode === 'trigger' ? true : policy?.sensor ?? defaults.sensor,
  }
}

function getGeneratedShape(
  source: CollisionRenderSource | null,
  policy: NormalizedCollisionPolicy,
): CollisionGeneratedShape {
  if (policy.quality === 'convexHull') return 'convexHull'
  if (policy.quality === 'trimesh') return 'trimesh'
  if (policy.quality === 'simplifiedMesh') return 'trimesh'
  if (source?.kind === 'primitive' && source.geometry === 'cylinder') {
    return 'capsule'
  }
  return 'cuboid'
}

function isMeshDerivedPolicy(policy: NormalizedCollisionPolicy) {
  return (
    policy.quality === 'convexHull' ||
    policy.quality === 'simplifiedMesh' ||
    policy.quality === 'trimesh'
  )
}

function isNonEmptyString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0
}

function isFiniteBounds(bounds: CollisionBounds | undefined) {
  return (
    Boolean(bounds) &&
    bounds!.min.every(Number.isFinite) &&
    bounds!.max.every(Number.isFinite) &&
    bounds!.size.every(value => Number.isFinite(value) && value > 0) &&
    bounds!.center.every(Number.isFinite)
  )
}

function validateGeneratedProductForPolicy(
  context: CollisionGenerationContext,
  source: CollisionRenderSource | null,
  policy: NormalizedCollisionPolicy,
  product: GeneratedCollisionProduct,
) {
  const errors: string[] = []
  const expectedShape = getGeneratedShape(source, policy)

  if (product.actorId !== context.actor.id) {
    errors.push('Generated product actor id does not match the actor.')
  }
  if (product.cacheKey !== context.cacheKey) {
    errors.push(
      'Generated product cache key does not match the requested generation.',
    )
  }
  if (product.sourceMeshFingerprint !== context.sourceFingerprint) {
    errors.push(
      'Generated product source fingerprint does not match the current source.',
    )
  }
  if (product.transformFingerprint !== context.transformFingerprint) {
    errors.push(
      'Generated product transform fingerprint does not match the current transform.',
    )
  }
  if (product.policyFingerprint !== context.policyFingerprint) {
    errors.push(
      'Generated product policy fingerprint does not match the current policy.',
    )
  }
  if (product.shape !== expectedShape) {
    errors.push(
      `Generated product shape ${product.shape} does not match ${policy.quality} policy shape ${expectedShape}.`,
    )
  }
  if (!isFiniteBounds(product.localBounds)) {
    errors.push('Generated product local bounds are missing or invalid.')
  }

  if (isMeshDerivedPolicy(policy)) {
    if (product.shape !== 'trimesh' && product.shape !== 'convexHull') {
      errors.push(
        `Generated product shape ${product.shape} cannot satisfy ${policy.quality} mesh-derived collision.`,
      )
    }
    if (!isNonEmptyString(product.artifactUrl)) {
      errors.push('Generated mesh-derived product is missing artifactUrl.')
    }
    if (!isNonEmptyString(product.metadataUrl)) {
      errors.push('Generated mesh-derived product is missing metadataUrl.')
    }
    if (!Number.isFinite(product.triangleCount)) {
      errors.push('Generated mesh-derived product is missing triangleCount.')
    }
    if (!Number.isFinite(product.vertexCount)) {
      errors.push('Generated mesh-derived product is missing vertexCount.')
    }
  }

  return errors
}

function createLiveProduct(
  product: GeneratedCollisionProduct,
  actor: CollisionManagedActor,
  policy: NormalizedCollisionPolicy,
): LiveCollisionProduct {
  return {
    actorId: actor.id,
    cacheKey: product.cacheKey,
    shape: product.shape,
    transform: cloneTransform(actor.transform),
    localBounds: cloneBounds(product.localBounds),
    friction: policy.friction,
    restitution: policy.restitution,
    sensor: policy.sensor,
  }
}

function createDisabledState(
  actorId: string,
  updatedAt: string,
  policy: NormalizedCollisionPolicy | null,
): CollisionActorState {
  return {
    actorId,
    status: 'disabled',
    generationKey: null,
    sourceFingerprint: null,
    policy,
    product: null,
    liveProduct: null,
    errors: [],
    warnings: [],
    updatedAt,
  }
}

function isPromiseLike<T>(value: T | Promise<T>): value is Promise<T> {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'then' in value &&
      typeof value.then === 'function',
  )
}

function createDefaultProduct(
  context: CollisionGenerationContext,
): GeneratedCollisionProduct {
  const source = context.actor.renderSource
  if (context.policy.quality !== 'primitive') {
    throw new Error(
      `No collision product generator is configured for ${context.policy.quality} collision products.`,
    )
  }
  if (source?.kind !== 'primitive' && !source?.localBounds) {
    throw new Error(
      'Primitive collision generation for mesh, prefab, and terrain sources requires local bounds or a custom generator.',
    )
  }

  const sourceResult = resolveSourceDescriptor(source)
  const localBounds = scaleBounds(
    sourceResult?.localBounds ?? boundsFromSize([1, 1, 1]),
    context.actor.transform.scale,
  )

  return {
    actorId: context.actor.id,
    cacheKey: context.cacheKey,
    sourceMeshUrl: context.sourceMeshUrl,
    sourceDescriptor: context.sourceDescriptor,
    sourceMeshFingerprint: context.sourceFingerprint,
    transformFingerprint: context.transformFingerprint,
    policyFingerprint: context.policyFingerprint,
    shape: getGeneratedShape(source, context.policy),
    localBounds,
    triangleCount:
      context.policy.quality === 'primitive'
        ? undefined
        : context.policy.maxTriangles,
    generatorVersion: context.generatorVersion,
  }
}

export class DefaultCollisionManager implements CollisionManager {
  private actors = new Map<string, CollisionManagedActor>()
  private states = new Map<string, CollisionActorState>()
  private products = new Map<string, GeneratedCollisionProduct>()
  private generationTokens = new Map<string, number>()
  private generatorVersion: string
  private generator: CollisionProductGenerator
  private now: () => Date

  constructor(options: CollisionManagerOptions = {}) {
    this.generatorVersion =
      options.generatorVersion ?? 'mesh-derived-collision-manager@1'
    this.generator = options.generator ?? createDefaultProduct
    this.now = options.now ?? (() => new Date())
  }

  registerActor(actor: CollisionManagedActor): void {
    const normalizedActor = this.normalizeActor(actor)
    this.actors.set(normalizedActor.id, normalizedActor)
    this.reconcileActor(normalizedActor, 'register')
  }

  unregisterActor(actorId: string): void {
    this.actors.delete(actorId)
    this.states.delete(actorId)
    this.generationTokens.delete(actorId)
  }

  updateActor(actor: CollisionManagedActor): void {
    const normalizedActor = this.normalizeActor(actor)
    this.actors.set(normalizedActor.id, normalizedActor)
    this.reconcileActor(normalizedActor, 'update')
  }

  setPolicy(actorId: string, policy: CollisionPolicy): void {
    const actor = this.actors.get(actorId)
    if (!actor) return
    this.updateActor({
      ...actor,
      policy,
    })
  }

  getState(actorId: string): CollisionActorState | null {
    const state = this.states.get(actorId)
    return state ? this.cloneState(state) : null
  }

  getAllStates(): CollisionActorState[] {
    return Array.from(this.states.values()).map(state => this.cloneState(state))
  }

  async requestRegenerate(actorId: string, reason: string): Promise<void> {
    const actor = this.actors.get(actorId)
    if (!actor) return
    await this.generateActor(actor, reason, true)
  }

  async requestRegenerateAll(reason: string): Promise<void> {
    await Promise.all(
      Array.from(this.actors.keys()).map(actorId =>
        this.requestRegenerate(actorId, reason),
      ),
    )
  }

  getPublishProducts(): GeneratedCollisionProduct[] {
    return Array.from(this.states.values())
      .filter(state => state.status === 'ready' && state.product)
      .map(state => ({
        ...state.product!,
        localBounds: cloneBounds(state.product!.localBounds),
      }))
  }

  private normalizeActor(actor: CollisionManagedActor): CollisionManagedActor {
    return {
      ...actor,
      transform: normalizeTransform(actor.transform),
      generatorVersion: actor.generatorVersion ?? this.generatorVersion,
    }
  }

  private invalidateGeneration(actorId: string): void {
    this.generationTokens.set(
      actorId,
      (this.generationTokens.get(actorId) ?? 0) + 1,
    )
  }

  private reconcileActor(actor: CollisionManagedActor, reason: string): void {
    const policy = normalizePolicy(actor.renderSource, actor.policy)
    const updatedAt = this.now().toISOString()

    if (policy.mode === 'none') {
      this.invalidateGeneration(actor.id)
      this.states.set(
        actor.id,
        createDisabledState(actor.id, updatedAt, policy),
      )
      return
    }

    const context = this.createGenerationContext(actor, policy)
    if (!context) {
      this.invalidateGeneration(actor.id)
      this.states.set(actor.id, {
        actorId: actor.id,
        status: 'failed',
        generationKey: null,
        sourceFingerprint: null,
        policy,
        product: null,
        liveProduct: null,
        errors: ['Collision is enabled but the actor has no render source.'],
        warnings: [],
        updatedAt,
      })
      return
    }

    const previous = this.states.get(actor.id)
    if (previous?.generationKey === context.cacheKey && previous.product) {
      this.states.set(actor.id, {
        ...previous,
        liveProduct: createLiveProduct(previous.product, actor, policy),
        updatedAt,
      })
      return
    }

    void this.generateActor(actor, reason, false)
  }

  private createGenerationContext(
    actor: CollisionManagedActor,
    policy: NormalizedCollisionPolicy,
  ): CollisionGenerationContext | null {
    const source = resolveSourceDescriptor(actor.renderSource)
    if (!source) return null

    const sourceFingerprint =
      actor.sourceFingerprint ?? source.sourceFingerprint
    const transformFingerprint = fingerprint({
      scale: actor.transform.scale,
    })
    const policyFingerprint = fingerprint(policy)
    const generatorVersion = actor.generatorVersion ?? this.generatorVersion
    const cacheKey = fingerprint({
      actorId: actor.id,
      sourceDescriptor: source.descriptor,
      sourceFingerprint,
      policyFingerprint,
      scaleFingerprint: transformFingerprint,
      generatorVersion,
    })

    return {
      actor,
      policy,
      sourceDescriptor: source.descriptor,
      sourceMeshUrl: source.meshUrl,
      sourceFingerprint,
      transformFingerprint,
      policyFingerprint,
      cacheKey,
      generatorVersion,
    }
  }

  private async generateActor(
    actor: CollisionManagedActor,
    reason: string,
    force: boolean,
  ): Promise<void> {
    const policy = normalizePolicy(actor.renderSource, actor.policy)
    const updatedAt = this.now().toISOString()

    if (policy.mode === 'none') {
      this.invalidateGeneration(actor.id)
      this.states.set(
        actor.id,
        createDisabledState(actor.id, updatedAt, policy),
      )
      return
    }

    const context = this.createGenerationContext(actor, policy)
    const source = resolveSourceDescriptor(actor.renderSource)
    if (!context || !source) {
      this.invalidateGeneration(actor.id)
      this.states.set(actor.id, {
        actorId: actor.id,
        status: 'failed',
        generationKey: null,
        sourceFingerprint: null,
        policy,
        product: null,
        liveProduct: null,
        errors: ['Collision is enabled but the actor has no render source.'],
        warnings: [],
        updatedAt,
      })
      return
    }

    const cached = force ? undefined : this.products.get(context.cacheKey)
    if (cached) {
      this.states.set(actor.id, {
        actorId: actor.id,
        status: 'ready',
        generationKey: context.cacheKey,
        sourceFingerprint: context.sourceFingerprint,
        policy,
        product: cached,
        liveProduct: createLiveProduct(cached, actor, policy),
        errors: [],
        warnings: source.warnings,
        updatedAt,
      })
      return
    }

    const token = (this.generationTokens.get(actor.id) ?? 0) + 1
    this.generationTokens.set(actor.id, token)
    this.states.set(actor.id, {
      actorId: actor.id,
      status: 'generating',
      generationKey: context.cacheKey,
      sourceFingerprint: context.sourceFingerprint,
      policy,
      product: null,
      liveProduct: null,
      errors: [],
      warnings: reason ? [`Regenerating collision: ${reason}`] : [],
      staleReason: reason,
      updatedAt,
    })

    try {
      const generated = this.generator(context)
      if (isPromiseLike(generated)) {
        const product = await generated
        this.commitGeneratedProduct(
          actor.id,
          token,
          actor,
          policy,
          product,
          source.warnings,
        )
        return
      }

      this.commitGeneratedProduct(
        actor.id,
        token,
        actor,
        policy,
        generated,
        source.warnings,
      )
    } catch (error) {
      if (this.generationTokens.get(actor.id) !== token) return
      this.states.set(actor.id, {
        actorId: actor.id,
        status: 'failed',
        generationKey: context.cacheKey,
        sourceFingerprint: context.sourceFingerprint,
        policy,
        product: null,
        liveProduct: null,
        errors: [
          error instanceof Error
            ? error.message
            : 'Collision generation failed with an unknown error.',
        ],
        warnings: source.warnings,
        updatedAt: this.now().toISOString(),
      })
    }
  }

  private commitGeneratedProduct(
    actorId: string,
    token: number,
    actor: CollisionManagedActor,
    policy: NormalizedCollisionPolicy,
    product: GeneratedCollisionProduct,
    warnings: string[],
  ): void {
    if (this.generationTokens.get(actorId) !== token) return
    const currentActor = this.actors.get(actorId)
    if (!currentActor) return
    const currentPolicy = normalizePolicy(
      currentActor.renderSource,
      currentActor.policy,
    )
    const currentContext = this.createGenerationContext(
      currentActor,
      currentPolicy,
    )
    if (!currentContext || currentContext.cacheKey !== product.cacheKey) {
      this.states.set(actorId, {
        actorId,
        status: 'stale',
        generationKey: product.cacheKey,
        sourceFingerprint: product.sourceMeshFingerprint,
        policy,
        product: null,
        liveProduct: null,
        errors: [],
        warnings,
        staleReason:
          'Generated product no longer matches the actor source, policy, or scale.',
        updatedAt: this.now().toISOString(),
      })
      return
    }
    const productErrors = validateGeneratedProductForPolicy(
      currentContext,
      currentActor.renderSource,
      currentPolicy,
      product,
    )
    if (productErrors.length > 0) {
      this.states.set(actorId, {
        actorId,
        status: 'failed',
        generationKey: currentContext.cacheKey,
        sourceFingerprint: currentContext.sourceFingerprint,
        policy: currentPolicy,
        product: null,
        liveProduct: null,
        errors: productErrors,
        warnings,
        updatedAt: this.now().toISOString(),
      })
      return
    }

    this.products.set(product.cacheKey, product)
    this.states.set(actorId, {
      actorId,
      status: 'ready',
      generationKey: product.cacheKey,
      sourceFingerprint: product.sourceMeshFingerprint,
      policy: currentPolicy,
      product,
      liveProduct: createLiveProduct(product, currentActor, currentPolicy),
      errors: [],
      warnings,
      updatedAt: this.now().toISOString(),
    })
  }

  private cloneState(state: CollisionActorState): CollisionActorState {
    return {
      ...state,
      policy: state.policy ? { ...state.policy } : null,
      product: state.product
        ? {
            ...state.product,
            localBounds: cloneBounds(state.product.localBounds),
          }
        : null,
      liveProduct: state.liveProduct
        ? {
            ...state.liveProduct,
            transform: cloneTransform(state.liveProduct.transform),
            localBounds: cloneBounds(state.liveProduct.localBounds),
          }
        : null,
      errors: [...state.errors],
      warnings: [...state.warnings],
    }
  }
}

export function createCollisionManager(
  options?: CollisionManagerOptions,
): CollisionManager {
  return new DefaultCollisionManager(options)
}
