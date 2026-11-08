/* ============================================================================
   Correr para Vivir — TIERRA 3D (vuelos)
   ----------------------------------------------------------------------------
   - Three.js se carga de forma perezosa (vendor/ local con respaldo en CDN),
     así la página abre rápido y la librería se descarga mientras suena la
     intro.
   - El bucle de render SOLO corre durante un vuelo. Al salir del vuelo, o al
     ocultar la pestaña, se detiene (antes seguía para siempre y saturaba el
     hilo principal).
   - El tiempo de vuelo se acumula por cuadro (con tope), así cambiar de
     pestaña no hace "saltar" el avión.
   - Solo luz ambiental: la Tierra no tiene lado oscuro ni sombras.
   - La cámara se puede orbitar/acercar libremente mientras su punto de mira
     sigue suavemente al avión.
============================================================================ */
(function () {
  'use strict';

  var LIBS = [
    { local: 'vendor/three.min.js', cdn: 'https://unpkg.com/three@0.128.0/build/three.min.js', test: function () { return !!window.THREE; } },
    { local: 'vendor/OrbitControls.js', cdn: 'https://unpkg.com/three@0.128.0/examples/js/controls/OrbitControls.js', test: function () { return !!(window.THREE && window.THREE.OrbitControls); } },
  ];
  var TEXTURES = {
    earth: ['vendor/earth.jpg', 'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg'],
    clouds: ['vendor/clouds.jpg'],
  };

  var EARTH_RADIUS = 0.5;
  var CRUISE_ALT_OFFSET = 0.075;
  var PATH_SEGMENTS = 220;
  var CRUISE_SPEED_KMH = 880;
  var CRUISE_ALT_M = 11000;

  var deg2rad = function (d) { return (d * Math.PI) / 180; };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var smoothstep = function (e0, e1, x) { var t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.async = false;
      s.onload = function () { resolve(); };
      s.onerror = function () { s.remove(); reject(new Error('No se pudo cargar ' + src)); };
      document.head.appendChild(s);
    });
  }

  function loadLibs() {
    return LIBS.reduce(function (p, lib) {
      return p.then(function () {
        if (lib.test()) return null;
        return loadScript(lib.local).catch(function () { return loadScript(lib.cdn); }).then(function () {
          if (!lib.test()) throw new Error('Librería 3D no disponible');
        });
      });
    }, Promise.resolve());
  }

  // ------------------------------------------------------------------
  // Estado del módulo
  // ------------------------------------------------------------------
  var readyPromise = null;
  var G = null; // objetos de Three.js
  var running = false;
  var rafId = null;
  var lastFrame = 0;
  var elapsed = 0;
  var leg = null;
  var clockTimer = null;
  var lastLabelUpdate = 0;

  function $(id) { return document.getElementById(id); }

  // ------------------------------------------------------------------
  // Geometría de rutas
  // ------------------------------------------------------------------
  function haversineKm(a, b) {
    var R = 6371;
    var dLat = deg2rad(b.lat - a.lat), dLon = deg2rad(b.lon - a.lon);
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(deg2rad(a.lat)) * Math.cos(deg2rad(b.lat));
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function latLonToUnit(lat, lon) {
    var phi = deg2rad(90 - lat), theta = deg2rad(lon + 180);
    return new THREE.Vector3(-Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta));
  }
  function slerpDir(a, b, t, omega) {
    if (omega < 1e-6) return a.clone().lerp(b, t).normalize();
    var s = Math.sin(omega), f1 = Math.sin((1 - t) * omega) / s, f2 = Math.sin(t * omega) / s;
    return new THREE.Vector3(a.x * f1 + b.x * f2, a.y * f1 + b.y * f2, a.z * f1 + b.z * f2).normalize();
  }
  function altOffset(t) { return CRUISE_ALT_OFFSET * Math.min(smoothstep(0, 0.08, t), 1 - smoothstep(0.9, 1, t)); }
  function altMeters(t) { return CRUISE_ALT_M * Math.min(smoothstep(0, 0.08, t), 1 - smoothstep(0.9, 1, t)); }
  function speedKmh(t) {
    var base = CRUISE_SPEED_KMH * Math.min(smoothstep(0, 0.06, t), 1 - smoothstep(0.94, 1, t));
    return Math.max(0, base + (base > 50 ? Math.sin(t * 90) * 6 : 0));
  }
  function extTemp(m) { return 15 - 6.5 * Math.min(m / 1000, 11); }
  function positionAt(t) {
    return slerpDir(leg.originDir, leg.destDir, t, leg.angle).multiplyScalar(EARTH_RADIUS + altOffset(t));
  }

  function lineGeometry(points) {
    var geo = new THREE.BufferGeometry();
    var arr = new Float32Array(points.length * 3);
    points.forEach(function (p, j) { arr[j * 3] = p.x; arr[j * 3 + 1] = p.y; arr[j * 3 + 2] = p.z; });
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    return geo;
  }

  function loadTexture(list, onLoad) {
    var i = 0;
    var loader = new THREE.TextureLoader();
    loader.crossOrigin = 'anonymous';
    (function attempt() {
      if (i >= list.length) return;
      var url = list[i++];
      loader.load(url, onLoad, undefined, attempt);
    })();
  }

  // ------------------------------------------------------------------
  // Avión: silueta tipo "dardo" (la nariz apunta a -Z, que es el frente
  // para Object3D.lookAt) con ala y cola en la mitad trasera.
  // ------------------------------------------------------------------
  function buildPlane() {
    var g = new THREE.Group();
    var body = new THREE.MeshBasicMaterial({ color: 0xffffff });
    var red = new THREE.MeshBasicMaterial({ color: 0xe3262f });
    var glass = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
    var bodyGeo = new THREE.ConeGeometry(0.0032, 0.055, 12);
    bodyGeo.rotateX(-Math.PI / 2);
    g.add(new THREE.Mesh(bodyGeo, body));
    var cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.0021, 10, 10), glass);
    cockpit.position.set(0, 0.0018, -0.014);
    g.add(cockpit);
    var wing = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.0007, 0.009), body);
    wing.position.set(0, 0, 0.007);
    g.add(wing);
    var fin = new THREE.Mesh(new THREE.BoxGeometry(0.0007, 0.009, 0.011), red);
    fin.position.set(0, 0.0045, 0.021);
    g.add(fin);
    var stab = new THREE.Mesh(new THREE.BoxGeometry(0.017, 0.0006, 0.005), body);
    stab.position.set(0, 0, 0.0235);
    g.add(stab);
    var tipL = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.0009, 0.0035), red);
    tipL.position.set(-0.0165, 0, 0.0085); g.add(tipL);
    var tipR = tipL.clone(); tipR.position.x = 0.0165; g.add(tipR);
    return g;
  }

  function starSprite() {
    var size = 64, cv = document.createElement('canvas');
    cv.width = cv.height = size;
    var ctx = cv.getContext('2d');
    var grd = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.4, 'rgba(255,255,255,0.7)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(cv);
  }

  // ------------------------------------------------------------------
  // Construcción de la escena (una sola vez)
  // ------------------------------------------------------------------
  function build() {
    var host = $('earth-canvas');
    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x050505, 1);
    host.appendChild(renderer.domElement);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 1500);
    camera.position.set(1.35, 0.85, 1.1);

    var controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 0.7;
    controls.maxDistance = 6;
    controls.enablePan = false;
    controls.rotateSpeed = 0.6;
    controls.enabled = true;

    scene.add(new THREE.AmbientLight(0xffffff, 1.25));

    // estrellas
    var starCount = 2600, pos = new Float32Array(starCount * 3);
    for (var i = 0; i < starCount; i++) {
      var r = 60 + Math.random() * 60, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
      pos[i * 3 + 2] = r * Math.cos(ph);
    }
    var sgeo = new THREE.BufferGeometry();
    sgeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    scene.add(new THREE.Points(sgeo, new THREE.PointsMaterial({ size: 0.6, map: starSprite(), transparent: true, depthWrite: false, color: 0xffffff })));

    var earthGroup = new THREE.Object3D();
    scene.add(earthGroup);

    var surfaceMat = new THREE.MeshPhongMaterial({ color: 0x1c3550, shininess: 4 });
    earthGroup.add(new THREE.Mesh(new THREE.SphereGeometry(EARTH_RADIUS, 64, 64), surfaceMat));
    loadTexture(TEXTURES.earth, function (tex) {
      surfaceMat.map = tex; surfaceMat.color.set(0xffffff); surfaceMat.needsUpdate = true;
    });

    var cloudsMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.0, depthWrite: false });
    var clouds = new THREE.Mesh(new THREE.SphereGeometry(EARTH_RADIUS + 0.004, 64, 64), cloudsMat);
    earthGroup.add(clouds);
    loadTexture(TEXTURES.clouds, function (tex) {
      cloudsMat.alphaMap = tex; cloudsMat.opacity = 0.42; cloudsMat.needsUpdate = true;
    });

    var glowMat = new THREE.ShaderMaterial({
      uniforms: {
        c: { value: 0.55 }, p: { value: 4.2 },
        glowColor: { value: new THREE.Color(0xffd9d9) },
        viewVector: { value: camera.position.clone() },
      },
      vertexShader: [
        'uniform vec3 viewVector; uniform float c; uniform float p; varying float intensity;',
        'void main() {',
        '  vec3 vNormal = normalize( normalMatrix * normal );',
        '  vec3 vNormel = normalize( normalMatrix * viewVector );',
        '  intensity = pow( c - dot(vNormal, vNormel), p );',
        '  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
        '}',
      ].join('\n'),
      fragmentShader: [
        'uniform vec3 glowColor; varying float intensity;',
        'void main() { gl_FragColor = vec4( glowColor * intensity, intensity ); }',
      ].join('\n'),
      side: THREE.BackSide, blending: THREE.AdditiveBlending, transparent: true,
    });
    var glow = new THREE.Mesh(new THREE.SphereGeometry(EARTH_RADIUS + 0.045, 64, 64), glowMat);
    earthGroup.add(glow);

    var remaining = new THREE.Line(new THREE.BufferGeometry(),
      new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 0.012, gapSize: 0.008, transparent: true, opacity: 0.8 }));
    var traveled = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xff2d38 }));
    earthGroup.add(remaining); earthGroup.add(traveled);

    function marker(color, size) {
      return new THREE.Mesh(new THREE.SphereGeometry(0.008 * size, 16, 16), new THREE.MeshBasicMaterial({ color: color }));
    }
    var originMarker = marker(0xffffff, 1.2), destMarker = marker(0xff2d38, 1.3), midMarker = marker(0xbdbdbd, 0.8);
    earthGroup.add(originMarker); earthGroup.add(destMarker); earthGroup.add(midMarker);

    var labelsHost = $('earth-labels');
    var labels = [originMarker, destMarker, midMarker].map(function (obj, i) {
      var d = document.createElement('div');
      d.className = 'city-label' + (i === 1 ? ' dest' : '') + (i === 2 ? ' mid' : '');
      labelsHost.appendChild(d);
      return { obj: obj, el: d };
    });
    labels[2].el.textContent = 'Punto medio de ruta';

    var plane = buildPlane();
    earthGroup.add(plane);

    G = {
      renderer: renderer, scene: scene, camera: camera, controls: controls, clouds: clouds, glowMat: glowMat, glow: glow,
      remaining: remaining, traveled: traveled, originMarker: originMarker, destMarker: destMarker, midMarker: midMarker,
      labels: labels, plane: plane,
    };

    window.addEventListener('resize', function () {
      if (!G) return;
      G.camera.aspect = window.innerWidth / window.innerHeight;
      G.camera.updateProjectionMatrix();
      G.renderer.setSize(window.innerWidth, window.innerHeight);
      if (!running && leg) render();
    });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { pauseLoop(); } else if (running) { resumeLoop(); }
    });
  }

  // ------------------------------------------------------------------
  // HUD
  // ------------------------------------------------------------------
  function formatHM(h) {
    var m = Math.max(0, Math.round(h * 60));
    return Math.floor(m / 60) + 'h ' + (m % 60 < 10 ? '0' : '') + (m % 60) + 'm';
  }
  function updateClocks() {
    if (!leg) return;
    try {
      var now = new Date();
      var fmt = function (tz) {
        return new Intl.DateTimeFormat('es-CO', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(now);
      };
      $('clock-origin').textContent = fmt(leg.origin.tz);
      $('clock-destination').textContent = fmt(leg.destination.tz);
    } catch (e) { /* sin soporte de zona horaria */ }
  }

  function worldToScreen(obj) {
    var wp = obj.getWorldPosition(new THREE.Vector3());
    var normal = wp.clone().normalize();
    var toCam = G.camera.position.clone().sub(wp).normalize();
    var facing = normal.dot(toCam) > 0.05;
    var pr = wp.clone().project(G.camera);
    return { visible: facing && pr.z < 1, x: (pr.x * 0.5 + 0.5) * window.innerWidth, y: (-pr.y * 0.5 + 0.5) * window.innerHeight };
  }

  function updateLabels() {
    G.labels.forEach(function (l) {
      var s = worldToScreen(l.obj);
      l.el.style.opacity = s.visible ? '1' : '0';
      if (s.visible) l.el.style.transform = 'translate(' + s.x + 'px,' + s.y + 'px) translate(-50%, -170%)';
    });
  }

  // ------------------------------------------------------------------
  // Bucle
  // ------------------------------------------------------------------
  function render() {
    G.controls.update();
    G.glowMat.uniforms.viewVector.value = G.camera.position.clone().sub(G.glow.position);
    G.renderer.render(G.scene, G.camera);
  }

  function frame(now) {
    rafId = requestAnimationFrame(frame);
    var dt = lastFrame ? (now - lastFrame) / 1000 : 0;
    lastFrame = now;
    elapsed += Math.min(dt, 0.1);
    var t = clamp(elapsed / leg.duration, 0, 1);

    var p = positionAt(t);
    var p2 = positionAt(Math.min(t + 0.001, 1));
    G.plane.position.copy(p);
    G.plane.up.copy(p.clone().normalize());
    G.plane.lookAt(p2);

    var done = Math.max(1, Math.floor(t * PATH_SEGMENTS));
    G.traveled.geometry.setDrawRange(0, done + 1);
    G.remaining.geometry.setDrawRange(done, PATH_SEGMENTS + 1 - done);
    G.clouds.rotation.y += 0.00025;

    var alt = altMeters(t);
    $('stat-speed').textContent = Math.round(speedKmh(t)).toLocaleString('es-CO');
    $('stat-altitude').textContent = Math.round(alt).toLocaleString('es-CO');
    $('stat-altitude-ft').textContent = Math.round(alt * 3.28084).toLocaleString('es-CO');
    $('stat-temp').textContent = Math.round(extTemp(alt));
    $('stat-eta').textContent = formatHM(leg.hours * (1 - t));
    $('progress-fill').style.transform = 'scaleX(' + t.toFixed(4) + ')';
    $('progress-pct').textContent = Math.round(t * 100) + '%';

    // seguimiento suave: solo el punto de mira persigue al avión; la
    // órbita/zoom quedan en manos del usuario.
    var fwd = p2.clone().sub(p);
    if (fwd.lengthSq() < 1e-10) fwd.set(0, 0, -1);
    fwd.normalize();
    G.controls.target.lerp(p.clone().add(fwd.multiplyScalar(0.02)), 0.06);

    render();

    if (now - lastLabelUpdate > 33) { updateLabels(); lastLabelUpdate = now; }

    if (t >= 1 && !leg.arrived) {
      leg.arrived = true;
      showPin();
      if (leg.onArrive) leg.onArrive();
    }
  }

  function pauseLoop() {
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    lastFrame = 0;
  }
  function resumeLoop() {
    if (rafId === null && running && G && leg) { lastFrame = 0; rafId = requestAnimationFrame(frame); }
  }

  function showPin() {
    var pin = $('arrival-pin');
    var s = worldToScreen(G.destMarker);
    pin.classList.remove('show');
    void pin.offsetWidth;
    pin.style.left = s.x + 'px';
    pin.style.top = s.y + 'px';
    pin.classList.add('show');
  }

  // ------------------------------------------------------------------
  // API pública
  // ------------------------------------------------------------------
  function preload() {
    if (!readyPromise) {
      readyPromise = loadLibs().then(function () { build(); });
      readyPromise.catch(function () { readyPromise = null; });
    }
    return readyPromise;
  }

  function start(opts) {
    if (!G) throw new Error('Earth no inicializada');
    stop();
    var o = opts.origin, d = opts.destination;
    leg = {
      origin: o, destination: d, onArrive: opts.onArrive, duration: opts.duration || 4, arrived: false,
      originDir: latLonToUnit(o.lat, o.lon).normalize(),
      destDir: latLonToUnit(d.lat, d.lon).normalize(),
    };
    leg.angle = leg.originDir.angleTo(leg.destDir);
    leg.km = haversineKm(o, d);
    leg.hours = leg.km / (CRUISE_SPEED_KMH * 0.93);

    var pts = [];
    for (var i = 0; i <= PATH_SEGMENTS; i++) {
      pts.push(slerpDir(leg.originDir, leg.destDir, i / PATH_SEGMENTS, leg.angle).multiplyScalar(EARTH_RADIUS + CRUISE_ALT_OFFSET));
    }
    G.traveled.geometry.dispose(); G.traveled.geometry = lineGeometry(pts); G.traveled.geometry.setDrawRange(0, 0);
    G.remaining.geometry.dispose(); G.remaining.geometry = lineGeometry(pts); G.remaining.computeLineDistances();
    G.originMarker.position.copy(leg.originDir.clone().multiplyScalar(EARTH_RADIUS + 0.002));
    G.destMarker.position.copy(leg.destDir.clone().multiplyScalar(EARTH_RADIUS + 0.002));
    G.midMarker.position.copy(slerpDir(leg.originDir, leg.destDir, 0.5, leg.angle).multiplyScalar(EARTH_RADIUS + CRUISE_ALT_OFFSET));
    G.labels[0].el.textContent = o.name + ' (' + o.code + ')';
    G.labels[1].el.textContent = d.name + ' (' + d.code + ')';

    $('flight-code').textContent = opts.code || 'AV045';
    $('route-origin-code').textContent = o.code;
    $('route-dest-code').textContent = d.code;
    $('clock-city-origin').textContent = o.name + ' (origen)';
    $('clock-city-destination').textContent = d.name + ' (destino)';
    $('arrival-pin-label').textContent = d.name;
    $('arrival-pin').classList.remove('show');

    // encuadre inicial: desde fuera del globo, mirando el inicio de la ruta
    var view = slerpDir(leg.originDir, leg.destDir, 0.3, leg.angle);
    var up = new THREE.Vector3(0, 1, 0);
    var side = new THREE.Vector3().crossVectors(view, up).normalize().multiplyScalar(0.35);
    G.camera.position.copy(view.clone().multiplyScalar(1.85).add(side).add(new THREE.Vector3(0, 0.35, 0)));
    G.controls.target.copy(leg.originDir.clone().multiplyScalar(EARTH_RADIUS + 0.02));
    G.controls.update();

    elapsed = 0; lastFrame = 0;
    running = true;
    updateClocks();
    clockTimer = setInterval(updateClocks, 1000);
    rafId = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    pauseLoop();
    if (clockTimer) { clearInterval(clockTimer); clockTimer = null; }
    if (leg) leg.onArrive = null;
    var pin = $('arrival-pin');
    if (pin) pin.classList.remove('show');
  }

  window.Earth = {
    preload: preload,
    start: start,
    stop: stop,
    isRunning: function () { return running && rafId !== null; },
    isReady: function () { return !!G; },
  };
})();
