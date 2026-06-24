export class Visualizer {
  constructor(canvas, audioManager) {
    this.canvas = canvas;
    this.audio = audioManager;
    this.gl = null;
    this.program = null;
    this.startTime = performance.now();

    // Uniform locations — these are the "inputs" we send to the shader
    this.uniforms = {
      resolution: null,
      time: null,
      bass: null,
      mid: null,
      treble: null,
      avg: null,
    };
  }

  // ─── Vertex Shader ─────────────────────────────────────────────────────────
  // This is boilerplate — just covers the full screen with two triangles
  _vertexShaderSource() {
    return `
      attribute vec2 position;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;
  }

  // ─── Fragment Shader ───────────────────────────────────────────────────────
  // This is where ALL the visuals live — every pixel is computed here
  _fragmentShaderSource() {
    return `
      precision highp float;

      uniform vec2  u_resolution; // Canvas size in pixels
      uniform float u_time;       // Seconds since start
      uniform float u_bass;       // 0–1 low frequency energy
      uniform float u_mid;        // 0–1 mid frequency energy
      uniform float u_treble;     // 0–1 high frequency energy
      uniform float u_avg;        // 0–1 overall energy

      // ── Helpers ──────────────────────────────────────────────────────────

      // Convert HSV to RGB — used for full spectrum color cycling
      vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
      }

      // Classic 2D hash — turns a vec2 into a pseudo-random float
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      // Smooth noise — interpolated hash for organic shapes
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f); // Smoothstep curve
        return mix(
          mix(hash(i + vec2(0,0)), hash(i + vec2(1,0)), u.x),
          mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x),
          u.y
        );
      }

      // Domain warping — feed noise back into itself for fluid folding effect
      // This is the core technique that gives the Xbox 360 visualizer its look
      float warpedNoise(vec2 p) {
        // First warp pass
        vec2 q = vec2(
          noise(p + vec2(0.0, 0.0)),
          noise(p + vec2(5.2, 1.3))
        );

        // Second warp pass — warp the warp for extra complexity
        vec2 r = vec2(
          noise(p + 4.0 * q + vec2(1.7, 9.2)),
          noise(p + 4.0 * q + vec2(8.3, 2.8))
        );

        return noise(p + 4.0 * r);
      }

      // ── Main ─────────────────────────────────────────────────────────────

      void main() {
        // Normalized UV coords — (0,0) center, aspect-ratio corrected
        vec2 uv = (gl_FragCoord.xy - u_resolution * 0.5) / min(u_resolution.x, u_resolution.y);

        // ── Tunnel Effect ──────────────────────────────────────────────────

        // Polar coordinates — angle and distance from center
        float angle = atan(uv.y, uv.x);
        float radius = length(uv);

        // Tunnel depth — divide by radius to create perspective
        // Bass pushes the tunnel walls in and out dramatically
        float depth = 0.3 / (radius + 0.05 + u_bass * 0.15);

        // Spiral coordinate — combine angle, depth, and time for rotation
        vec2 tunnelUV = vec2(
          angle / (2.0 * 3.14159) + u_time * 0.05,  // Slow rotation
          depth + u_time * (0.2 + u_avg * 0.4)        // Forward movement speeds with energy
        );

        // ── Domain Warp ────────────────────────────────────────────────────

        // Scale and warp the tunnel coordinates
        // Mid frequencies warp the space — creates the fluid folding
        float warp = warpedNoise(tunnelUV * 2.0 + u_mid * 0.8);

        // Secondary warp layer for extra complexity
        float warp2 = warpedNoise(tunnelUV * 4.0 - u_time * 0.1 + u_treble * 0.5);

        // Combine warps
        float pattern = warp * 0.7 + warp2 * 0.3;

        // ── Color ──────────────────────────────────────────────────────────

        // Hue cycles over time + shifts with bass for beat-synced color pops
        float hue = fract(
          u_time * 0.08          // Base slow cycle
          + pattern * 0.5        // Pattern drives local color variation
          + u_bass * 0.3         // Bass punches the hue forward on beat
        );

        // Saturation stays high — this is what makes it vibrant
        // Treble adds a slight desaturation shimmer on high frequencies
        float sat = 0.9 - u_treble * 0.2;

        // Brightness — pattern drives local brightness, energy boosts overall
        float bri = 0.4 + pattern * 0.6 + u_avg * 0.3;

        vec3 color = hsv2rgb(vec3(hue, sat, bri));

        // ── Vignette ───────────────────────────────────────────────────────

        // Darken the edges — focuses the eye on the center tunnel
        float vignette = 1.0 - smoothstep(0.4, 1.2, radius);
        color *= vignette;

        // ── Tunnel Center Glow ─────────────────────────────────────────────

        // Bright core that pulses with bass — the "eye" of the tunnel
        float glow = 0.015 / (radius + 0.01);
        float glowHue = fract(u_time * 0.08 + u_bass * 0.5);
        vec3 glowColor = hsv2rgb(vec3(glowHue, 0.6, 1.0));
        color += glowColor * glow * (1.0 + u_bass * 3.0);

        gl_FragColor = vec4(color, 1.0);
      }
    `;
  }

  // ─── WebGL Setup ───────────────────────────────────────────────────────────

  init() {
    this.gl = this.canvas.getContext('webgl');
    if (!this.gl) {
      console.error('WebGL not supported');
      return;
    }

    this._compileProgram();
    this._setupGeometry();
    this._cacheUniforms();
    this._setupResizeHandler();
    this._resize();
  }

  _compileShader(type, source) {
    const shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('Shader error:', this.gl.getShaderInfoLog(shader));
      return null;
    }
    return shader;
  }

  _compileProgram() {
    const gl = this.gl;
    const vert = this._compileShader(gl.VERTEX_SHADER, this._vertexShaderSource());
    const frag = this._compileShader(gl.FRAGMENT_SHADER, this._fragmentShaderSource());

    this.program = gl.createProgram();
    gl.attachShader(this.program, vert);
    gl.attachShader(this.program, frag);
    gl.linkProgram(this.program);
    gl.useProgram(this.program);
  }

  // Two triangles that cover the entire screen — the shader runs on every pixel
  _setupGeometry() {
    const gl = this.gl;
    const vertices = new Float32Array([
      -1, -1,   1, -1,  -1,  1,  // Triangle 1
      -1,  1,   1, -1,   1,  1,  // Triangle 2
    ]);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const position = gl.getAttribLocation(this.program, 'position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  }

  _cacheUniforms() {
    const gl = this.gl;
    this.uniforms.resolution = gl.getUniformLocation(this.program, 'u_resolution');
    this.uniforms.time       = gl.getUniformLocation(this.program, 'u_time');
    this.uniforms.bass       = gl.getUniformLocation(this.program, 'u_bass');
    this.uniforms.mid        = gl.getUniformLocation(this.program, 'u_mid');
    this.uniforms.treble     = gl.getUniformLocation(this.program, 'u_treble');
    this.uniforms.avg        = gl.getUniformLocation(this.program, 'u_avg');
  }

  _setupResizeHandler() {
    window.addEventListener('resize', () => this._resize());
  }

  _resize() {
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  // ─── Frequency Band Splitting ──────────────────────────────────────────────

  // Split the raw frequency array into bass / mid / treble bands
  // This gives the shader three distinct musical dimensions to react to
  _getFrequencyBands() {
    const data = this.audio.getFrequencyData();
    if (!data) return { bass: 0, mid: 0, treble: 0, avg: 0 };

    const len = data.length;

    // Bass: bottom 15% of frequency buckets
    const bassEnd   = Math.floor(len * 0.15);
    // Mid: 15%–60%
    const midEnd    = Math.floor(len * 0.60);
    // Treble: 60%–100%

    const avg = (arr, start, end) => {
      let sum = 0;
      for (let i = start; i < end; i++) sum += arr[i];
      return (sum / (end - start)) / 255;
    };

    return {
      bass:   avg(data, 0,       bassEnd),
      mid:    avg(data, bassEnd, midEnd),
      treble: avg(data, midEnd,  len),
      avg:    avg(data, 0,       len),
    };
  }

  // ─── Animation Loop ────────────────────────────────────────────────────────

  start() {
    this._animate();
  }

  _animate() {
    requestAnimationFrame(() => this._animate());

    const gl = this.gl;
    const time = (performance.now() - this.startTime) / 1000;
    const { bass, mid, treble, avg } = this._getFrequencyBands();

    // Send values to the shader as uniforms
    gl.uniform2f(this.uniforms.resolution, this.canvas.width, this.canvas.height);
    gl.uniform1f(this.uniforms.time,   time);
    gl.uniform1f(this.uniforms.bass,   bass);
    gl.uniform1f(this.uniforms.mid,    mid);
    gl.uniform1f(this.uniforms.treble, treble);
    gl.uniform1f(this.uniforms.avg,    avg);

    // Draw the two triangles — shader runs on every pixel between them
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
}