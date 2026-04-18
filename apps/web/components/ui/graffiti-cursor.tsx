'use client';

/**
 * GraffitiCursor — Curseur premium bombe de spray RBS Crew
 *
 * Adapté de smokey-fluid-cursor (faraasat/smokey-fluid-cursor) :
 * simulation fluide Navier-Stokes complète via WebGL.
 *
 * Fonctionnalités :
 *  - Simulation fluide WebGL (vélocité, pression, vorticité, advection)
 *  - Couleurs dynamiques tirées de la palette RBS
 *  - Spray can SVG avec tilt selon la direction
 *  - Ring follower lent avec pulse
 *  - Hover bouton/lien → ring scale + vibration
 *  - Clic → splat burst fort
 *  - Scroll → float léger de la bombe
 *  - Guards : réduit-motion + tactile
 */

import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

/* ── Palette RBS (normalisée 0-1 pour WebGL) ──────────── */
const RBS_PALETTE: [number, number, number][] = [
  [0.91, 0.2,  0.1 ],  // rouge RBS
  [0.11, 0.73, 0.33],  // vert RBS
  [0.96, 0.65, 0.14],  // or RBS
  [1,    0.18, 0.47],  // magenta
  [0,    0.83, 1   ],  // cyan
  [1,    1,    1   ],  // blanc
];

/* ── Config fluid (inspirée smokey-fluid-cursor) ──────── */
const FLUID_CONFIG = {
  simResolution:       128,
  dyeResolution:       1024,
  densityDissipation:  2.5,   // persistance de la peinture
  velocityDissipation: 1.8,   // traîne du mouvement
  pressure:            0.15,
  pressureIteration:   20,
  curl:                28,    // tourbillons (effet spray aérosol)
  splatRadius:         0.22,  // rayon du jet
  splatForce:          7500,  // force du spray
  colorUpdateSpeed:    4,     // cadence de changement couleur
  shading:             true,
};

/* ── Springs ──────────────────────────────────────────── */
const SP_CURSOR = { stiffness: 650, damping: 38, mass: 0.2 };
const SP_TILT   = { stiffness: 200, damping: 25, mass: 0.4 };

/* ════════════════════════════════════════════════════════ */
export function GraffitiCursor() {
  const [isEnabled, setIsEnabled]   = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [scrollY, setScrollY]       = useState(0);

  const webGLCanvasRef = useRef<HTMLCanvasElement>(null);

  // Curseur
  const curX  = useMotionValue(-200);
  const curY  = useMotionValue(-200);
  const sCurX = useSpring(curX, SP_CURSOR);
  const sCurY = useSpring(curY, SP_CURSOR);

  // Tilt dynamique
  const tiltMV = useMotionValue(0);
  const sTilt  = useSpring(tiltMV, SP_TILT);

  /* ── Guards (côté client uniquement) ─────────────────── */
  useEffect(() => {
    const noTouch  = !globalThis.matchMedia('(pointer: coarse)').matches;
    const noMotion = !globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setIsEnabled(noTouch && noMotion);
  }, []);

  /* ── cursor: none (inclut cursor:pointer des éléments cliquables) ── */
  useEffect(() => {
    if (!isEnabled) return;
    const style = document.createElement('style');
    style.id = 'graffiti-cursor-hide';
    style.textContent = '*, *::before, *::after { cursor: none !important; }';
    document.head.appendChild(style);
    return () => { document.getElementById('graffiti-cursor-hide')?.remove(); };
  }, [isEnabled]);

  /* ── Simulation WebGL Navier-Stokes ──────────────────── */
  useEffect(() => {
    if (!isEnabled) return;
    const canvas = webGLCanvasRef.current;
    if (!canvas) return;

    /* --- Helpers WebGL ---------------------------------- */
    function getWebGLContext(c: HTMLCanvasElement) {
      const params: WebGLContextAttributes = {
        alpha: true, depth: false, stencil: false,
        antialias: false, preserveDrawingBuffer: false,
      };
      let gl = c.getContext('webgl2', params) as WebGL2RenderingContext | null;
      const isWebGL2 = !!gl;
      if (!gl) {
        gl = (c.getContext('webgl', params) ||
              c.getContext('experimental-webgl', params)) as WebGL2RenderingContext | null;
      }
      if (!gl) return null;

      let halfFloatTexType: number;
      let supportLinearFiltering: boolean;

      if (isWebGL2) {
        const g2 = gl as WebGL2RenderingContext;
        g2.getExtension('EXT_color_buffer_float');
        supportLinearFiltering = !!g2.getExtension('OES_texture_float_linear');
        halfFloatTexType = g2.HALF_FLOAT;
      } else {
        const g1 = gl as WebGLRenderingContext;
        const hf = g1.getExtension('OES_texture_half_float');
        supportLinearFiltering = !!g1.getExtension('OES_texture_half_float_linear');
        if (!hf) return null;
        halfFloatTexType = (hf as OES_texture_half_float).HALF_FLOAT_OES;
      }

      gl.clearColor(0, 0, 0, 1);

      function supportedFormat(internalFormat: number, format: number) {
        const tex = gl!.createTexture();
        if (!tex) return null;
        gl!.bindTexture(gl!.TEXTURE_2D, tex);
        gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.NEAREST);
        gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.NEAREST);
        gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
        gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
        gl!.texImage2D(gl!.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, halfFloatTexType, null);
        const fbo = gl!.createFramebuffer();
        if (!fbo) return null;
        gl!.bindFramebuffer(gl!.FRAMEBUFFER, fbo);
        gl!.framebufferTexture2D(gl!.FRAMEBUFFER, gl!.COLOR_ATTACHMENT0, gl!.TEXTURE_2D, tex, 0);
        const ok = gl!.checkFramebufferStatus(gl!.FRAMEBUFFER) === gl!.FRAMEBUFFER_COMPLETE;
        gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
        gl!.deleteFramebuffer(fbo);
        gl!.deleteTexture(tex);
        return ok ? { internalFormat, format } : null;
      }

      let formatRGBA, formatRG, formatR;
      if (isWebGL2) {
        const g2 = gl as WebGL2RenderingContext;
        formatRGBA = supportedFormat(g2.RGBA16F, g2.RGBA);
        formatRG   = supportedFormat(g2.RG16F,   g2.RG);
        formatR    = supportedFormat(g2.R16F,    g2.RED);
      } else {
        const g1 = gl as WebGLRenderingContext;
        formatRGBA = supportedFormat(g1.RGBA, g1.RGBA);
        formatRG   = formatRGBA;
        formatR    = formatRGBA;
      }

      return { gl, isWebGL2, halfFloatTexType, supportLinearFiltering, formatRGBA, formatRG, formatR };
    }

    const ctx = getWebGLContext(canvas);
    if (!ctx) return;
    const { gl, halfFloatTexType, supportLinearFiltering, formatRGBA, formatRG, formatR } = ctx;
    if (!formatRGBA || !formatRG || !formatR) return;

    const dyeRes  = supportLinearFiltering ? FLUID_CONFIG.dyeResolution : 512;
    const shading = supportLinearFiltering ? FLUID_CONFIG.shading : false;

    /* --- Shaders GLSL ----------------------------------- */
    function compile(type: number, src: string): WebGLShader {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    }
    function makeProgram(vs: WebGLShader, fs: WebGLShader) {
      const p = gl.createProgram()!;
      gl.attachShader(p, vs);
      gl.attachShader(p, fs);
      gl.bindAttribLocation(p, 0, 'aPosition');
      gl.linkProgram(p);
      const uniforms: Record<string, WebGLUniformLocation> = {};
      const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < n; i++) {
        const info = gl.getActiveUniform(p, i);
        if (!info) continue;
        const loc = gl.getUniformLocation(p, info.name);
        if (loc) uniforms[info.name] = loc;
      }
      return { program: p, uniforms, bind() { gl.useProgram(p); } };
    }

    const baseVS = compile(gl.VERTEX_SHADER, `
      precision highp float;
      attribute vec2 aPosition;
      varying vec2 vUv; varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;
      uniform vec2 texelSize;
      void main(){
        vUv = aPosition*0.5+0.5;
        vL = vUv-vec2(texelSize.x,0.0); vR = vUv+vec2(texelSize.x,0.0);
        vT = vUv+vec2(0.0,texelSize.y); vB = vUv-vec2(0.0,texelSize.y);
        gl_Position = vec4(aPosition,0.0,1.0);
      }`);


    const clearFS  = compile(gl.FRAGMENT_SHADER, `precision mediump float; precision mediump sampler2D; varying highp vec2 vUv; uniform sampler2D uTexture; uniform float value; void main(){ gl_FragColor = value*texture2D(uTexture,vUv); }`);
    const splatFS  = compile(gl.FRAGMENT_SHADER, `precision highp float; precision highp sampler2D; varying vec2 vUv; uniform sampler2D uTarget; uniform float aspectRatio; uniform vec3 color; uniform vec2 point; uniform float radius; void main(){ vec2 p=vUv-point.xy; p.x*=aspectRatio; vec3 splat=exp(-dot(p,p)/radius)*color; vec3 base=texture2D(uTarget,vUv).xyz; gl_FragColor=vec4(base+splat,1.0); }`);
    const divFS    = compile(gl.FRAGMENT_SHADER, `precision mediump float; precision mediump sampler2D; varying highp vec2 vUv; varying highp vec2 vL; varying highp vec2 vR; varying highp vec2 vT; varying highp vec2 vB; uniform sampler2D uVelocity; void main(){ float L=texture2D(uVelocity,vL).x; float R=texture2D(uVelocity,vR).x; float T=texture2D(uVelocity,vT).y; float B=texture2D(uVelocity,vB).y; vec2 C=texture2D(uVelocity,vUv).xy; if(vL.x<0.0){L=-C.x;} if(vR.x>1.0){R=-C.x;} if(vT.y>1.0){T=-C.y;} if(vB.y<0.0){B=-C.y;} gl_FragColor=vec4(0.5*(R-L+T-B),0.0,0.0,1.0); }`);
    const curlFS   = compile(gl.FRAGMENT_SHADER, `precision mediump float; precision mediump sampler2D; varying highp vec2 vUv; varying highp vec2 vL; varying highp vec2 vR; varying highp vec2 vT; varying highp vec2 vB; uniform sampler2D uVelocity; void main(){ float L=texture2D(uVelocity,vL).y; float R=texture2D(uVelocity,vR).y; float T=texture2D(uVelocity,vT).x; float B=texture2D(uVelocity,vB).x; gl_FragColor=vec4(0.5*(R-L-T+B),0.0,0.0,1.0); }`);
    const vortFS   = compile(gl.FRAGMENT_SHADER, `precision highp float; precision highp sampler2D; varying vec2 vUv; varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB; uniform sampler2D uVelocity; uniform sampler2D uCurl; uniform float curl; uniform float dt; void main(){ float L=texture2D(uCurl,vL).x; float R=texture2D(uCurl,vR).x; float T=texture2D(uCurl,vT).x; float B=texture2D(uCurl,vB).x; float C=texture2D(uCurl,vUv).x; vec2 force=0.5*vec2(abs(T)-abs(B),abs(R)-abs(L)); force/=length(force)+0.0001; force*=curl*C; force.y*=-1.0; vec2 vel=texture2D(uVelocity,vUv).xy; vel+=force*dt; vel=min(max(vel,-1000.0),1000.0); gl_FragColor=vec4(vel,0.0,1.0); }`);
    const pressFS  = compile(gl.FRAGMENT_SHADER, `precision mediump float; precision mediump sampler2D; varying highp vec2 vUv; varying highp vec2 vL; varying highp vec2 vR; varying highp vec2 vT; varying highp vec2 vB; uniform sampler2D uPressure; uniform sampler2D uDivergence; void main(){ float L=texture2D(uPressure,vL).x; float R=texture2D(uPressure,vR).x; float T=texture2D(uPressure,vT).x; float B=texture2D(uPressure,vB).x; float div=texture2D(uDivergence,vUv).x; gl_FragColor=vec4((L+R+B+T-div)*0.25,0.0,0.0,1.0); }`);
    const gradFS   = compile(gl.FRAGMENT_SHADER, `precision mediump float; precision mediump sampler2D; varying highp vec2 vUv; varying highp vec2 vL; varying highp vec2 vR; varying highp vec2 vT; varying highp vec2 vB; uniform sampler2D uPressure; uniform sampler2D uVelocity; void main(){ float L=texture2D(uPressure,vL).x; float R=texture2D(uPressure,vR).x; float T=texture2D(uPressure,vT).x; float B=texture2D(uPressure,vB).x; vec2 vel=texture2D(uVelocity,vUv).xy; vel.xy-=vec2(R-L,T-B); gl_FragColor=vec4(vel,0.0,1.0); }`);

    const advFSSrc = `
      precision highp float; precision highp sampler2D;
      varying vec2 vUv; uniform sampler2D uVelocity; uniform sampler2D uSource;
      uniform vec2 texelSize; uniform vec2 dyeTexelSize; uniform float dt; uniform float dissipation;
      vec4 bilerp(sampler2D sam,vec2 uv,vec2 tsize){
        vec2 st=uv/tsize-0.5; vec2 iuv=floor(st); vec2 fuv=fract(st);
        vec4 a=texture2D(sam,(iuv+vec2(0.5,0.5))*tsize); vec4 b=texture2D(sam,(iuv+vec2(1.5,0.5))*tsize);
        vec4 c=texture2D(sam,(iuv+vec2(0.5,1.5))*tsize); vec4 d=texture2D(sam,(iuv+vec2(1.5,1.5))*tsize);
        return mix(mix(a,b,fuv.x),mix(c,d,fuv.x),fuv.y);
      }
      void main(){
        #ifdef MANUAL_FILTERING
          vec2 coord=vUv-dt*bilerp(uVelocity,vUv,texelSize).xy*texelSize;
          vec4 result=bilerp(uSource,coord,dyeTexelSize);
        #else
          vec2 coord=vUv-dt*texture2D(uVelocity,vUv).xy*texelSize;
          vec4 result=texture2D(uSource,coord);
        #endif
        gl_FragColor=result/(1.0+dissipation*dt);
      }`;
    const advFS = compile(gl.FRAGMENT_SHADER,
      (supportLinearFiltering ? '' : '#define MANUAL_FILTERING\n') + advFSSrc);

    const displaySrc = `
      precision highp float; precision highp sampler2D;
      varying vec2 vUv; varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;
      uniform sampler2D uTexture; uniform vec2 texelSize;
      void main(){
        vec3 c=texture2D(uTexture,vUv).rgb;
        #ifdef shading
          vec3 lc=texture2D(uTexture,vL).rgb; vec3 rc=texture2D(uTexture,vR).rgb;
          vec3 tc=texture2D(uTexture,vT).rgb; vec3 bc=texture2D(uTexture,vB).rgb;
          float dx=length(rc)-length(lc); float dy=length(tc)-length(bc);
          vec3 n=normalize(vec3(dx,dy,length(texelSize))); vec3 l=vec3(0.0,0.0,1.0);
          float diffuse=clamp(dot(n,l)+0.7,0.7,1.0); c*=diffuse;
        #endif
        float a=max(c.r,max(c.g,c.b));
        gl_FragColor=vec4(c,a);
      }`;


    const clearP  = makeProgram(baseVS, clearFS);
    const splatP  = makeProgram(baseVS, splatFS);
    const advP    = makeProgram(baseVS, advFS);
    const divP    = makeProgram(baseVS, divFS);
    const curlP   = makeProgram(baseVS, curlFS);
    const vortP   = makeProgram(baseVS, vortFS);
    const pressP  = makeProgram(baseVS, pressFS);
    const gradP   = makeProgram(baseVS, gradFS);

    // Display material (with optional shading keyword)
    const displayFS = compile(gl.FRAGMENT_SHADER,
      (shading ? '#define shading\n' : '') + displaySrc);
    const displayP = makeProgram(baseVS, displayFS);

    /* --- Full-screen quad (blit) ------------------------ */
    const vbo = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,-1,1,1,1,1,-1]), gl.STATIC_DRAW);
    const ebo = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0,1,2,0,2,3]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    type FBO = { texture: WebGLTexture|null; fbo: WebGLFramebuffer|null; width:number; height:number; texelSizeX:number; texelSizeY:number; attach(id:number):number };
    type DFBO = { width:number; height:number; texelSizeX:number; texelSizeY:number; read:FBO; write:FBO; swap():void };

    function blit(target: FBO | null, clear = false) {
      if (target == null) {
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      } else {
        gl.viewport(0, 0, target.width, target.height);
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
      }
      if (clear) { gl.clearColor(0,0,0,1); gl.clear(gl.COLOR_BUFFER_BIT); }
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    }

    function createFBO(w:number,h:number,ifmt:number,fmt:number,param:number): FBO {
      gl.activeTexture(gl.TEXTURE0);
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, ifmt, w, h, 0, fmt, halfFloatTexType, null);
      const fbo = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      gl.viewport(0, 0, w, h);
      gl.clear(gl.COLOR_BUFFER_BIT);
      return { texture, fbo, width:w, height:h, texelSizeX:1/w, texelSizeY:1/h,
        attach(id){ gl.activeTexture(gl.TEXTURE0+id); gl.bindTexture(gl.TEXTURE_2D, texture); return id; } };
    }

    function createDFBO(w:number,h:number,ifmt:number,fmt:number,param:number): DFBO {
      let a = createFBO(w,h,ifmt,fmt,param);
      let b = createFBO(w,h,ifmt,fmt,param);
      return { width:w, height:h, texelSizeX:a.texelSizeX, texelSizeY:a.texelSizeY,
        get read(){ return a; }, set read(v){ a=v; },
        get write(){ return b; }, set write(v){ b=v; },
        swap(){ [a,b]=[b,a]; } };
    }

    function getRes(res:number){ const ar=gl.drawingBufferWidth/gl.drawingBufferHeight; const mn=Math.round(res); const mx=Math.round(res*(ar>1?ar:1/ar)); return gl.drawingBufferWidth>gl.drawingBufferHeight?{width:mx,height:mn}:{width:mn,height:mx}; }
    function scaleByDPR(v:number){ return Math.floor(v*(globalThis.devicePixelRatio||1)); }

    /* --- FBOs ------------------------------------------ */
    const simRes = getRes(FLUID_CONFIG.simResolution);
    const dyeR   = getRes(dyeRes);
    const flt    = supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

    const dye      = createDFBO(dyeR.width, dyeR.height, formatRGBA.internalFormat, formatRGBA.format, flt);
    const velocity = createDFBO(simRes.width, simRes.height, formatRG.internalFormat, formatRG.format, flt);
    const divFBO   = createFBO(simRes.width, simRes.height, formatR.internalFormat, formatR.format, gl.NEAREST);
    const curlFBO  = createFBO(simRes.width, simRes.height, formatR.internalFormat, formatR.format, gl.NEAREST);
    const pressure = createDFBO(simRes.width, simRes.height, formatR.internalFormat, formatR.format, gl.NEAREST);

    /* --- Canvas resize ---------------------------------- */
    function resizeCanvas() {
      const w = scaleByDPR(canvas!.clientWidth);
      const h = scaleByDPR(canvas!.clientHeight);
      if (canvas!.width===w && canvas!.height===h) return false;
      canvas!.width=w; canvas!.height=h;
      return true;
    }
    function handleResize() { if (resizeCanvas()) { /* simple resize, skip re-init for perf */ } }
    resizeCanvas();
    globalThis.addEventListener('resize', handleResize, { passive: true });

    /* --- Color palette RBS ------------------------------ */
    let paletteIdx = 0;
    let colorTimer = 0;

    function getNextColor(): { r:number; g:number; b:number } {
      const [r,g,b] = RBS_PALETTE[paletteIdx % RBS_PALETTE.length];
      return { r: r*0.22, g: g*0.22, b: b*0.22 };
    }

    /* --- Pointer --------------------------------------- */
    const ptr = {
      texcoordX: 0, texcoordY: 0,
      prevTexcoordX: 0, prevTexcoordY: 0,
      deltaX: 0, deltaY: 0,
      moved: false,
    };

    /* --- Splat ----------------------------------------- */
    function splat(x:number,y:number,dx:number,dy:number,color:{r:number;g:number;b:number}) {
      const ar = canvas!.width/canvas!.height;
      const r  = FLUID_CONFIG.splatRadius/100;
      const radius = ar>1 ? r*ar : r;

      splatP.bind();
      gl.uniform1i(splatP.uniforms['uTarget'], velocity.read.attach(0));
      gl.uniform1f(splatP.uniforms['aspectRatio'], ar);
      gl.uniform2f(splatP.uniforms['point'], x, y);
      gl.uniform3f(splatP.uniforms['color'], dx, dy, 0);
      gl.uniform1f(splatP.uniforms['radius'], radius);
      blit(velocity.write); velocity.swap();

      gl.uniform1i(splatP.uniforms['uTarget'], dye.read.attach(0));
      gl.uniform3f(splatP.uniforms['color'], color.r, color.g, color.b);
      blit(dye.write); dye.swap();
    }

    function splatBurst(x:number,y:number) {
      const color = getNextColor();
      color.r *= 12; color.g *= 12; color.b *= 12;
      splat(x, y, (Math.random()-0.5)*15, (Math.random()-0.5)*15, color);
    }

    /* --- Simulation step ------------------------------- */
    function step(dt:number) {
      gl.disable(gl.BLEND);

      curlP.bind();
      gl.uniform2f(curlP.uniforms['texelSize'], velocity.texelSizeX, velocity.texelSizeY);
      gl.uniform1i(curlP.uniforms['uVelocity'], velocity.read.attach(0));
      blit(curlFBO);

      vortP.bind();
      gl.uniform2f(vortP.uniforms['texelSize'], velocity.texelSizeX, velocity.texelSizeY);
      gl.uniform1i(vortP.uniforms['uVelocity'], velocity.read.attach(0));
      gl.uniform1i(vortP.uniforms['uCurl'], curlFBO.attach(1));
      gl.uniform1f(vortP.uniforms['curl'], FLUID_CONFIG.curl);
      gl.uniform1f(vortP.uniforms['dt'], dt);
      blit(velocity.write); velocity.swap();

      divP.bind();
      gl.uniform2f(divP.uniforms['texelSize'], velocity.texelSizeX, velocity.texelSizeY);
      gl.uniform1i(divP.uniforms['uVelocity'], velocity.read.attach(0));
      blit(divFBO);

      clearP.bind();
      gl.uniform1i(clearP.uniforms['uTexture'], pressure.read.attach(0));
      gl.uniform1f(clearP.uniforms['value'], FLUID_CONFIG.pressure);
      blit(pressure.write); pressure.swap();

      pressP.bind();
      gl.uniform2f(pressP.uniforms['texelSize'], velocity.texelSizeX, velocity.texelSizeY);
      gl.uniform1i(pressP.uniforms['uDivergence'], divFBO.attach(0));
      for (let i=0; i<FLUID_CONFIG.pressureIteration; i++) {
        gl.uniform1i(pressP.uniforms['uPressure'], pressure.read.attach(1));
        blit(pressure.write); pressure.swap();
      }

      gradP.bind();
      gl.uniform2f(gradP.uniforms['texelSize'], velocity.texelSizeX, velocity.texelSizeY);
      gl.uniform1i(gradP.uniforms['uPressure'], pressure.read.attach(0));
      gl.uniform1i(gradP.uniforms['uVelocity'], velocity.read.attach(1));
      blit(velocity.write); velocity.swap();

      advP.bind();
      gl.uniform2f(advP.uniforms['texelSize'], velocity.texelSizeX, velocity.texelSizeY);
      if (!supportLinearFiltering)
        gl.uniform2f(advP.uniforms['dyeTexelSize'], velocity.texelSizeX, velocity.texelSizeY);
      const vId = velocity.read.attach(0);
      gl.uniform1i(advP.uniforms['uVelocity'], vId);
      gl.uniform1i(advP.uniforms['uSource'], vId);
      gl.uniform1f(advP.uniforms['dt'], dt);
      gl.uniform1f(advP.uniforms['dissipation'], FLUID_CONFIG.velocityDissipation);
      blit(velocity.write); velocity.swap();

      if (!supportLinearFiltering)
        gl.uniform2f(advP.uniforms['dyeTexelSize'], dye.texelSizeX, dye.texelSizeY);
      gl.uniform1i(advP.uniforms['uVelocity'], velocity.read.attach(0));
      gl.uniform1i(advP.uniforms['uSource'], dye.read.attach(1));
      gl.uniform1f(advP.uniforms['dissipation'], FLUID_CONFIG.densityDissipation);
      blit(dye.write); dye.swap();
    }

    function renderFrame() {
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.enable(gl.BLEND);
      displayP.bind();
      if (shading) gl.uniform2f(displayP.uniforms['texelSize'], 1/gl.drawingBufferWidth, 1/gl.drawingBufferHeight);
      gl.uniform1i(displayP.uniforms['uTexture'], dye.read.attach(0));
      blit(null);
    }

    /* --- Animation loop -------------------------------- */
    let rafId: number;
    let stopped = false;
    let lastTime = Date.now();

    function loop() {
      if (stopped) return;
      const now = Date.now();
      const dt  = Math.min((now-lastTime)/1000, 0.01667);
      lastTime  = now;

      colorTimer += dt * FLUID_CONFIG.colorUpdateSpeed;
      if (colorTimer >= 1) {
        colorTimer = 0;
        paletteIdx = (paletteIdx+1) % RBS_PALETTE.length;
      }

      if (ptr.moved) {
        ptr.moved = false;
        splat(ptr.texcoordX, ptr.texcoordY,
          ptr.deltaX * FLUID_CONFIG.splatForce,
          ptr.deltaY * FLUID_CONFIG.splatForce,
          getNextColor());
      }

      step(dt);
      renderFrame();
      rafId = requestAnimationFrame(loop);
    }
    rafId = requestAnimationFrame(loop);

    /* --- Mouse events ---------------------------------- */
    function onMouseMove(e: MouseEvent) {
      const x = e.clientX, y = e.clientY;
      const w = canvas!.width, h = canvas!.height;
      const dpr = globalThis.devicePixelRatio || 1;

      ptr.prevTexcoordX = ptr.texcoordX;
      ptr.prevTexcoordY = ptr.texcoordY;
      ptr.texcoordX = (x * dpr) / w;
      ptr.texcoordY = 1 - (y * dpr) / h;

      const ar = w / h;
      let dx = ptr.texcoordX - ptr.prevTexcoordX;
      let dy = ptr.texcoordY - ptr.prevTexcoordY;
      if (ar < 1) dx *= ar; else dy /= ar;
      ptr.deltaX = dx;
      ptr.deltaY = dy;
      ptr.moved = Math.abs(dx) > 0 || Math.abs(dy) > 0;
    }

    function onMouseDown(e: MouseEvent) {
      const dpr = globalThis.devicePixelRatio || 1;
      splatBurst((e.clientX * dpr) / canvas!.width, 1 - (e.clientY * dpr) / canvas!.height);
    }

    globalThis.addEventListener('mousemove', onMouseMove, { passive: true });
    globalThis.addEventListener('mousedown', onMouseDown);

    /* --- Cleanup --------------------------------------- */
    return () => {
      stopped = true;
      cancelAnimationFrame(rafId);
      globalThis.removeEventListener('mousemove', onMouseMove);
      globalThis.removeEventListener('mousedown', onMouseDown);
      globalThis.removeEventListener('resize', handleResize);
    };
  }, [isEnabled]);

  /* ── Hover sur éléments interactifs ─────────────────── */
  useEffect(() => {
    if (!isEnabled) return;
    const SELECTORS = 'a, button, [role="button"], input, select, textarea, label';

    const onOver = (e: Event) => {
      if ((e.target as Element)?.closest(SELECTORS)) setIsHovering(true);
    };
    const onOut = (e: Event) => {
      if ((e.target as Element)?.closest(SELECTORS)) setIsHovering(false);
    };

    document.addEventListener('mouseover', onOver);
    document.addEventListener('mouseout', onOut);
    return () => {
      document.removeEventListener('mouseover', onOver);
      document.removeEventListener('mouseout', onOut);
    };
  }, [isEnabled]);

  /* ── Tracking position curseur + tilt ───────────────── */
  useEffect(() => {
    if (!isEnabled) return;
    let prevX = -999;

    const onMove = (e: MouseEvent) => {
      curX.set(e.clientX);
      curY.set(e.clientY);
      const vx = e.clientX - prevX;
      tiltMV.set(Math.max(-26, Math.min(26, vx * 2.2)));
      prevX = e.clientX;
    };

    globalThis.addEventListener('mousemove', onMove, { passive: true });
    return () => globalThis.removeEventListener('mousemove', onMove);
  }, [isEnabled, curX, curY, tiltMV]);

  /* ── Scroll float ────────────────────────────────────── */
  useEffect(() => {
    if (!isEnabled) return;
    const onScroll = () => setScrollY(globalThis.scrollY);
    globalThis.addEventListener('scroll', onScroll, { passive: true });
    return () => globalThis.removeEventListener('scroll', onScroll);
  }, [isEnabled]);

  if (!isEnabled) return null;

  // Float subtil basé sur le scroll (sinusoïdal)
  const floatOffset = Math.sin(scrollY * 0.02) * 4;

  return (
    <>
      {/* ── WebGL fluid canvas ─────────────────────────── */}
      <canvas
        ref={webGLCanvasRef}
        className="fixed inset-0 w-full h-full z-[10000] pointer-events-none"
        aria-hidden="true"
      />

      {/* ── Spray can cursor (SprayCanGraffiti.svg) ───────── */}
      {/*
        Le SVG public/SprayCanGraffiti.svg a un viewBox 750×1050.
        La buse du spray est à ≈ (265, 610) → 35% gauche, 58% haut.
        On aligne ce point sur la position de la souris via translateX/Y.
        Licence : CC0 (domaine public) — Dig Scrappy
      */}
      <motion.div
        style={{
          x: sCurX,
          y: sCurY,
          // Décale de sorte que la buse (35%L, 58%H) pointe sur le curseur
          translateX: '-35%',
          translateY: `calc(-58% + ${floatOffset}px)`,
          rotate: sTilt,
        }}
        animate={isHovering ? { scale: [1, 1.06, 1, 1.06, 1] } : { scale: 1 }}
        transition={isHovering
          ? { duration: 0.22, repeat: Infinity }
          : { duration: 0.18 }}
        className="fixed top-0 left-0 z-[10002] pointer-events-none select-none"
        aria-hidden="true"
      >
        {/* SprayCanGraffiti.svg — CC0 Dig Scrappy
            viewBox 750×1050 : buse ≈ 35% gauche, 58% haut
            → hotspot aligné sur la position réelle de la souris  */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/SprayCanGraffiti.svg"
          alt=""
          width={26}
          height={37}
          draggable={false}
          style={{ display: 'block', userSelect: 'none' }}
        />
      </motion.div>
    </>
  );
}
