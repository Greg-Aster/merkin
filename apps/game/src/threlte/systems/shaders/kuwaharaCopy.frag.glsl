uniform sampler2D inputBuffer;

in vec2 vUv;

out vec4 fragColor;

void main() {
  fragColor = textureLod(inputBuffer, vUv, 0.0);
}
