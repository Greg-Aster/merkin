uniform sampler2D inputBuffer;
uniform vec2 texelSize;
uniform vec2 direction;

in vec2 vUv;

out vec4 fragColor;

void main() {
  vec2 stepUv = texelSize * direction;
  vec4 sum = textureLod(inputBuffer, clamp(vUv - stepUv * 2.0, vec2(0.0), vec2(1.0)), 0.0) * 0.06136;
  sum += textureLod(inputBuffer, clamp(vUv - stepUv, vec2(0.0), vec2(1.0)), 0.0) * 0.24477;
  sum += textureLod(inputBuffer, vUv, 0.0) * 0.38774;
  sum += textureLod(inputBuffer, clamp(vUv + stepUv, vec2(0.0), vec2(1.0)), 0.0) * 0.24477;
  sum += textureLod(inputBuffer, clamp(vUv + stepUv * 2.0, vec2(0.0), vec2(1.0)), 0.0) * 0.06136;
  fragColor = sum;
}
