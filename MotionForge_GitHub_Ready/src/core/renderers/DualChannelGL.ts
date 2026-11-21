const VERTEX_SHADER = `#version 300 es
in vec2 a_position;
in vec2 a_uv;
out vec2 v_uv;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_uv = a_uv;
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_video;
uniform int u_layout; // 0: AlphaLeft_RGBRight, 1: RGBLeft_AlphaRight, 2: TopBottom
uniform int u_removeBlackBg; // 0: disabled, 1: enabled
uniform float u_blackThreshold;
uniform float u_blackSoftness;

void main() {
  if (u_removeBlackBg == 1) {
    vec4 color = texture(u_video, v_uv);
    float maxComponent = max(color.r, max(color.g, color.b));
    float alpha = smoothstep(u_blackThreshold, u_blackThreshold + u_blackSoftness, maxComponent);
    // Un-premultiply to restore true colors
    vec3 trueColor = alpha > 0.001 ? color.rgb / alpha : color.rgb;
    fragColor = vec4(trueColor, alpha);
    return;
  }

  vec2 rgbUV;
  vec2 alphaUV;

  if (u_layout == 0) {
    // Alpha Left, RGB Right
    alphaUV = vec2(v_uv.x * 0.5, v_uv.y);
    rgbUV   = vec2(0.5 + v_uv.x * 0.5, v_uv.y);
  } else if (u_layout == 1) {
    // RGB Left, Alpha Right
    rgbUV   = vec2(v_uv.x * 0.5, v_uv.y);
    alphaUV = vec2(0.5 + v_uv.x * 0.5, v_uv.y);
  } else {
    // Top / Bottom: Alpha Top, RGB Bottom
    alphaUV = vec2(v_uv.x, v_uv.y * 0.5);
    rgbUV   = vec2(v_uv.x, 0.5 + v_uv.y * 0.5);
  }

  vec3 rgb = texture(u_video, rgbUV).rgb;
  float alpha = texture(u_video, alphaUV).r;

  fragColor = vec4(rgb, alpha);
}
`;

export class DualChannelGLRenderer {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext | null;
  private program: WebGLProgram | null = null;
  private texture: WebGLTexture | null = null;
  private vao: WebGLVertexArrayObject | null = null;
  private positionBuffer: WebGLBuffer | null = null;

  // Uniform locations
  private uVideoLoc: WebGLUniformLocation | null = null;
  private uLayoutLoc: WebGLUniformLocation | null = null;
  private uRemoveBlackBgLoc: WebGLUniformLocation | null = null;
  private uBlackThresholdLoc: WebGLUniformLocation | null = null;
  private uBlackSoftnessLoc: WebGLUniformLocation | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: false });
    if (!this.gl) {
      console.warn('WebGL2 not supported, falling back to basic 2D context');
      return;
    }
    this.initGL();
  }

  private initGL() {
    const gl = this.gl;
    if (!gl) return;

    const vs = this.compileShader(gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = this.compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      return;
    }

    this.program = program;

    // Get locations
    this.uVideoLoc = gl.getUniformLocation(program, 'u_video');
    this.uLayoutLoc = gl.getUniformLocation(program, 'u_layout');
    this.uRemoveBlackBgLoc = gl.getUniformLocation(program, 'u_removeBlackBg');
    this.uBlackThresholdLoc = gl.getUniformLocation(program, 'u_blackThreshold');
    this.uBlackSoftnessLoc = gl.getUniformLocation(program, 'u_blackSoftness');

    // Create quad: 2 triangles [x, y, u, v]
    // WebGL textures are typically inverted on Y compared to canvas
    const quad = new Float32Array([
      -1, -1, 0, 1,
       1, -1, 1, 1,
      -1,  1, 0, 0,
      -1,  1, 0, 0,
       1, -1, 1, 1,
       1,  1, 1, 0,
    ]);

    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);

    this.positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);

    const aPosLoc = gl.getAttribLocation(program, 'a_position');
    const aUvLoc = gl.getAttribLocation(program, 'a_uv');

    gl.enableVertexAttribArray(aPosLoc);
    gl.vertexAttribPointer(aPosLoc, 2, gl.FLOAT, false, 16, 0);

    gl.enableVertexAttribArray(aUvLoc);
    gl.vertexAttribPointer(aUvLoc, 2, gl.FLOAT, false, 16, 8);

    // Create texture
    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  }

  private compileShader(type: number, source: string): WebGLShader | null {
    const gl = this.gl;
    if (!gl) return null;
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  public render(
    source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
    layout: 'alpha-left' | 'rgb-left' | 'top-bottom' = 'alpha-left',
    removeBlackBg: boolean = false,
    blackThreshold: number = 0.05,
    blackSoftness: number = 0.15
  ) {
    const gl = this.gl;
    if (!gl || !this.program || !this.texture || !this.vao) return;

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);

    gl.uniform1i(this.uVideoLoc, 0);

    let layoutInt = 0;
    if (layout === 'rgb-left') layoutInt = 1;
    if (layout === 'top-bottom') layoutInt = 2;
    gl.uniform1i(this.uLayoutLoc, layoutInt);

    gl.uniform1i(this.uRemoveBlackBgLoc, removeBlackBg ? 1 : 0);
    gl.uniform1f(this.uBlackThresholdLoc, blackThreshold);
    gl.uniform1f(this.uBlackSoftnessLoc, blackSoftness);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  public destroy() {
    const gl = this.gl;
    if (!gl) return;
    if (this.texture) gl.deleteTexture(this.texture);
    if (this.positionBuffer) gl.deleteBuffer(this.positionBuffer);
    if (this.vao) gl.deleteVertexArray(this.vao);
    if (this.program) gl.deleteProgram(this.program);
    this.gl = null;
  }
}
