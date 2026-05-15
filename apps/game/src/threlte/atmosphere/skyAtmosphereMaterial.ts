import * as THREE from 'three'
import { DEFAULT_RUNTIME_ATMOSPHERE } from './buildRuntimeAtmosphere'
import type { RuntimeAtmosphereDefinition } from './runtimeAtmosphereTypes'

export type SkyAtmosphereDefinition = RuntimeAtmosphereDefinition
export const DEFAULT_SKY_ATMOSPHERE = DEFAULT_RUNTIME_ATMOSPHERE

export type SkyAtmosphereMaterial = THREE.ShaderMaterial & {
  envMap?: THREE.Texture | null
  allowOverride?: boolean
}

function finiteNumberOrDefault(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback
}

function clampNumber(
  value: number,
  min: number,
  max: number,
  fallback: number,
) {
  return Math.min(max, Math.max(min, finiteNumberOrDefault(value, fallback)))
}

function createSkyAtmosphereUniforms() {
  return {
    merkinSkyAtmosphereEnabled: { value: 0 },
    merkinSkyDistanceFogEnabled: { value: 0 },
    merkinSkyDistanceFogColor: { value: new THREE.Color('#7b8797') },
    merkinSkyDistanceFogDensity: { value: 0 },
    merkinSkyHeightFogEnabled: { value: 0 },
    merkinSkyHeightFogColor: { value: new THREE.Color('#7b8797') },
    merkinSkyHeightFogDensity: { value: 0 },
    merkinSkyHeightFogFloor: { value: 0 },
    merkinSkyHeightFogCeiling: { value: 1 },
    merkinSkyAerialPerspectiveEnabled: { value: 0 },
    merkinSkyAerialSkyOcclusion: { value: 1 },
    merkinSkyAerialHorizonBoost: { value: 0 },
    merkinSkyCameraPosition: { value: new THREE.Vector3() },
    merkinSkyRadius: { value: 900 },
  }
}

function createSkyAtmosphereVertexShader(vertexShader: string) {
  return vertexShader
    .replace(
      'varying vec3 vWorldDirection;',
      `
varying vec3 vWorldDirection;
varying vec3 vMerkinSkyWorldPosition;
      `.trim(),
    )
    .replace(
      '#include <project_vertex>',
      `
#include <project_vertex>
vMerkinSkyWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
      `.trim(),
    )
}

function createSkyAtmosphereFragmentShader(fragmentShader: string) {
  return fragmentShader
    .replace(
      'varying vec3 vWorldDirection;',
      `
varying vec3 vWorldDirection;
varying vec3 vMerkinSkyWorldPosition;

uniform float merkinSkyAtmosphereEnabled;
uniform float merkinSkyDistanceFogEnabled;
uniform vec3 merkinSkyDistanceFogColor;
uniform float merkinSkyDistanceFogDensity;
uniform float merkinSkyHeightFogEnabled;
uniform vec3 merkinSkyHeightFogColor;
uniform float merkinSkyHeightFogDensity;
uniform float merkinSkyHeightFogFloor;
uniform float merkinSkyHeightFogCeiling;
uniform float merkinSkyAerialPerspectiveEnabled;
uniform float merkinSkyAerialSkyOcclusion;
uniform float merkinSkyAerialHorizonBoost;
uniform vec3 merkinSkyCameraPosition;
uniform float merkinSkyRadius;

float merkinSkyExp2FogFactor(float density, float depth) {
  float safeDensity = max(density, 0.0);
  float safeDepth = max(depth, 0.0);
  return 1.0 - exp(-safeDensity * safeDensity * safeDepth * safeDepth);
}

float merkinSkyHeightMask(float worldY) {
  float floorY = min(merkinSkyHeightFogFloor, merkinSkyHeightFogCeiling - 0.001);
  float ceilingY = max(merkinSkyHeightFogCeiling, floorY + 0.001);
  return 1.0 - smoothstep(floorY, ceilingY, worldY);
}

vec3 merkinApplySkyAtmosphere(vec3 sourceColor) {
  if (merkinSkyAtmosphereEnabled < 0.5 || merkinSkyAerialPerspectiveEnabled < 0.5) {
    return sourceColor;
  }

  vec3 skyVector = vMerkinSkyWorldPosition - merkinSkyCameraPosition;
  vec3 skyDirection = normalize(skyVector);
  float skyDepth = max(max(length(skyVector), merkinSkyRadius), 0.001);
  float upwardness = clamp(skyDirection.y, 0.0, 1.0);
  float horizonFactor = 1.0 - smoothstep(0.08, 0.82, upwardness);
  float horizonBoost = max(merkinSkyAerialHorizonBoost, 0.0);
  float zenithDepthScale = 0.14;
  float horizonDepthScale = 1.0 + horizonBoost;
  float atmosphericDepth = skyDepth * mix(zenithDepthScale, horizonDepthScale, horizonFactor);
  float occlusion = clamp(merkinSkyAerialSkyOcclusion, 0.0, 3.0);

  float distanceFog = merkinSkyDistanceFogEnabled *
    merkinSkyExp2FogFactor(merkinSkyDistanceFogDensity, atmosphericDepth);
  float heightFog = merkinSkyHeightFogEnabled *
    merkinSkyHeightMask(vMerkinSkyWorldPosition.y) *
    merkinSkyExp2FogFactor(merkinSkyHeightFogDensity, atmosphericDepth);

  vec3 color = sourceColor;
  color = mix(color, merkinSkyDistanceFogColor, clamp(distanceFog * occlusion, 0.0, 1.0));
  color = mix(color, merkinSkyHeightFogColor, clamp(heightFog * occlusion, 0.0, 1.0));
  return color;
}
      `.trim(),
    )
    .replace(
      'texColor.rgb *= backgroundIntensity;',
      `
texColor.rgb *= backgroundIntensity;
texColor.rgb = merkinApplySkyAtmosphere(texColor.rgb);
      `.trim(),
    )
}

export function createSkyAtmosphereMaterial(): SkyAtmosphereMaterial {
  const shader = THREE.ShaderLib.backgroundCube
  const material = new THREE.ShaderMaterial({
    name: 'MerkinSkyAtmosphereBackgroundCubeMaterial',
    uniforms: {
      ...THREE.UniformsUtils.clone(shader.uniforms),
      ...createSkyAtmosphereUniforms(),
    },
    vertexShader: createSkyAtmosphereVertexShader(shader.vertexShader),
    fragmentShader: createSkyAtmosphereFragmentShader(shader.fragmentShader),
    fog: false,
    side: THREE.BackSide,
    depthTest: false,
    depthWrite: false,
  }) as SkyAtmosphereMaterial

  material.allowOverride = false
  Object.defineProperty(material, 'envMap', {
    get() {
      return material.uniforms.envMap.value as THREE.Texture | null
    },
  })

  return material
}

export function createSkyAtmosphereGeometry() {
  const geometry = new THREE.BoxGeometry(1, 1, 1)
  geometry.deleteAttribute('normal')
  geometry.deleteAttribute('uv')
  return geometry
}

export function updateSkyAtmosphereUniforms(
  material: THREE.ShaderMaterial,
  atmosphere: SkyAtmosphereDefinition,
) {
  const heightFloor = finiteNumberOrDefault(atmosphere.heightFog.floor, 0)
  const heightCeiling = Math.max(
    heightFloor + 0.001,
    finiteNumberOrDefault(atmosphere.heightFog.ceiling, heightFloor + 1),
  )
  const distanceDensity = Math.max(
    0,
    finiteNumberOrDefault(atmosphere.distanceFog.density, 0),
  )
  const heightDensity = Math.max(
    0,
    finiteNumberOrDefault(atmosphere.heightFog.density, 0),
  )
  const distanceFogEnabled =
    atmosphere.enabled && atmosphere.distanceFog.enabled && distanceDensity > 0
  const heightFogEnabled =
    atmosphere.enabled && atmosphere.heightFog.enabled && heightDensity > 0
  const aerialPerspectiveEnabled =
    atmosphere.enabled &&
    atmosphere.aerialPerspective.enabled &&
    (distanceFogEnabled || heightFogEnabled)

  material.uniforms.merkinSkyAtmosphereEnabled.value = atmosphere.enabled
    ? 1
    : 0
  material.uniforms.merkinSkyDistanceFogEnabled.value = distanceFogEnabled
    ? 1
    : 0
  material.uniforms.merkinSkyDistanceFogColor.value.set(
    atmosphere.distanceFog.color,
  )
  material.uniforms.merkinSkyDistanceFogDensity.value = distanceDensity
  material.uniforms.merkinSkyHeightFogEnabled.value = heightFogEnabled ? 1 : 0
  material.uniforms.merkinSkyHeightFogColor.value.set(
    atmosphere.heightFog.color,
  )
  material.uniforms.merkinSkyHeightFogDensity.value = heightDensity
  material.uniforms.merkinSkyHeightFogFloor.value = heightFloor
  material.uniforms.merkinSkyHeightFogCeiling.value = heightCeiling
  material.uniforms.merkinSkyAerialPerspectiveEnabled.value =
    aerialPerspectiveEnabled ? 1 : 0
  material.uniforms.merkinSkyAerialSkyOcclusion.value = clampNumber(
    atmosphere.aerialPerspective.skyOcclusion,
    0,
    3,
    1,
  )
  material.uniforms.merkinSkyAerialHorizonBoost.value = clampNumber(
    atmosphere.aerialPerspective.horizonBoost,
    0,
    4,
    0,
  )
}

export function updateSkyAtmosphereCameraUniforms(
  material: THREE.ShaderMaterial,
  cameraPosition: THREE.Vector3,
  radius: number,
) {
  material.uniforms.merkinSkyCameraPosition.value.copy(cameraPosition)
  material.uniforms.merkinSkyRadius.value = Math.max(
    1,
    finiteNumberOrDefault(radius, 900),
  )
}
