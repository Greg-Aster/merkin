uniform sampler2D sceneDepth;
uniform vec2 texelSize;
uniform float cameraNear;
uniform float cameraFar;
uniform bool isOrthographic;

in vec2 vUv;

out vec4 fragColor;

float orthographicDepthToViewZ(float depth) {
  return depth * (cameraNear - cameraFar) - cameraNear;
}

float perspectiveDepthToViewZ(float depth) {
  return (cameraNear * cameraFar) / ((cameraFar - cameraNear) * depth - cameraFar);
}

float sampleSceneDistance(vec2 uv) {
  float depth = textureLod(sceneDepth, clamp(uv, vec2(0.0), vec2(1.0)), 0.0).x;
  if (depth >= 1.0) {
    return 1.0;
  }
  float viewZ = isOrthographic ? orthographicDepthToViewZ(depth) : perspectiveDepthToViewZ(depth);
  return clamp(-viewZ / max(cameraFar, cameraNear + 0.0001), 0.0, 1.0);
}

void main() {
  float center = sampleSceneDistance(vUv);
  float left = sampleSceneDistance(vUv - vec2(texelSize.x, 0.0));
  float right = sampleSceneDistance(vUv + vec2(texelSize.x, 0.0));
  float up = sampleSceneDistance(vUv - vec2(0.0, texelSize.y));
  float down = sampleSceneDistance(vUv + vec2(0.0, texelSize.y));
  float gradient = max(max(abs(center - left), abs(center - right)), max(abs(center - up), abs(center - down)));
  float edgeStrength = smoothstep(0.0015, 0.018, gradient);
  fragColor = vec4(center, edgeStrength, gradient, 1.0);
}
