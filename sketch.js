// Configuration
let s = 10;
const m = 115;
const n = 67;

// Render 2d point grid with mxn points in WEBGL
const canvas = document.getElementById("sketch");
const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false
});

function resizeCanvas() {
    canvas.width = window.devicePixelRatio * document.documentElement.clientWidth;
    canvas.height = window.devicePixelRatio * document.documentElement.clientHeight;
    if (canvas.height > canvas.width) {
        s = Math.min(canvas.width / n, canvas.height / m)
    } else {
        s = Math.min(canvas.width / m, canvas.height / n)
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// Compile Shaders
// Vertex shader
// Render Laposky curves
const vertexShader = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(vertexShader, `
    attribute vec2 pos;
    uniform float scale;
    uniform float offset;
    uniform float t;
    uniform bool gridFlip;
    void main() {
        vec2 grid = ((gridFlip ? pos.yx : pos.xy) - 0.5) * 2.0;
        float x = offset + t + pos.x * 10.0;
        vec2 a = vec2(sin(x * 0.3) * 0.5 + sin(x * 0.8) * 0.5, sin(x * 0.7) * 0.5 + sin(x * 0.1) * 0.5);
        vec2 b = vec2(sin(x * 0.5) * 0.5 + sin(x * 0.4) * 0.5, sin(x * 0.2) * 0.5 + sin(x * 0.9) * 0.5);
        vec2 p = mix(a, b, pos.y);
        gl_PointSize = mix(2.0, scale, pos.y * pos.x);
        gl_Position = vec4(mix(grid, p, smoothstep(3.0, 10.0, t)), 0.0, 1.0);
    }`);
gl.compileShader(vertexShader);
if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(vertexShader));
}
// Fragment shader
// Render antialiased circles
const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(fragmentShader, `
    precision mediump float;
    uniform vec4 color;
    uniform vec2 res;
    void main() {
        vec2 cxy = (gl_PointCoord - 0.5) * 2.0;
        float r = dot(cxy, cxy);
        if (r > 1.0) discard;
        gl_FragColor = vec4(color.rgba);
    }`);
gl.compileShader(fragmentShader);
if(!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(fragmentShader));
}
// Combine
const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);
gl.useProgram(program);

// Bind points
const positionLocation = gl.getAttribLocation(program, "pos");
const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
const positions = [];
for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
        positions.push(i / (m-1), j / (n-1));
    }
}
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
gl.enableVertexAttribArray(positionLocation);
gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

// Bind unifoms
const uOffset = gl.getUniformLocation(program, "offset");
const uT = gl.getUniformLocation(program, "t");
const uScale = gl.getUniformLocation(program, "scale");
const uColor = gl.getUniformLocation(program, "color");
const uRes = gl.getUniformLocation(program, "res");
const uGridFlip = gl.getUniformLocation(program, "gridFlip");

// Set uniforms
// Make the animation dependent on the time of day
const start = Date.now() / 1000;
gl.uniform1f(uOffset, start % 86400 - 43200);
gl.uniform1i(uGridFlip, canvas.height > canvas.width);

// Render loop
requestAnimationFrame(render);
function render() {
    // Update uniforms
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        gl.uniform4f(uColor, 1.0, 1.0, 1.0, 1.0);
    } else {
        gl.uniform4f(uColor, 0.0, 0.0, 0.0, 1.0);
    }
    const time = (Date.now() / 1000 - start);
    gl.uniform1f(uT, time);
    gl.uniform1f(uScale, s);
    gl.uniform2f(uRes, canvas.width, canvas.height);

    // Render
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, positions.length / 2);

    // Repeat
    requestAnimationFrame(render);
}