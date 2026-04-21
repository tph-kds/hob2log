export const liquidDistortionVertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const liquidDistortionFragmentShader = `
  precision highp float;

  varying vec2 vUv;

  uniform float u_time;
  uniform vec2 u_mouse;
  uniform float u_intensity;
  uniform vec3 u_color_a;
  uniform vec3 u_color_b;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);

    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));

    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(a, b, u.x) +
      (c - a) * u.y * (1.0 - u.x) +
      (d - b) * u.x * u.y;
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.55;

    for (int i = 0; i < 5; i++) {
      value += amplitude * noise(p);
      p = p * 2.0 + vec2(17.23, 9.91);
      amplitude *= 0.5;
    }

    return value;
  }

  void main() {
    vec2 uv = vUv;

    vec2 mouse = u_mouse;
    float distToMouse = distance(uv, mouse);
    float proximity = smoothstep(0.58, 0.0, distToMouse) * u_intensity;

    vec2 flow = vec2(
      fbm(uv * 4.4 + vec2(u_time * 0.3, -u_time * 0.2)),
      fbm(uv * 4.9 + vec2(-u_time * 0.2, u_time * 0.24))
    ) - 0.5;

    vec2 rippleDirection = normalize(uv - mouse + vec2(0.0001));
    float rippleWave = sin((distToMouse * 42.0) - (u_time * 7.0));

    float dripMask = smoothstep(0.42, 0.0, abs(uv.x - mouse.x));
    float dripTrail = smoothstep(mouse.y + 0.04, mouse.y - 0.42, uv.y);
    float dripNoise = fbm(vec2(uv.x * 19.0, uv.y * 7.0 + u_time * 1.2));
    float drips = dripMask * dripTrail * smoothstep(0.46, 0.74, dripNoise) * proximity;
    float halo = smoothstep(0.34, 0.0, distToMouse) * u_intensity;

    vec2 distortion = (flow * 0.14 + rippleDirection * rippleWave * 0.044 + vec2(0.0, -drips * 0.08)) * proximity;
    uv += distortion;

    float gradient = smoothstep(0.0, 1.0, uv.x);
    vec3 base = mix(u_color_a, u_color_b, gradient);

    float shimmer = fbm(uv * 10.0 + u_time * 0.6) * 0.24;
    vec3 breakupTint = vec3(0.29, 0.96, 1.0) * drips;
    vec3 haloTint = vec3(0.42, 0.92, 1.0) * halo * 0.32;
    vec3 color = base + vec3(shimmer * proximity) + breakupTint + haloTint;

    float vignette = smoothstep(1.15, 0.2, length((vUv - 0.5) * vec2(1.25, 1.0)));
    float alpha = (0.32 + proximity * 0.52 + drips * 0.28 + halo * 0.16) * vignette;

    gl_FragColor = vec4(color, alpha);
  }
`;
