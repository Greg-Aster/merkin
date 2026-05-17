uniform sampler2D inputBuffer;
uniform sampler2D structureTensor;
uniform sampler2D depthMask;
uniform vec2 inputTexelSize;
uniform float radius;
uniform float mixAmount;
uniform float depthAwareEnabled;
uniform float nearDepthMix;
uniform float farDepthMix;
uniform float edgePreserveStrength;
uniform float distanceFadeStart;
uniform float distanceFadeEnd;
uniform float farRadiusScale;
uniform float edgeRadiusScale;

in vec2 vUv;

out vec4 fragColor;

const int KUWAHARA_RADIUS_MAX = 4;
const int KUWAHARA_SECTOR_COUNT = 4;
const int KUWAHARA_ANGLE_SAMPLE_COUNT = 5;

float sectorWeight(vec2 offset, float effectiveRadius) {
  float distanceFromCenter = length(offset);
  float normalizedDistance = distanceFromCenter / max(effectiveRadius, 1.0);
  return pow(max(0.0, 1.0 - normalizedDistance), 2.0);
}

mat2 getAnisotropyMatrix(vec4 tensor) {
  float jxx = tensor.r;
  float jyy = tensor.g;
  float jxy = tensor.b;
  float traceValue = jxx + jyy;
  float determinant = jxx * jyy - jxy * jxy;
  float discriminant = max(traceValue * traceValue - 4.0 * determinant, 0.0);
  float root = sqrt(discriminant);
  float lambdaA = 0.5 * (traceValue + root);
  float lambdaB = 0.5 * (traceValue - root);
  float anisotropy = clamp((lambdaA - lambdaB) / (lambdaA + lambdaB + 1e-5), 0.0, 1.0);
  float orientationAngle = 0.5 * atan(2.0 * jxy, jxx - jyy);
  vec2 direction = vec2(cos(orientationAngle), sin(orientationAngle));
  mat2 rotation = mat2(direction.x, -direction.y, direction.y, direction.x);
  float stretch = 1.0 + anisotropy * 1.8;
  float squeeze = 1.0 / stretch;
  return rotation * mat2(stretch, 0.0, 0.0, squeeze);
}

void evaluateSector(
  mat2 anisotropyMatrix,
  float sectorAngle,
  float effectiveRadius,
  out vec3 averageColor,
  out float variance
) {
  vec3 colorSum = vec3(0.0);
  vec3 squaredColorSum = vec3(0.0);
  float weightSum = 0.0;

  for (int r = 1; r <= KUWAHARA_RADIUS_MAX; r++) {
    float activeRadius = step(float(r), effectiveRadius + 0.5);
    float radialDistance = float(r);

    for (int a = 0; a < KUWAHARA_ANGLE_SAMPLE_COUNT; a++) {
      float angleOffset = (float(a) - 2.0) * 0.3926990817;
      float sampleAngle = sectorAngle + angleOffset;
      vec2 sectorOffset = vec2(cos(sampleAngle), sin(sampleAngle)) * radialDistance;
      vec2 sampleOffset = anisotropyMatrix * sectorOffset;
      vec2 sampleUv = clamp(vUv + sampleOffset * inputTexelSize, vec2(0.0), vec2(1.0));
      vec3 color = textureLod(inputBuffer, sampleUv, 0.0).rgb;
      float weight = sectorWeight(sectorOffset, effectiveRadius) * activeRadius;

      colorSum += color * weight;
      squaredColorSum += color * color * weight;
      weightSum += weight;
    }
  }

  averageColor = colorSum / max(weightSum, 1e-5);
  vec3 varianceColor = max(squaredColorSum / max(weightSum, 1e-5) - averageColor * averageColor, vec3(0.0));
  variance = dot(varianceColor, vec3(0.299, 0.587, 0.114));
}

void main() {
  vec4 tensor = textureLod(structureTensor, vUv, 0.0);
  vec2 mask = depthAwareEnabled > 0.5 ? textureLod(depthMask, vUv, 0.0).rg : vec2(0.0);
  float depthFade = smoothstep(distanceFadeStart, distanceFadeEnd, mask.r);
  float edgePreserve = clamp(mask.g * edgePreserveStrength, 0.0, 1.0);
  float depthMixScale = mix(nearDepthMix, farDepthMix, depthFade);
  float effectiveMix = clamp(mixAmount * depthMixScale * (1.0 - edgePreserve * 0.82), 0.0, 1.0);
  float radiusScale = mix(1.0, farRadiusScale, depthFade);
  radiusScale = mix(radiusScale, edgeRadiusScale, edgePreserve);
  float effectiveRadius = clamp(radius * radiusScale, 1.0, float(KUWAHARA_RADIUS_MAX));
  mat2 anisotropyMatrix = getAnisotropyMatrix(tensor);
  vec3 sourceColor = textureLod(inputBuffer, vUv, 0.0).rgb;
  vec3 bestColor = sourceColor;
  float bestVariance = 1.0e20;

  for (int sector = 0; sector < KUWAHARA_SECTOR_COUNT; sector++) {
    vec3 averageColor = vec3(0.0);
    float variance = 0.0;
    float sectorAngle = float(sector) * 6.28318530718 / float(KUWAHARA_SECTOR_COUNT);
    evaluateSector(anisotropyMatrix, sectorAngle, effectiveRadius, averageColor, variance);
    if (variance < bestVariance) {
      bestVariance = variance;
      bestColor = averageColor;
    }
  }

  fragColor = vec4(mix(sourceColor, bestColor, effectiveMix), 1.0);
}
