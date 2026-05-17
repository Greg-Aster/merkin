uniform sampler2D inputBuffer;
uniform vec2 texelSize;

in vec2 vUv;

out vec4 fragColor;

float kuwaharaLuminance(vec3 color) {
  return dot(color, vec3(0.299, 0.587, 0.114));
}

float sampleLuma(vec2 offset) {
  return kuwaharaLuminance(textureLod(inputBuffer, clamp(vUv + offset, vec2(0.0), vec2(1.0)), 0.0).rgb);
}

void main() {
  float tl = sampleLuma(texelSize * vec2(-1.0, -1.0));
  float tc = sampleLuma(texelSize * vec2(0.0, -1.0));
  float tr = sampleLuma(texelSize * vec2(1.0, -1.0));
  float ml = sampleLuma(texelSize * vec2(-1.0, 0.0));
  float mr = sampleLuma(texelSize * vec2(1.0, 0.0));
  float bl = sampleLuma(texelSize * vec2(-1.0, 1.0));
  float bc = sampleLuma(texelSize * vec2(0.0, 1.0));
  float br = sampleLuma(texelSize * vec2(1.0, 1.0));

  float gx = -tl - 2.0 * ml - bl + tr + 2.0 * mr + br;
  float gy = -tl - 2.0 * tc - tr + bl + 2.0 * bc + br;

  fragColor = vec4(gx * gx, gy * gy, gx * gy, 1.0);
}
