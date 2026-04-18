import * as THREE from 'three'

import type {
  FrameStylizer,
  StylizerPalette,
  StylizerRenderOptions,
  StylizerRenderResult,
  StylizerSettings,
} from './types'

const fullscreenVertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

const stylizerFragmentShader = `
uniform sampler2D tDiffuse;
uniform vec2 resolution;
uniform float time;
uniform float posterizeLevels;
uniform float edgeStrength;
uniform float aberration;
uniform float glitchAmount;
uniform float grainAmount;
uniform float paletteMix;
uniform vec3 paletteShadow;
uniform vec3 paletteMidtone;
uniform vec3 paletteHighlight;

varying vec2 vUv;

float random(vec2 value) {
  return fract(sin(dot(value, vec2(12.9898, 78.233))) * 43758.5453123);
}

vec3 posterize(vec3 color, float levels) {
  float safeLevels = max(levels, 2.0);
  return floor(color * safeLevels) / (safeLevels - 1.0);
}

vec3 paletteRamp(float luminance) {
  vec3 lower = mix(paletteShadow, paletteMidtone, smoothstep(0.0, 0.58, luminance));
  vec3 upper = mix(paletteMidtone, paletteHighlight, smoothstep(0.42, 1.0, luminance));
  return mix(lower, upper, smoothstep(0.25, 0.85, luminance));
}

void main() {
  vec2 texel = 1.0 / resolution;
  float lineGlitch = sin((vUv.y * 140.0) + (time * 2.5)) * glitchAmount;
  float blockGlitch = step(0.82, random(vec2(floor(vUv.y * 22.0), floor(time * 3.0)))) * glitchAmount * 2.2;
  vec2 jitter = vec2(lineGlitch + blockGlitch, 0.0);

  vec2 redUv = clamp(vUv + jitter + vec2(aberration, 0.0), 0.0, 1.0);
  vec2 greenUv = clamp(vUv + jitter, 0.0, 1.0);
  vec2 blueUv = clamp(vUv + jitter - vec2(aberration, 0.0), 0.0, 1.0);

  vec3 stylized;
  stylized.r = texture2D(tDiffuse, redUv).r;
  stylized.g = texture2D(tDiffuse, greenUv).g;
  stylized.b = texture2D(tDiffuse, blueUv).b;

  vec3 left = texture2D(tDiffuse, clamp(vUv + vec2(-texel.x, 0.0), 0.0, 1.0)).rgb;
  vec3 right = texture2D(tDiffuse, clamp(vUv + vec2(texel.x, 0.0), 0.0, 1.0)).rgb;
  vec3 up = texture2D(tDiffuse, clamp(vUv + vec2(0.0, texel.y), 0.0, 1.0)).rgb;
  vec3 down = texture2D(tDiffuse, clamp(vUv + vec2(0.0, -texel.y), 0.0, 1.0)).rgb;

  float edge = length(stylized - left) + length(stylized - right);
  edge += length(stylized - up) + length(stylized - down);
  edge = smoothstep(0.18, 0.18 + (0.22 / max(edgeStrength, 0.01)), edge * edgeStrength);

  vec3 quantized = posterize(stylized, posterizeLevels);
  float luminance = dot(quantized, vec3(0.2126, 0.7152, 0.0722));
  vec3 mapped = paletteRamp(luminance);
  vec3 mixed = mix(quantized, mapped, clamp(paletteMix, 0.0, 1.0));
  vec3 outlined = mix(mixed, paletteShadow * 0.45, edge);

  float grain = (random(vUv + time) - 0.5) * grainAmount;
  gl_FragColor = vec4(clamp(outlined + grain, 0.0, 1.0), 1.0);
}
`

const defaultSettings: StylizerSettings = {
  posterizeLevels: 5,
  edgeStrength: 1.4,
  aberration: 0.004,
  glitchAmount: 0.018,
  grainAmount: 0.03,
  paletteMix: 0.85,
}

const defaultPalette: StylizerPalette = {
  shadow: '#090910',
  midtone: '#6154ff',
  highlight: '#f4dbff',
}

export class ShaderStylizer implements FrameStylizer {
  readonly name = 'shader-surrogate'

  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  private readonly geometry = new THREE.PlaneGeometry(2, 2)
  private readonly material = new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: null },
      resolution: { value: new THREE.Vector2(1, 1) },
      time: { value: 0 },
      posterizeLevels: { value: defaultSettings.posterizeLevels },
      edgeStrength: { value: defaultSettings.edgeStrength },
      aberration: { value: defaultSettings.aberration },
      glitchAmount: { value: defaultSettings.glitchAmount },
      grainAmount: { value: defaultSettings.grainAmount },
      paletteMix: { value: defaultSettings.paletteMix },
      paletteShadow: { value: new THREE.Color(defaultPalette.shadow) },
      paletteMidtone: { value: new THREE.Color(defaultPalette.midtone) },
      paletteHighlight: { value: new THREE.Color(defaultPalette.highlight) },
    },
    vertexShader: fullscreenVertexShader,
    fragmentShader: stylizerFragmentShader,
    depthTest: false,
    depthWrite: false,
  })

  private readonly quad = new THREE.Mesh(this.geometry, this.material)

  constructor(
    palette: StylizerPalette = defaultPalette,
    settings: Partial<StylizerSettings> = {},
  ) {
    this.scene.add(this.quad)
    this.setPalette(palette)
    this.setSettings(settings)
  }

  resize(width: number, height: number) {
    this.material.uniforms.resolution.value.set(width, height)
  }

  setPalette(palette: StylizerPalette) {
    this.material.uniforms.paletteShadow.value.set(palette.shadow)
    this.material.uniforms.paletteMidtone.value.set(palette.midtone)
    this.material.uniforms.paletteHighlight.value.set(palette.highlight)
  }

  setSettings(settings: Partial<StylizerSettings>) {
    const next = { ...defaultSettings, ...settings }
    this.material.uniforms.posterizeLevels.value = next.posterizeLevels
    this.material.uniforms.edgeStrength.value = next.edgeStrength
    this.material.uniforms.aberration.value = next.aberration
    this.material.uniforms.glitchAmount.value = next.glitchAmount
    this.material.uniforms.grainAmount.value = next.grainAmount
    this.material.uniforms.paletteMix.value = next.paletteMix
  }

  render(
    renderer: THREE.WebGLRenderer,
    inputTarget: THREE.WebGLRenderTarget,
    outputTarget: THREE.WebGLRenderTarget | null,
    elapsed: number,
    options?: StylizerRenderOptions,
  ): StylizerRenderResult {
    this.material.uniforms.tDiffuse.value = inputTarget.texture
    this.material.uniforms.time.value = elapsed
    renderer.setRenderTarget(outputTarget)
    renderer.render(this.scene, this.camera)

    return {
      inferenceTriggered: options?.runInference === true,
    }
  }

  dispose() {
    this.geometry.dispose()
    this.material.dispose()
  }
}
