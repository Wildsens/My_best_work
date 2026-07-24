import{r as b,c as T,a as Y,g as k,j as s,S as z,R as H,b as P}from"./shader-mount.DAVJYhjV.js";const E={maxColorCount:10},W=`#version 300 es
precision highp float;

in mediump vec2 v_imageUV;
in mediump vec2 v_objectUV;
out vec4 fragColor;

uniform sampler2D u_image;
uniform float u_time;
uniform mediump float u_imageAspectRatio;

uniform vec4 u_colorBack;
uniform vec4 u_colors[${E.maxColorCount}];
uniform float u_colorsCount;

uniform float u_angle;
uniform float u_noise;
uniform float u_innerGlow;
uniform float u_outerGlow;
uniform float u_contour;

#define TWO_PI 6.28318530718
#define PI 3.14159265358979323846

float getImgFrame(vec2 uv, float th) {
  float frame = 1.;
  frame *= smoothstep(0., th, uv.y);
  frame *= 1. - smoothstep(1. - th, 1., uv.y);
  frame *= smoothstep(0., th, uv.x);
  frame *= 1. - smoothstep(1. - th, 1., uv.x);
  return frame;
}

float circle(vec2 uv, vec2 c, vec2 r) {
  return 1. - smoothstep(r[0], r[1], length(uv - c));
}

float lst(float edge0, float edge1, float x) {
  return clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
}

float sst(float edge0, float edge1, float x) {
  return smoothstep(edge0, edge1, x);
}

float shadowShape(vec2 uv, float t, float contour) {
  vec2 scaledUV = uv;

  // base shape tranjectory
  float posY = mix(-1., 2., t);

  // scaleX when it's moving down
  scaledUV.y -= .5;
  float mainCircleScale = sst(0., .8, posY) * lst(1.4, .9, posY);
  scaledUV *= vec2(1., 1. + 1.5 * mainCircleScale);
  scaledUV.y += .5;

  // base shape
  float innerR = .4;
  float outerR = 1. - .3 * (sst(.1, .2, t) * (1. - sst(.2, .5, t)));
  float s = circle(scaledUV, vec2(.5, posY - .2), vec2(innerR, outerR));
  float shapeSizing = sst(.2, .3, t) * sst(.6, .3, t);
  s = pow(s, 1.4);
  s *= 1.2;

  // flat gradient to take over the shadow shape
  float topFlattener = 0.;
  {
    float pos = posY - uv.y;
    float edge = 1.2;
    topFlattener = lst(-.4, 0., pos) * (1. - sst(.0, edge, pos));
    topFlattener = pow(topFlattener, 3.);
    float topFlattenerMixer = (1. - sst(.0, .3, pos));
    s = mix(topFlattener, s, topFlattenerMixer);
  }

  // apple right circle
  {
    float visibility = sst(.6, .7, t) * (1. - sst(.8, .9, t));
    float angle = -2. -t * TWO_PI;
    float rightCircle = circle(uv, vec2(.95 - .2 * cos(angle), .4 - .1 * sin(angle)), vec2(.15, .3));
    rightCircle *= visibility;
    s = mix(s, 0., rightCircle);
  }

  // apple top circle
  {
    float topCircle = circle(uv, vec2(.5, .19), vec2(.05, .25));
    topCircle += 2. * contour * circle(uv, vec2(.5, .19), vec2(.2, .5));
    float visibility = .55 * sst(.2, .3, t) * (1. - sst(.3, .45, t));
    topCircle *= visibility;
    s = mix(s, 0., topCircle);
  }

  float leafMask = circle(uv, vec2(.53, .13), vec2(.08, .19));
  leafMask = mix(leafMask, 0., 1. - sst(.4, .54, uv.x));
  leafMask = mix(0., leafMask, sst(.0, .2, uv.y));
  leafMask *= (sst(.5, 1.1, posY) * sst(1.5, 1.3, posY));
  s += leafMask;

  // apple bottom circle
  {
    float visibility = sst(.0, .4, t) * (1. - sst(.6, .8, t));
    s = mix(s, 0., visibility * circle(uv, vec2(.52, .92), vec2(.09, .25)));
  }

  // random balls that are invisible if apple logo is selected
  {
    float pos = sst(.0, .6, t) * (1. - sst(.6, 1., t));
    s = mix(s, .5, circle(uv, vec2(.0, 1.2 - .5 * pos), vec2(.1, .3)));
    s = mix(s, .0, circle(uv, vec2(1., .5 + .5 * pos), vec2(.1, .3)));

    s = mix(s, 1., circle(uv, vec2(.95, .2 + .2 * sst(.3, .4, t) * sst(.7, .5, t)), vec2(.07, .22)));
    s = mix(s, 1., circle(uv, vec2(.95, .2 + .2 * sst(.3, .4, t) * (1. - sst(.5, .7, t))), vec2(.07, .22)));
    s /= max(1e-4, sst(1., .85, uv.y));
  }

  s = clamp(0., 1., s);
  return s;
}

float blurEdge3x3(sampler2D tex, vec2 uv, vec2 dudx, vec2 dudy, float radius, float centerSample) {
  vec2 texel = 1.0 / vec2(textureSize(tex, 0));
  vec2 r = radius * texel;

  float w1 = 1.0, w2 = 2.0, w4 = 4.0;
  float norm = 16.0;
  float sum = w4 * centerSample;

  sum += w2 * textureGrad(tex, uv + vec2(0.0, -r.y), dudx, dudy).g;
  sum += w2 * textureGrad(tex, uv + vec2(0.0, r.y), dudx, dudy).g;
  sum += w2 * textureGrad(tex, uv + vec2(-r.x, 0.0), dudx, dudy).g;
  sum += w2 * textureGrad(tex, uv + vec2(r.x, 0.0), dudx, dudy).g;

  sum += w1 * textureGrad(tex, uv + vec2(-r.x, -r.y), dudx, dudy).g;
  sum += w1 * textureGrad(tex, uv + vec2(r.x, -r.y), dudx, dudy).g;
  sum += w1 * textureGrad(tex, uv + vec2(-r.x, r.y), dudx, dudy).g;
  sum += w1 * textureGrad(tex, uv + vec2(r.x, r.y), dudx, dudy).g;

  return sum / norm;
}

void main() {
  vec2 uv = v_objectUV + .5;
  uv.y = 1. - uv.y;

  vec2 imgUV = v_imageUV;
  imgUV -= .5;
  imgUV *= 0.5714285714285714;
  imgUV += .5;
  float imgSoftFrame = getImgFrame(imgUV, .03);

  vec4 img = texture(u_image, imgUV);
  vec2 dudx = dFdx(imgUV);
  vec2 dudy = dFdy(imgUV);

  if (img.a == 0.) {
    fragColor = u_colorBack;
    return;
  }

  float t = .1 * u_time;
  t -= .3;

  float tCopy = t + 1. / 3.;
  float tCopy2 = t + 2. / 3.;

  t = mod(t, 1.);
  tCopy = mod(tCopy, 1.);
  tCopy2 = mod(tCopy2, 1.);

  vec2 animationUV = imgUV - vec2(.5);
  float angle = -u_angle * PI / 180.;
  float cosA = cos(angle);
  float sinA = sin(angle);
  animationUV = vec2(
  animationUV.x * cosA - animationUV.y * sinA,
  animationUV.x * sinA + animationUV.y * cosA
  ) + vec2(.5);

  float shape = img[0];

  img[1] = blurEdge3x3(u_image, imgUV, dudx, dudy, 8., img[1]);

  float outerBlur = 1. - mix(1., img[1], shape);
  float innerBlur = mix(img[1], 0., shape);
  float contour = mix(img[2], 0., shape);

  outerBlur *= imgSoftFrame;

  float shadow = shadowShape(animationUV, t, innerBlur);
  float shadowCopy = shadowShape(animationUV, tCopy, innerBlur);
  float shadowCopy2 = shadowShape(animationUV, tCopy2, innerBlur);

  float inner = .8 + .8 * innerBlur;
  inner = mix(inner, 0., shadow);
  inner = mix(inner, 0., shadowCopy);
  inner = mix(inner, 0., shadowCopy2);

  inner *= mix(0., 2., u_innerGlow);

  inner += (u_contour * 2.) * contour;
  inner = min(1., inner);
  inner *= (1. - shape);

  float outer = 0.;
  {
    t *= 3.;
    t = mod(t - .1, 1.);

    outer = .9 * pow(outerBlur, .8);
    float y = mod(animationUV.y - t, 1.);
    float animatedMask = sst(.3, .65, y) * (1. - sst(.65, 1., y));
    animatedMask = .5 + animatedMask;
    outer *= animatedMask;
    outer *= mix(0., 5., pow(u_outerGlow, 2.));
    outer *= imgSoftFrame;
  }

  inner = pow(inner, 1.2);
  float heat = clamp(inner + outer, 0., 1.);

  heat += (.005 + .35 * u_noise) * (fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453123) - .5);

  float mixer = heat * u_colorsCount;
  vec4 gradient = u_colors[0];
  gradient.rgb *= gradient.a;
  float outerShape = 0.;
  for (int i = 1; i < ${E.maxColorCount+1}; i++) {
    if (i > int(u_colorsCount)) break;
    float m = clamp(mixer - float(i - 1), 0., 1.);
    if (i == 1) {
      outerShape = m;
    }
    vec4 c = u_colors[i - 1];
    c.rgb *= c.a;
    gradient = mix(gradient, c, m);
  }

  vec3 color = gradient.rgb * outerShape;
  float opacity = gradient.a * outerShape;

  vec3 bgColor = u_colorBack.rgb * u_colorBack.a;
  color = color + bgColor * (1.0 - opacity);
  opacity = opacity + u_colorBack.a * (1.0 - opacity);

  color += .02 * (fract(sin(dot(uv + 1., vec2(12.9898, 78.233))) * 43758.5453123) - .5);

  fragColor = vec4(color, opacity);
}
`;function G(o){const e=document.createElement("canvas"),r=1e3;return new Promise((t,m)=>{const a=new Image;a.crossOrigin="anonymous",a.addEventListener("load",()=>{(typeof o=="string"?o.endsWith(".svg"):o.type==="image/svg+xml")&&(a.width=r,a.height=r);const n=a.naturalWidth/a.naturalHeight,i=Math.floor(r*.15),d=Math.ceil(i*2.5);let c=r,l=r;n>1?l=Math.floor(r/n):c=Math.floor(r*n),e.width=c+2*d,e.height=l+2*d;const p=e.getContext("2d",{willReadFrequently:!0});if(!p)throw new Error("Failed to get canvas 2d context");p.fillStyle="white",p.fillRect(0,0,e.width,e.height),p.drawImage(a,d,d,c,l);const{width:v,height:x}=e,w=p.getImageData(0,0,v,x).data,_=v*x,h=new Uint8ClampedArray(_);for(let f=0;f<_;f++){const g=f*4,V=w[g]??0,R=w[g+1]??0,L=w[g+2]??0;h[f]=.299*V+.587*R+.114*L|0}const A=i,j=Math.max(1,Math.round(.12*i)),S=5,M=F(h,v,x,A,3),C=F(h,v,x,j,3),B=F(h,v,x,S,1),I=p.createImageData(v,x),y=I.data;for(let f=0;f<_;f++){const g=f*4;y[g]=B[f]??0,y[g+1]=M[f]??0,y[g+2]=C[f]??0,y[g+3]=255}p.putImageData(I,0,0),e.toBlob(f=>{if(!f){m(new Error("Failed to create PNG blob"));return}t({blob:f})},"image/png")}),a.addEventListener("error",()=>{m(new Error("Failed to load image"))}),a.src=typeof o=="string"?o:URL.createObjectURL(o)})}function O(o,e,r,t){if(t<=0)return o.slice();const m=new Uint8ClampedArray(e*r),a=new Uint32Array(e*r);for(let n=0;n<r;n++){let i=0;for(let d=0;d<e;d++){const c=n*e+d,l=o[c]??0;i+=l,a[c]=i+(n>0?a[c-e]??0:0)}}for(let n=0;n<r;n++){const i=Math.max(0,n-t),d=Math.min(r-1,n+t);for(let c=0;c<e;c++){const l=Math.max(0,c-t),p=Math.min(e-1,c+t),v=d*e+p,x=d*e+(l-1),U=(i-1)*e+p,w=(i-1)*e+(l-1),_=a[v]??0,h=l>0?a[x]??0:0,A=i>0?a[U]??0:0,j=l>0&&i>0?a[w]??0:0,S=_-h-A+j,M=(p-l+1)*(d-i+1);m[n*e+c]=Math.round(S/M)}}return m}function F(o,e,r,t,m){if(t<=0||m<=1)return O(o,e,r,t);let a=o,n=o;for(let i=0;i<m;i++)n=O(a,e,r,t),a=n;return n}function q(o,e){var r,t,m;for(const a in o){if(a==="colors"){const n=Array.isArray(o.colors),i=Array.isArray(e.colors);if(!n||!i){if(Object.is(o.colors,e.colors)===!1)return!1;continue}if(((r=o.colors)==null?void 0:r.length)!==((t=e.colors)==null?void 0:t.length)||!((m=o.colors)!=null&&m.every((d,c)=>{var l;return d===((l=e.colors)==null?void 0:l[c])})))return!1;continue}if(Object.is(o[a],e[a])===!1)return!1}return!0}const N="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==",X=o=>typeof o=="object"&&typeof o.then=="function",D=[];function Q(o,e){if(o===e)return!0;if(!o||!e)return!1;const r=o.length;if(e.length!==r)return!1;for(let t=0;t<r;t++)if(o[t]!==e[t])return!1;return!0}function $(o,e=null){e===null&&(e=[o]);for(const t of D)if(Q(e,t.keys)){if(Object.prototype.hasOwnProperty.call(t,"error"))throw t.error;if(Object.prototype.hasOwnProperty.call(t,"response"))return t.response;throw t.promise}const r={keys:e,promise:(X(o)?o:o(...e)).then(t=>{r.response=t}).catch(t=>r.error=t)};throw D.push(r),r.promise}const K=(o,e)=>$(o,e),u={params:{...T,scale:.75,speed:1,frame:0,contour:.5,angle:0,noise:0,innerGlow:.5,outerGlow:.5,colorBack:"#000000",colors:["#11206a","#1f3ba2","#2f63e7","#6bd7ff","#ffe679","#ff991e","#ff4c00"]}},J=b.memo(function({speed:e=u.params.speed,frame:r=u.params.frame,image:t="",contour:m=u.params.contour,angle:a=u.params.angle,noise:n=u.params.noise,innerGlow:i=u.params.innerGlow,outerGlow:d=u.params.outerGlow,colorBack:c=u.params.colorBack,colors:l=u.params.colors,suspendWhenProcessingImage:p=!1,fit:v=u.params.fit,offsetX:x=u.params.offsetX,offsetY:U=u.params.offsetY,originX:w=u.params.originX,originY:_=u.params.originY,rotation:h=u.params.rotation,scale:A=u.params.scale,worldHeight:j=u.params.worldHeight,worldWidth:S=u.params.worldWidth,...M}){const C=typeof t=="string"?t:t.src,[B,I]=b.useState(N);let y;p&&typeof window<"u"?y=K(()=>G(C).then(g=>URL.createObjectURL(g.blob)),[C,"heatmap"]):y=B,b.useLayoutEffect(()=>{if(p)return;if(!C){I(N);return}let g,V=!0;return G(C).then(R=>{V&&(g=URL.createObjectURL(R.blob),I(g))}),()=>{V=!1}},[C,p]);const f=b.useMemo(()=>({u_image:y,u_contour:m,u_angle:a,u_noise:n,u_innerGlow:i,u_outerGlow:d,u_colorBack:k(c),u_colors:l.map(k),u_colorsCount:l.length,u_fit:Y[v],u_offsetX:x,u_offsetY:U,u_originX:w,u_originY:_,u_rotation:h,u_scale:A,u_worldHeight:j,u_worldWidth:S}),[e,r,m,a,n,i,d,l,c,y,v,x,U,w,_,h,A,j,S]);return s.jsx(z,{...M,speed:e,frame:r,fragmentShader:W,mipmaps:["u_image"],uniforms:f})},q),Z="/My_best_work/assets/asd.DLA9AmhY.jfif";function ee(){const[o,e]=b.useState(!0),r=b.useRef(null),t=b.useRef(null);return b.useEffect(()=>{const m=new IntersectionObserver(([a])=>{a.isIntersecting?t.current=setTimeout(()=>{e(!0)},300):(t.current&&clearTimeout(t.current),e(!1))},{threshold:.2});return r.current&&m.observe(r.current),()=>{t.current&&clearTimeout(t.current),r.current&&m.unobserve(r.current)}},[]),s.jsx("div",{ref:r,style:{width:"100%",height:"100%"},children:s.jsx(J,{speed:o?1:0,contour:.867,angle:-216,noise:.49,innerGlow:.4,outerGlow:.4,scale:.42,image:Z,frame:401572.025,colors:["#5E0001","#9D0002F0","#FF0005"],colorBack:"#00000000",style:{backgroundColor:"#000000",width:"100%",height:"100%",display:"block"}})})}const te="/My_best_work/assets/Convertor.PF7x9zny.webp",oe="/My_best_work/assets/wildsen_channel_image.DiQdpG1m.jpg";function re(){return s.jsxs("div",{className:"page-wrapper",children:[s.jsxs("section",{className:"section-one",children:[s.jsx("div",{className:"shader-container",children:s.jsx(ee,{})}),s.jsx("div",{className:"text-container",children:s.jsx("h1",{id:"logo",children:"WILDSEN"})})]}),s.jsxs("section",{className:"section-two",children:[s.jsxs("div",{className:"content-box",children:[s.jsx("h1",{id:"h1_upsize",children:"LIST OF TOOLS"}),s.jsx("p",{id:"p_sizeup",children:"Here you can chose what u need use"})]}),s.jsx("div",{id:"second_canvas",children:s.jsxs("div",{className:"Block-Project",children:[s.jsx("p",{children:"CONVERTOR"}),s.jsx("img",{src:te,alt:"Convertor"}),s.jsx("a",{href:"./convertor/",children:"INACTIVE"})]})})]}),s.jsxs("section",{className:"section-three",children:[s.jsx("div",{id:"second_canvas",children:s.jsxs("div",{className:"Block-Project",children:[s.jsx("img",{src:oe,alt:"Convertor"}),s.jsx("div",{children:"INFO"})]})}),s.jsxs("div",{className:"content-box",children:[s.jsx("h1",{id:"h1_upsize",children:"WILDSEN | NEWS DOTA 2"}),s.jsx("p",{id:"p_sizeup",children:"MY CHANNEL"})]})]})]})}const ae=H.createRoot(document.getElementById("root"));ae.render(s.jsx(P.StrictMode,{children:s.jsx(re,{})}));
