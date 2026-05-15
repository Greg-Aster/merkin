import * as THREE from 'three'

export type AtmosphereShaderParameters = Parameters<
  THREE.Material['onBeforeCompile']
>[0]

export type AtmosphereShaderUniformInput = {
  heightFog: {
    enabled: boolean
    color: THREE.Color
    density: number
    floor: number
    ceiling: number
  }
}

export const ATMOSPHERE_SHADER_CACHE_KEY = 'merkin-scene-atmosphere-v1'

export function shaderSupportsAtmospherePatch(
  shader: AtmosphereShaderParameters,
) {
  return (
    shader.vertexShader.includes('#include <fog_pars_vertex>') &&
    shader.vertexShader.includes('#include <fog_vertex>') &&
    shader.fragmentShader.includes('#include <fog_pars_fragment>') &&
    shader.fragmentShader.includes('#include <fog_fragment>')
  )
}

export function setAtmosphereShaderUniforms(
  shader: AtmosphereShaderParameters,
  atmosphere: AtmosphereShaderUniformInput,
) {
  const { heightFog } = atmosphere

  shader.uniforms.merkinHeightFogColor ??= {
    value: heightFog.color.clone(),
  }
  shader.uniforms.merkinHeightFogDensity ??= {
    value: heightFog.density,
  }
  shader.uniforms.merkinHeightFogFloor ??= {
    value: heightFog.floor,
  }
  shader.uniforms.merkinHeightFogCeiling ??= {
    value: heightFog.ceiling,
  }
  shader.uniforms.merkinHeightFogEnabled ??= {
    value: heightFog.enabled ? 1 : 0,
  }

  shader.uniforms.merkinHeightFogColor.value.copy(heightFog.color)
  shader.uniforms.merkinHeightFogDensity.value = heightFog.density
  shader.uniforms.merkinHeightFogFloor.value = heightFog.floor
  shader.uniforms.merkinHeightFogCeiling.value = heightFog.ceiling
  shader.uniforms.merkinHeightFogEnabled.value = heightFog.enabled ? 1 : 0
}

export function injectAtmosphereShaderChunks(
  shader: AtmosphereShaderParameters,
) {
  if (!shaderSupportsAtmospherePatch(shader)) {
    return false
  }

  shader.vertexShader = shader.vertexShader
    .replace(
      '#include <fog_pars_vertex>',
      `
#include <fog_pars_vertex>
varying vec3 vMerkinHeightFogWorldPosition;
      `.trim(),
    )
    .replace(
      '#include <fog_vertex>',
      `
vec4 merkinHeightFogWorldPosition = vec4(transformed, 1.0);
#ifdef USE_BATCHING
  merkinHeightFogWorldPosition = batchingMatrix * merkinHeightFogWorldPosition;
#endif
#ifdef USE_INSTANCING
  merkinHeightFogWorldPosition = instanceMatrix * merkinHeightFogWorldPosition;
#endif
merkinHeightFogWorldPosition = modelMatrix * merkinHeightFogWorldPosition;
vMerkinHeightFogWorldPosition = merkinHeightFogWorldPosition.xyz;
#include <fog_vertex>
      `.trim(),
    )

  shader.fragmentShader = shader.fragmentShader
    .replace(
      '#include <fog_pars_fragment>',
      `
#include <fog_pars_fragment>
uniform vec3 merkinHeightFogColor;
uniform float merkinHeightFogDensity;
uniform float merkinHeightFogFloor;
uniform float merkinHeightFogCeiling;
uniform float merkinHeightFogEnabled;
varying vec3 vMerkinHeightFogWorldPosition;
      `.trim(),
    )
    .replace(
      '#include <fog_fragment>',
      `
#include <fog_fragment>
#ifdef USE_FOG
float merkinHeightFogMask = 1.0 - smoothstep(
  merkinHeightFogFloor,
  merkinHeightFogCeiling,
  vMerkinHeightFogWorldPosition.y
);
float merkinHeightFogDepth = max(vFogDepth, 0.0);
float merkinHeightFogStrength = max(merkinHeightFogDensity, 0.0) * merkinHeightFogEnabled;
float merkinHeightFogFactor = 1.0 - exp(
  -merkinHeightFogStrength * merkinHeightFogStrength * merkinHeightFogDepth * merkinHeightFogDepth
);
merkinHeightFogFactor = clamp(merkinHeightFogFactor * merkinHeightFogMask, 0.0, 1.0);
gl_FragColor.rgb = mix(gl_FragColor.rgb, merkinHeightFogColor, merkinHeightFogFactor);
#endif
      `.trim(),
    )

  return true
}
