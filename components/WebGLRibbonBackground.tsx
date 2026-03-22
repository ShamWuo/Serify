import React, { useEffect, useRef } from 'react';

const vertexShaderSource = `
  attribute vec2 position;
  varying vec2 vUv;
  void main() {
    vUv = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const fragmentShaderSource = `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform vec2 uResolution;

  // Optimized Simplex 2D noise
  vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,-0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
    + i.x + vec3(0.0, i1.x, 1.0 ));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m ;
    m = m*m ;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 a0 = x - floor(x + 0.5);
    vec3 g = a0.x * vec3(x0.x,x12.xz) + h.x * vec3(x0.y,x12.yw);
    return 130.0 * dot(m, g);
  }

  void main() {
    float aspect = uResolution.x / uResolution.y;
    vec2 uv = vUv;
    uv.x *= aspect;
    
    // Background: Dark forest green, almost black (#021008)
    vec3 bgColor = vec3(0.0078, 0.0627, 0.0314);
    vec3 finalColor = bgColor;

    // Rich Satin Palette
    vec3 color1 = vec3(0.10, 0.29, 0.16);   // #1a4a2a
    vec3 color2 = vec3(0.176, 0.478, 0.27); // #2d7a45
    vec3 color3 = vec3(0.05, 0.168, 0.094); // #0d2b18
    vec3 highlight1 = vec3(0.353, 0.875, 0.5); // #5adf80
    vec3 highlight2 = vec3(0.56, 1.0, 0.69);   // #8fffb0

    for (int i = 0; i < 4; i++) {
        float fI = float(i);
        
        // Base X position (spread across the screen)
        float baseX = aspect * (0.2 + 0.2 * fI);
        
        // Slow downward flow and hypnotic sway
        float timeOffset = uTime * 0.15;
        float swayNoise = snoise(vec2(vUv.y * 1.2 + timeOffset, fI * 15.0));
        float ribbonX = baseX + swayNoise * 0.25;
        
        // Ribbon width: 250px-ish (normalized)
        float baseWidth = 0.22 + 0.05 * sin(uTime * 0.1 + fI);
        
        // Distance from ribbon center
        float dist = abs(uv.x - ribbonX);
        float normDist = dist / baseWidth;
        
        if (normDist < 1.0) {
            // "Volumetric" Height Profile (Like a curved cylinder)
            // normDist goes from 0 at peak to 1 at edge
            float height = sqrt(1.0 - normDist * normDist);
            
            // Calculate a fake "normal" for shading
            // Slope is the derivative of the circle: -x / sqrt(1-x^2)
            float slope = -normDist / max(0.001, height);
            vec3 normal = normalize(vec3(slope, 0.0, 1.0));
            
            // Apply slight twisting effect by rotating the normal
            float twist = sin(vUv.y * 3.0 + uTime * 0.2 + fI) * 0.3;
            normal.xy *= mat2(cos(twist), -sin(twist), sin(twist), cos(twist));
            
            // Lighting: Light source slightly above and to the left
            vec3 lightDir = normalize(vec3(0.5, 0.5, 1.0));
            float diff = max(0.0, dot(normal, lightDir));
            
            // Sharp Specular Highlight for "wet silk" look
            float spec = pow(diff, 40.0) * 2.5; // Sharper and brighter
            float ultraSpec = pow(diff, 120.0) * 1.5; // Pin-sharp reflection trace
            float broadSpec = pow(diff, 8.0) * 0.4;
            
            // Base Ribbon Color (Deep Green)
            vec3 ribbonColor = mix(color1, color2, sin(fI + uTime * 0.1) * 0.5 + 0.5);
            if (mod(fI, 2.0) == 1.0) ribbonColor = color3;
            
            // Valleys/Shadows: Darken edges and base
            float edgeShadow = smoothstep(0.0, 0.45, height);
            vec3 shadedColor = ribbonColor * (diff * 0.7 + 0.1);
            shadedColor *= edgeShadow;
            
            // Adding silk highlights along the peaks
            shadedColor = mix(shadedColor, highlight1, spec * 0.9);
            shadedColor = mix(shadedColor, highlight2, ultraSpec);
            shadedColor += highlight2 * broadSpec * 0.15;
            
            // Interaction with background: Opaque with soft edges
            float alpha = smoothstep(1.0, 0.95, normDist);
            
            // Z-layering simulation: simple mix based on index
            finalColor = mix(finalColor, shadedColor, alpha);
        }
    }

    // Final color grading
    finalColor *= 1.1; // Boost saturation slightly
    
    // Subtle vignette to focus on the center
    float vignette = 1.0 - length(vUv - 0.5) * 0.5;
    gl_FragColor = vec4(finalColor * vignette, 1.0);
  }
`;

const WebGLRibbonBackground: React.FC<{ className?: string }> = ({ className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl');
    if (!gl) {
      console.error('WebGL not supported');
      return;
    }

    const compileShader = (source: string, type: number) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertexShader = compileShader(vertexShaderSource, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(fragmentShaderSource, gl.FRAGMENT_SHADER);
    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program linking error:', gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const timeLocation = gl.getUniformLocation(program, 'uTime');
    const resolutionLocation = gl.getUniformLocation(program, 'uResolution');

    const handleResize = () => {
      canvas.width = canvas.clientWidth * window.devicePixelRatio;
      canvas.height = canvas.clientHeight * window.devicePixelRatio;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    let requestID: number;
    const render = (time: number) => {
      gl.uniform1f(timeLocation, time * 0.001);
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      requestID = requestAnimationFrame(render);
    };
    requestID = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(requestID);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full ${className}`}
      style={{ display: 'block' }}
    />
  );
};

export default WebGLRibbonBackground;
