import * as THREE from 'three'
import type { RuntimeAtmosphereDefinition } from './runtimeAtmosphereTypes'

type Uniform<T> = { value: T }

export type DepthFogShaderUniforms = {
  tDiffuse: Uniform<THREE.Texture | null>
  tDepth: Uniform<THREE.Texture | null>
  projectionMatrixInverse: Uniform<THREE.Matrix4>
  viewMatrixInverse: Uniform<THREE.Matrix4>
  fogCameraPosition: Uniform<THREE.Vector3>
  cameraFar: Uniform<number>
  depthFogEnabled: Uniform<number>
  distanceFogEnabled: Uniform<number>
  distanceFogColor: Uniform<THREE.Color>
  distanceFogDensity: Uniform<number>
  heightFogEnabled: Uniform<number>
  heightFogColor: Uniform<THREE.Color>
  heightFogDensity: Uniform<number>
  heightFogFloor: Uniform<number>
  heightFogCeiling: Uniform<number>
  heightFogFalloff: Uniform<number>
  skyFogEnabled: Uniform<number>
  skyFogParticipation: Uniform<number>
  skyFogOcclusion: Uniform<number>
  skyFogHorizonBoost: Uniform<number>
  skyFogFalloff: Uniform<number>
}

export type DepthFogUniformTarget = {
  uniforms: DepthFogShaderUniforms
  enabled?: boolean
}

function finiteNumberOrDefault(value: number | undefined, fallback: number) {
  return Number.isFinite(value) ? (value as number) : fallback
}

function clampNumber(value: number | undefined, min: number, max: number) {
  return Math.min(max, Math.max(min, finiteNumberOrDefault(value, min)))
}

function colorOrFallback(value: string | undefined, fallback: string) {
  try {
    return new THREE.Color(value ?? fallback)
  } catch {
    return new THREE.Color(fallback)
  }
}

export function isRuntimeDepthFogActive(
  atmosphere: RuntimeAtmosphereDefinition | undefined,
) {
  if (!atmosphere?.enabled) return false
  return (
    (atmosphere.distanceFog.enabled && atmosphere.distanceFog.density > 0) ||
    (atmosphere.heightFog.enabled && atmosphere.heightFog.density > 0)
  )
}

export function createDepthFogShader() {
  const uniforms: DepthFogShaderUniforms = {
    tDiffuse: { value: null },
    tDepth: { value: null },
    projectionMatrixInverse: { value: new THREE.Matrix4() },
    viewMatrixInverse: { value: new THREE.Matrix4() },
    fogCameraPosition: { value: new THREE.Vector3() },
    cameraFar: { value: 1000 },
    depthFogEnabled: { value: 0 },
    distanceFogEnabled: { value: 0 },
    distanceFogColor: { value: new THREE.Color('#7b8797') },
    distanceFogDensity: { value: 0 },
    heightFogEnabled: { value: 0 },
    heightFogColor: { value: new THREE.Color('#7b8797') },
    heightFogDensity: { value: 0 },
    heightFogFloor: { value: 0 },
    heightFogCeiling: { value: 1 },
    heightFogFalloff: { value: 1 },
    skyFogEnabled: { value: 0 },
    skyFogParticipation: { value: 0 },
    skyFogOcclusion: { value: 1 },
    skyFogHorizonBoost: { value: 0 },
    skyFogFalloff: { value: 1 },
  }

  return {
    uniforms,
    vertexShader: `
      varying vec2 vUv;

      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform sampler2D tDepth;
      uniform mat4 projectionMatrixInverse;
      uniform mat4 viewMatrixInverse;
      uniform vec3 fogCameraPosition;
      uniform float cameraFar;
      uniform float depthFogEnabled;
      uniform float distanceFogEnabled;
      uniform vec3 distanceFogColor;
      uniform float distanceFogDensity;
      uniform float heightFogEnabled;
      uniform vec3 heightFogColor;
      uniform float heightFogDensity;
      uniform float heightFogFloor;
      uniform float heightFogCeiling;
      uniform float heightFogFalloff;
      uniform float skyFogEnabled;
      uniform float skyFogParticipation;
      uniform float skyFogOcclusion;
      uniform float skyFogHorizonBoost;
      uniform float skyFogFalloff;

      varying vec2 vUv;

      float exp2FogFactor(float density, float depth) {
        float safeDensity = max(density, 0.0);
        float safeDepth = max(depth, 0.0);
        return 1.0 - exp(-safeDensity * safeDensity * safeDepth * safeDepth);
      }

      vec3 reconstructWorldPosition(float depth) {
        vec4 clipPosition = vec4(vUv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
        vec4 viewPosition = projectionMatrixInverse * clipPosition;
        viewPosition /= max(viewPosition.w, 0.000001);
        return (viewMatrixInverse * viewPosition).xyz;
      }

      vec3 getWorldViewDirection() {
        vec4 clipPosition = vec4(vUv * 2.0 - 1.0, 1.0, 1.0);
        vec4 viewPosition = projectionMatrixInverse * clipPosition;
        viewPosition /= max(viewPosition.w, 0.000001);
        return normalize(mat3(viewMatrixInverse) * normalize(viewPosition.xyz));
      }

      float getHeightFogMask(float worldY) {
        float floorY = min(heightFogFloor, heightFogCeiling - 0.001);
        float ceilingY = max(heightFogCeiling, floorY + 0.001);
        float linearMask = 1.0 - smoothstep(floorY, ceilingY, worldY);
        return pow(clamp(linearMask, 0.0, 1.0), max(heightFogFalloff, 0.001));
      }

      vec3 applyFog(vec3 sourceColor, float viewDepth, float heightMask, float skyScale) {
        float distanceFactor = distanceFogEnabled *
          exp2FogFactor(distanceFogDensity, viewDepth) *
          skyScale;
        float heightFactor = heightFogEnabled *
          heightMask *
          exp2FogFactor(heightFogDensity, viewDepth) *
          skyScale;
        float fogFactor = clamp(max(distanceFactor, heightFactor), 0.0, 1.0);
        float heightBlend = heightFactor / max(distanceFactor + heightFactor, 0.0001);
        vec3 fogColor = mix(distanceFogColor, heightFogColor, clamp(heightBlend, 0.0, 1.0));
        return mix(sourceColor, fogColor, fogFactor);
      }

      vec3 applySkyFog(vec3 sourceColor) {
        if (skyFogEnabled < 0.5) return sourceColor;

        vec3 viewDirection = getWorldViewDirection();
        float upwardness = clamp(viewDirection.y, 0.0, 1.0);
        float horizonMask = pow(
          clamp(1.0 - smoothstep(0.0, 0.72, upwardness), 0.0, 1.0),
          max(skyFogFalloff, 0.001)
        );
        if (horizonMask <= 0.0001) return sourceColor;

        float horizonDepthScale = 1.0 + max(skyFogHorizonBoost, 0.0);
        float skyDepth = max(cameraFar, 1.0) * mix(0.08, horizonDepthScale, horizonMask);
        float cameraHeightMask = getHeightFogMask(fogCameraPosition.y);
        float heightMask = max(cameraHeightMask, 0.65) * horizonMask;
        float skyScale = clamp(skyFogParticipation * skyFogOcclusion * horizonMask, 0.0, 2.0);
        return applyFog(sourceColor, skyDepth, heightMask, skyScale);
      }

      void main() {
        vec4 color = texture2D(tDiffuse, vUv);

        if (depthFogEnabled < 0.5) {
          gl_FragColor = color;
          return;
        }

        float depth = texture2D(tDepth, vUv).x;
        if (depth >= 0.999999) {
          gl_FragColor = vec4(applySkyFog(color.rgb), color.a);
          return;
        }

        vec3 worldPosition = reconstructWorldPosition(depth);
        float viewDepth = length(worldPosition - fogCameraPosition);
        float heightMask = getHeightFogMask(worldPosition.y);
        gl_FragColor = vec4(applyFog(color.rgb, viewDepth, heightMask, 1.0), color.a);
      }
    `,
  }
}

export function updateDepthFogShaderUniforms(
  target: DepthFogUniformTarget | null,
  {
    atmosphere,
    camera,
  }: {
    atmosphere: RuntimeAtmosphereDefinition
    camera: THREE.Camera
  },
) {
  if (!target) return

  const uniforms = target.uniforms
  const active = isRuntimeDepthFogActive(atmosphere)
  const distanceFogEnabled =
    active &&
    atmosphere.distanceFog.enabled &&
    atmosphere.distanceFog.density > 0
  const heightFogEnabled =
    active && atmosphere.heightFog.enabled && atmosphere.heightFog.density > 0
  const skyFogEnabled =
    active &&
    atmosphere.aerialPerspective.enabled &&
    atmosphere.aerialPerspective.skyParticipation > 0.001
  const heightFogFloor = finiteNumberOrDefault(atmosphere.heightFog.floor, 0)
  const heightFogCeiling = Math.max(
    heightFogFloor + 0.001,
    finiteNumberOrDefault(atmosphere.heightFog.ceiling, heightFogFloor + 1),
  )

  camera.updateMatrixWorld()

  uniforms.depthFogEnabled.value = active ? 1 : 0
  uniforms.projectionMatrixInverse.value.copy(camera.projectionMatrix).invert()
  uniforms.viewMatrixInverse.value.copy(camera.matrixWorld)
  uniforms.fogCameraPosition.value.setFromMatrixPosition(camera.matrixWorld)
  uniforms.cameraFar.value = Math.max(
    1,
    finiteNumberOrDefault(
      (camera as THREE.Camera & { far?: number }).far,
      1000,
    ),
  )
  uniforms.distanceFogEnabled.value = distanceFogEnabled ? 1 : 0
  uniforms.distanceFogColor.value.copy(
    colorOrFallback(atmosphere.distanceFog.color, '#7b8797'),
  )
  uniforms.distanceFogDensity.value = Math.max(
    0,
    finiteNumberOrDefault(atmosphere.distanceFog.density, 0),
  )
  uniforms.heightFogEnabled.value = heightFogEnabled ? 1 : 0
  uniforms.heightFogColor.value.copy(
    colorOrFallback(atmosphere.heightFog.color, '#7b8797'),
  )
  uniforms.heightFogDensity.value = Math.max(
    0,
    finiteNumberOrDefault(atmosphere.heightFog.density, 0),
  )
  uniforms.heightFogFloor.value = heightFogFloor
  uniforms.heightFogCeiling.value = heightFogCeiling
  uniforms.heightFogFalloff.value = Math.max(
    0.001,
    finiteNumberOrDefault(atmosphere.heightFog.falloff, 1),
  )
  uniforms.skyFogEnabled.value = skyFogEnabled ? 1 : 0
  uniforms.skyFogParticipation.value = clampNumber(
    atmosphere.aerialPerspective.skyParticipation,
    0,
    1,
  )
  uniforms.skyFogOcclusion.value = clampNumber(
    atmosphere.aerialPerspective.skyOcclusion,
    0,
    2,
  )
  uniforms.skyFogHorizonBoost.value = clampNumber(
    atmosphere.aerialPerspective.horizonBoost,
    0,
    4,
  )
  uniforms.skyFogFalloff.value = Math.max(
    0.001,
    finiteNumberOrDefault(atmosphere.aerialPerspective.skyFogFalloff, 1),
  )
  target.enabled = active
}
