/* ============================================================================
   Correr para Vivir — Juego Educativo (arquitectura base)
   ----------------------------------------------------------------------------
   Escena 0: sala de espera ("salaespera.jpg") + audio del capitán
             ("Audio_capitan.mp3"). El audio NO se corta: suena completo,
             de principio a fin. A los 49s exactos del audio se muestra,
             en simultáneo (el audio sigue sonando de fondo), la secuencia
             de despegue.
   Despegue: "apuntodespegar.mp4" encadenado sin corte con "despegando.mp4"
             (el segundo video se precarga antes de que termine el primero).
   Escena 1: vuelo 3D Bogotá -> Sudán del Sur (Three.js), un solo recorrido
             de 3.5 segundos con cámara que sigue al avión (por detrás y por
             encima, como una cámara de persecución) en todo momento. Al
             llegar, aparece un pin animado y la escena queda estática
             exactamente 2 segundos antes de abrir la siguiente pantalla.
   Escena 2: llegada al aeropuerto ("aeropuerto_sudan.jpg") + presentación
             del guía López Lomong.
   Escena 3: video "Correr para vivir (primera parte)" + pregunta de opción
             múltiple. Si la respuesta es incorrecta se puede reintentar; al
             acertar, se avanza a la Escena 4.
   Escena 4: video "correrparavivir2.mp4" + pregunta Verdadero/Falso. Al
             acertar, se repite la Escena 1 (misma lógica/temporización) pero
             con la ruta Sudán del Sur -> Kenia.
   Escena 5: video "video_serpersona.mp4" + contexto y pregunta de reflexión
             (pantalla final, de solo lectura).

   Notas de corrección de bugs:
   - Las imágenes/videos viven en una carpeta "assets" HERMANA de esta carpeta
     ("3D Earth"), no dentro de ella. Por eso todas las rutas usan "../assets/…".
   - Los nombres de archivo con espacios se pasan por encodeURI() para que los
     espacios no rompan la ruta.
   - Toda la inicialización de Three.js queda protegida con try/catch y con
     verificación de que las librerías del CDN sí cargaron, para no volver a
     dejar la pantalla en blanco si la red falla.
   - Solo se usa luz ambiental (sin luz direccional/puntual/foco), así que la
     Tierra nunca tiene lado oscuro ni sombras.
   - El avión se reconstruyó como una silueta tipo "dardo": la punta (nariz)
     queda sola en la mitad delantera, y ala + aleta + estabilizador quedan
     agrupados en la mitad trasera, para que el frente se lea sin ambigüedad
     desde cualquier ángulo de cámara (antes podía confundirse la cola con el
     frente y parecer que volaba "al revés"/"hacia atrás").
   - La cámara de seguimiento ahora persigue al avión por detrás y por encima
     (como una cámara de tercera persona clásica) en vez de flotar justo
     encima mirando hacia abajo, lo que hace mucho más evidente el sentido
     real del vuelo.
   - El bucle de animación 3D NO arranca al cargar la página: arranca solo
     cuando termina el despegue, para que los 3.5s de vuelo se cuenten desde
     ese instante.
   - La ruta de vuelo (origen/destino/etiquetas/HUD) es reconfigurable
     mediante configureLeg(), para poder reutilizar exactamente la misma
     escena y lógica en el segundo tramo (Sudán del Sur -> Kenia).
============================================================================ */

(function () {
  'use strict';

  // --------------------------------------------------------------------
  // 0. Utilidades
  // --------------------------------------------------------------------
  var deg2rad = function (d) { return (d * Math.PI) / 180; };
  var clamp = function (v, min, max) { return Math.max(min, Math.min(max, v)); };
  var smoothstep = function (edge0, edge1, x) {
    var t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  };

  function showFatalError(message) {
    var screen = document.getElementById('loading-screen');
    if (!screen) return;
    screen.innerHTML =
      '<div style="max-width:420px;text-align:center;padding:0 24px;">' +
      '<div style="font-size:15px;font-weight:600;margin-bottom:8px;color:#ff8a8a;">No se pudo iniciar la escena 3D</div>' +
      '<div style="font-size:12.5px;opacity:0.8;line-height:1.5;">' + message + '</div>' +
      '</div>';
    screen.classList.remove('hidden');
  }

  function hideLoadingScreen() {
    var screen = document.getElementById('loading-screen');
    if (screen) screen.classList.add('hidden');
  }

  if (typeof THREE === 'undefined') {
    showFatalError('No se pudo cargar Three.js desde el CDN. Verifica tu conexión a internet y vuelve a abrir la página.');
    return;
  }
  if (typeof THREE.OrbitControls === 'undefined') {
    showFatalError('No se pudo cargar OrbitControls desde el CDN. Verifica tu conexión a internet y vuelve a abrir la página.');
    return;
  }

  // --------------------------------------------------------------------
  // 1. Gestor de escenas
  // --------------------------------------------------------------------
  var SceneManager = {
    history: [],
    current: null,
    activate: function (id, opts) {
      var skipHistory = opts && opts.skipHistory;
      if (!skipHistory && this.current && this.current !== id) {
        this.history.push(this.current);
      }
      this.current = id;
      var scenes = document.querySelectorAll('.scene');
      for (var i = 0; i < scenes.length; i++) {
        scenes[i].classList.remove('active');
      }
      var target = document.getElementById(id);
      if (target) target.classList.add('active');
    },
    goBack: function () {
      if (this.history.length === 0) return;
      var previous = this.history.pop();
      this.activate(previous, { skipHistory: true });
      this.current = previous;
    },
  };

  // Botón "Volver" genérico: pausa cualquier audio/video de la escena que se
  // abandona (para no dejar sonido/video cruzado) y regresa a la anterior.
  document.querySelectorAll('.back-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('video, audio').forEach(function (media) {
        if (!media.paused) media.pause();
      });
      SceneManager.goBack();
    });
  });

  // --------------------------------------------------------------------
  // 2. Configuración general y ciudades de la ruta
  // --------------------------------------------------------------------
  var EARTH_RADIUS = 0.5;
  var CRUISE_ALT_OFFSET = 0.075;
  var PATH_SEGMENTS = 220;
  var FLIGHT_ANIM_SECONDS = 4;
  var CRUISE_SPEED_KMH = 880;
  var CRUISE_ALT_M = 11000;

  var BOGOTA = { name: 'Bogotá', code: 'BOG', lat: 4.711, lon: -74.0721, tz: 'America/Bogota' };
  var SUDAN_DEL_SUR = { name: 'Sudán del Sur', code: 'SSD', lat: 4.8517, lon: 31.5825, tz: 'Africa/Juba' };
  var KENIA = { name: 'Kenia', code: 'KEN', lat: -1.2921, lon: 36.8219, tz: 'Africa/Nairobi' };
  var ESTADOS_UNIDOS = { name: 'Estados Unidos', code: 'USA', lat: 38.9072, lon: -77.0369, tz: 'America/New_York' };

  function haversineKm(a, b) {
    var R = 6371;
    var dLat = deg2rad(b.lat - a.lat);
    var dLon = deg2rad(b.lon - a.lon);
    var lat1 = deg2rad(a.lat);
    var lat2 = deg2rad(b.lat);
    var h =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  function latLonToUnitVector(lat, lon) {
    var phi = deg2rad(90 - lat);
    var theta = deg2rad(lon + 180);
    var x = -Math.sin(phi) * Math.cos(theta);
    var y = Math.cos(phi);
    var z = Math.sin(phi) * Math.sin(theta);
    return new THREE.Vector3(x, y, z);
  }

  function slerpDir(a, b, t, omega) {
    if (omega < 1e-6) return a.clone().lerp(b, t).normalize();
    var sinOmega = Math.sin(omega);
    var f1 = Math.sin((1 - t) * omega) / sinOmega;
    var f2 = Math.sin(t * omega) / sinOmega;
    return new THREE.Vector3(
      a.x * f1 + b.x * f2,
      a.y * f1 + b.y * f2,
      a.z * f1 + b.z * f2
    ).normalize();
  }

  function altitudeOffsetAt(t) {
    var climb = smoothstep(0, 0.08, t);
    var descent = 1 - smoothstep(0.9, 1, t);
    return CRUISE_ALT_OFFSET * Math.min(climb, descent);
  }

  function altitudeMetersAt(t) {
    var climb = smoothstep(0, 0.08, t);
    var descent = 1 - smoothstep(0.9, 1, t);
    return CRUISE_ALT_M * Math.min(climb, descent);
  }

  function speedKmhAt(t) {
    var climb = smoothstep(0, 0.06, t);
    var descent = 1 - smoothstep(0.94, 1, t);
    var base = CRUISE_SPEED_KMH * Math.min(climb, descent);
    var wobble = Math.sin(t * 90) * 6;
    return Math.max(0, base + (base > 50 ? wobble : 0));
  }

  function exteriorTempAt(altitudeM) {
    var altKm = altitudeM / 1000;
    return 15 - 6.5 * Math.min(altKm, 11);
  }

  // Estado de la ruta activa (originDir/destDir/... se recalculan en
  // configureLeg() para poder reutilizar la misma escena en el segundo
  // tramo del vuelo).
  var originDir, destDir, routeAngle, pathPoints;
  var TOTAL_DISTANCE_KM, FLIGHT_DURATION_HOURS;
  var currentLeg = null;

  function positionAt(t) {
    var dir = slerpDir(originDir, destDir, t, routeAngle);
    var r = EARTH_RADIUS + altitudeOffsetAt(t);
    return dir.multiplyScalar(r);
  }

  // --------------------------------------------------------------------
  // 3. Escena, cámara y renderer
  // --------------------------------------------------------------------
  var sceneFlightHost = document.getElementById('scene-flight');
  var renderer, scene, camera, controls;

  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = false;
    sceneFlightHost.appendChild(renderer.domElement);

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 1500);
    camera.position.set(1.35, 0.85, 1.1);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 0.75;
    controls.maxDistance = 6;
    controls.target.set(0, 0, 0);
    // La cámara sigue "suave" al avión: solo el punto de mira (target) se
    // desplaza hacia el avión cada cuadro. La posición de la cámara en sí
    // queda completamente bajo control de OrbitControls, así que el usuario
    // puede arrastrar para orbitar y usar la rueda para hacer zoom en
    // cualquier momento, incluso durante el vuelo, sin perder el seguimiento.
    controls.enabled = true;
  } catch (err) {
    showFatalError('Error creando el contexto WebGL: ' + err.message);
    return;
  }

  // --------------------------------------------------------------------
  // 4. Iluminación — solo luz ambiental: Tierra 100% iluminada, sin sombras
  // --------------------------------------------------------------------
  var ambientLight = new THREE.AmbientLight(0xffffff, 1.25);
  scene.add(ambientLight);

  // --------------------------------------------------------------------
  // 5. Estrellas de fondo (procedural)
  // --------------------------------------------------------------------
  function makeStarSpriteTexture() {
    var size = 64;
    var canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    var ctx = canvas.getContext('2d');
    var gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.4, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(canvas);
  }

  (function buildStarfield() {
    var starCount = 3000;
    var positions = new Float32Array(starCount * 3);
    for (var i = 0; i < starCount; i++) {
      var r = 60 + Math.random() * 60;
      var theta = Math.random() * Math.PI * 2;
      var phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    var geometry = new THREE.BufferGeometry();
    geometry.addAttribute
      ? geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3))
      : geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    var material = new THREE.PointsMaterial({
      size: 0.6,
      map: makeStarSpriteTexture(),
      transparent: true,
      depthWrite: false,
      color: 0xffffff,
    });
    scene.add(new THREE.Points(geometry, material));
  })();

  // --------------------------------------------------------------------
  // 6. Planeta — superficie + nubes + resplandor atmosférico
  // --------------------------------------------------------------------
  var textureLoader = new THREE.TextureLoader();
  textureLoader.crossOrigin = 'anonymous';

  var earthGroup = new THREE.Object3D();
  scene.add(earthGroup);

  var surfaceMaterial = new THREE.MeshPhongMaterial({ color: 0x1c3f66, shininess: 4 });
  var surface = new THREE.Mesh(new THREE.SphereGeometry(EARTH_RADIUS, 64, 64), surfaceMaterial);
  surface.name = 'surface';
  earthGroup.add(surface);

  textureLoader.load(
    'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg',
    function (tex) {
      surfaceMaterial.map = tex;
      surfaceMaterial.color.set(0xffffff);
      surfaceMaterial.needsUpdate = true;
    },
    undefined,
    function () { /* sin internet: se conserva el color sólido, nunca invisible */ }
  );

  var cloudsMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.35, depthWrite: false });
  var clouds = new THREE.Mesh(new THREE.SphereGeometry(EARTH_RADIUS + 0.004, 64, 64), cloudsMaterial);
  earthGroup.add(clouds);

  textureLoader.load(
    'https://threejs.org/examples/textures/planets/earth_clouds_1024.png',
    function (tex) { cloudsMaterial.map = tex; cloudsMaterial.needsUpdate = true; },
    undefined,
    function () {}
  );

  var glowMaterial = new THREE.ShaderMaterial({
    uniforms: {
      c: { value: 0.55 },
      p: { value: 4.2 },
      glowColor: { value: new THREE.Color(0x6fd0ff) },
      viewVector: { value: camera.position.clone() },
    },
    vertexShader: [
      'uniform vec3 viewVector;',
      'uniform float c;',
      'uniform float p;',
      'varying float intensity;',
      'void main() {',
      '  vec3 vNormal = normalize( normalMatrix * normal );',
      '  vec3 vNormel = normalize( normalMatrix * viewVector );',
      '  intensity = pow( c - dot(vNormal, vNormel), p );',
      '  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
      '}',
    ].join('\n'),
    fragmentShader: [
      'uniform vec3 glowColor;',
      'varying float intensity;',
      'void main() {',
      '  vec3 glow = glowColor * intensity;',
      '  gl_FragColor = vec4( glow, intensity );',
      '}',
    ].join('\n'),
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    transparent: true,
  });
  var atmosphericGlow = new THREE.Mesh(new THREE.SphereGeometry(EARTH_RADIUS + 0.045, 64, 64), glowMaterial);
  earthGroup.add(atmosphericGlow);

  // --------------------------------------------------------------------
  // 7. Trayectoria de círculo máximo (la geometría se recalcula por tramo
  //    en configureLeg, más abajo)
  // --------------------------------------------------------------------
  function buildLineGeometry(points) {
    var geo = new THREE.BufferGeometry();
    var arr = new Float32Array(points.length * 3);
    for (var j = 0; j < points.length; j++) {
      arr[j * 3] = points[j].x;
      arr[j * 3 + 1] = points[j].y;
      arr[j * 3 + 2] = points[j].z;
    }
    geo.addAttribute
      ? geo.addAttribute('position', new THREE.BufferAttribute(arr, 3))
      : geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    return geo;
  }

  var remainingLine = new THREE.Line(
    new THREE.BufferGeometry(),
    new THREE.LineDashedMaterial({ color: 0xffd23f, dashSize: 0.012, gapSize: 0.008, transparent: true, opacity: 0.85 })
  );
  earthGroup.add(remainingLine);

  var traveledLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x35d07f, linewidth: 2 }));
  earthGroup.add(traveledLine);

  // --------------------------------------------------------------------
  // 8. Marcadores de ciudades y etiquetas (posiciones reales asignadas en
  //    configureLeg)
  // --------------------------------------------------------------------
  function makeMarker(color, sizeMultiplier) {
    return new THREE.Mesh(new THREE.SphereGeometry(0.008 * (sizeMultiplier || 1), 16, 16), new THREE.MeshBasicMaterial({ color: color }));
  }

  var originMarker = makeMarker(0x35d07f, 1.2);
  earthGroup.add(originMarker);

  var destMarker = makeMarker(0xff6f6f, 1.2);
  earthGroup.add(destMarker);

  var midMarker = makeMarker(0x6fd0ff, 0.8);
  earthGroup.add(midMarker);

  var labelDefs = [
    { obj: originMarker, text: '' },
    { obj: destMarker, text: '' },
    { obj: midMarker, text: 'Punto medio de ruta' },
  ];

  var labelsContainer = document.createElement('div');
  labelsContainer.id = 'city-labels';
  labelsContainer.style.position = 'fixed';
  labelsContainer.style.left = '0';
  labelsContainer.style.top = '0';
  labelsContainer.style.width = '100%';
  labelsContainer.style.height = '100%';
  labelsContainer.style.pointerEvents = 'none';
  labelsContainer.style.zIndex = '5';
  sceneFlightHost.appendChild(labelsContainer);

  labelDefs.forEach(function (def) {
    var el = document.createElement('div');
    el.textContent = def.text;
    el.style.position = 'absolute';
    el.style.transform = 'translate(-50%, -160%)';
    el.style.padding = '3px 8px';
    el.style.borderRadius = '999px';
    el.style.fontSize = '10.5px';
    el.style.fontFamily = "'Segoe UI', system-ui, sans-serif";
    el.style.color = '#eaf4ff';
    el.style.background = 'rgba(8, 13, 24, 0.65)';
    el.style.border = '1px solid rgba(130, 190, 255, 0.3)';
    el.style.whiteSpace = 'nowrap';
    el.style.backdropFilter = 'blur(4px)';
    labelsContainer.appendChild(el);
    def.el = el;
  });

  var tmpVec = new THREE.Vector3();
  function worldToScreen(object3D) {
    var worldPos = object3D.getWorldPosition(tmpVec.clone());
    var normal = worldPos.clone().normalize();
    var toCam = camera.position.clone().sub(worldPos).normalize();
    var facingCamera = normal.dot(toCam) > 0.05;
    var projected = worldPos.clone().project(camera);
    var behindCamera = projected.z > 1;
    return {
      visible: facingCamera && !behindCamera,
      x: (projected.x * 0.5 + 0.5) * window.innerWidth,
      y: (-projected.y * 0.5 + 0.5) * window.innerHeight,
    };
  }

  function updateLabels() {
    labelDefs.forEach(function (def) {
      var screen = worldToScreen(def.obj);
      def.el.style.opacity = screen.visible ? '1' : '0';
      if (screen.visible) {
        def.el.style.left = screen.x + 'px';
        def.el.style.top = screen.y + 'px';
      }
    });
  }

  // Referencias de HUD que configureLeg() actualiza por tramo.
  var routeOriginCodeEl = document.getElementById('route-origin-code');
  var routeDestCodeEl = document.getElementById('route-dest-code');
  var clockCityOriginEl = document.getElementById('clock-city-origin');
  var clockCityDestinationEl = document.getElementById('clock-city-destination');
  var arrivalPinLabelEl = document.getElementById('arrival-pin-label');

  // --------------------------------------------------------------------
  // 8b. configureLeg — deja lista la escena 3D para un tramo de vuelo
  //     concreto (origen -> destino) y qué hacer al llegar.
  // --------------------------------------------------------------------
  function configureLeg(origin, destination, onArrival) {
    currentLeg = { origin: origin, destination: destination, onArrival: onArrival };

    originDir = latLonToUnitVector(origin.lat, origin.lon).normalize();
    destDir = latLonToUnitVector(destination.lat, destination.lon).normalize();
    routeAngle = originDir.angleTo(destDir);
    TOTAL_DISTANCE_KM = haversineKm(origin, destination);
    FLIGHT_DURATION_HOURS = TOTAL_DISTANCE_KM / (CRUISE_SPEED_KMH * 0.93);

    pathPoints = [];
    for (var i = 0; i <= PATH_SEGMENTS; i++) {
      var dir = slerpDir(originDir, destDir, i / PATH_SEGMENTS, routeAngle);
      pathPoints.push(dir.multiplyScalar(EARTH_RADIUS + CRUISE_ALT_OFFSET));
    }

    traveledLine.geometry.dispose();
    traveledLine.geometry = buildLineGeometry(pathPoints);
    traveledLine.geometry.setDrawRange(0, 0);

    remainingLine.geometry.dispose();
    remainingLine.geometry = buildLineGeometry(pathPoints);
    remainingLine.computeLineDistances();

    originMarker.position.copy(originDir.clone().multiplyScalar(EARTH_RADIUS + 0.002));
    destMarker.position.copy(destDir.clone().multiplyScalar(EARTH_RADIUS + 0.002));
    var midDir = slerpDir(originDir, destDir, 0.5, routeAngle);
    midMarker.position.copy(midDir.clone().multiplyScalar(EARTH_RADIUS + CRUISE_ALT_OFFSET));

    labelDefs[0].text = origin.name + ' (' + origin.code + ')';
    labelDefs[0].el.textContent = labelDefs[0].text;
    labelDefs[1].text = destination.name + ' (' + destination.code + ')';
    labelDefs[1].el.textContent = labelDefs[1].text;

    if (routeOriginCodeEl) routeOriginCodeEl.textContent = origin.code;
    if (routeDestCodeEl) routeDestCodeEl.textContent = destination.code;
    if (clockCityOriginEl) clockCityOriginEl.textContent = origin.name + ' (origen)';
    if (clockCityDestinationEl) clockCityDestinationEl.textContent = destination.name + ' (destino)';
    if (arrivalPinLabelEl) arrivalPinLabelEl.textContent = destination.name;

    flightStartMs = null;
    arrivalTriggered = false;
  }

  // --------------------------------------------------------------------
  // 9. Avión 3D — silueta tipo "dardo": la nariz queda sola en la mitad
  //    delantera y ala+aleta+estabilizador agrupados en la mitad trasera,
  //    para que el frente se lea sin ambigüedad desde cualquier ángulo.
  //    (assets/foto_avion.jpg se usa como referencia visual y como
  //    miniatura en el HUD/favicon).
  // --------------------------------------------------------------------
  function buildPlane() {
    var group = new THREE.Group();
    var bodyMat = new THREE.MeshBasicMaterial({ color: 0xf4f7fb });
    var accentMat = new THREE.MeshBasicMaterial({ color: 0xe23b3b });
    var glassMat = new THREE.MeshBasicMaterial({ color: 0x2c3e50 });

    // Fuselaje: un cono largo con la geometría pre-rotada para que su
    // punta (apex, originalmente en +Y) quede en -Z. Object3D.lookAt()
    // orienta el eje -Z local del objeto hacia el objetivo, así que -Z
    // ES el "frente" del modelo: la punta del cono queda mirando siempre
    // hacia donde vuela el avión.
    var bodyGeo = new THREE.ConeGeometry(0.0032, 0.055, 10);
    bodyGeo.rotateX(-Math.PI / 2);
    group.add(new THREE.Mesh(bodyGeo, bodyMat));

    // Cabina, justo detrás de la punta (mitad delantera, sin nada más
    // alrededor para que la nariz se lea con claridad).
    var cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.0021, 10, 10), glassMat);
    cockpit.position.set(0, 0.0018, -0.014);
    group.add(cockpit);

    // Ala principal — en la mitad TRASERA del cuerpo (no en el centro),
    // para reforzar visualmente cuál extremo es la cola.
    var wing = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.0007, 0.009), bodyMat);
    wing.position.set(0, 0, 0.007);
    group.add(wing);

    // Aleta vertical de cola, cerca de la punta trasera.
    var fin = new THREE.Mesh(new THREE.BoxGeometry(0.0007, 0.009, 0.011), accentMat);
    fin.position.set(0, 0.0045, 0.021);
    group.add(fin);

    // Estabilizador horizontal, en el extremo trasero.
    var stab = new THREE.Mesh(new THREE.BoxGeometry(0.017, 0.0006, 0.005), bodyMat);
    stab.position.set(0, 0, 0.0235);
    group.add(stab);

    return group;
  }

  var plane = buildPlane();
  earthGroup.add(plane);
  plane.add(new THREE.PointLight(0xffffff, 0.4, 0.2));

  // --------------------------------------------------------------------
  // 10. HUD / Telemetría — referencias del DOM
  // --------------------------------------------------------------------
  var el = {
    progressFill: document.getElementById('progress-fill'),
    progressPct: document.getElementById('progress-pct'),
    speed: document.getElementById('stat-speed'),
    altitude: document.getElementById('stat-altitude'),
    altitudeFt: document.getElementById('stat-altitude-ft'),
    temp: document.getElementById('stat-temp'),
    eta: document.getElementById('stat-eta'),
    clockOrigin: document.getElementById('clock-origin'),
    clockDestination: document.getElementById('clock-destination'),
  };

  // El punto de mira de la cámara sigue al avión siempre, pero la posición
  // de la cámara la sigue controlando el usuario (orbitar/zoom libres).
  var followPlane = true;

  function formatHM(hoursFloat) {
    var totalMinutes = Math.max(0, Math.round(hoursFloat * 60));
    var h = Math.floor(totalMinutes / 60);
    var m = totalMinutes % 60;
    return h + 'h ' + (m < 10 ? '0' : '') + m + 'm';
  }

  function updateClocks() {
    if (!currentLeg) return;
    try {
      var now = new Date();
      var fmt = function (tz) {
        return new Intl.DateTimeFormat('es-CO', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(now);
      };
      if (el.clockOrigin) el.clockOrigin.textContent = fmt(currentLeg.origin.tz);
      if (el.clockDestination) el.clockDestination.textContent = fmt(currentLeg.destination.tz);
    } catch (e) { /* Intl con zona horaria no soportado: se deja el placeholder */ }
  }
  updateClocks();
  setInterval(updateClocks, 1000);

  // --------------------------------------------------------------------
  // 11. Escena 2 — Llegada (aeropuerto + López Lomong)
  // --------------------------------------------------------------------
  var lopezEl = document.getElementById('lopez');
  var dialogueBox = document.getElementById('dialogue-box');
  var dialogueContinueBtn = document.getElementById('dialogue-continue');

  function startArrivalScene() {
    SceneManager.activate('scene-arrival');
    lopezEl.classList.remove('offscreen-right');
    lopezEl.classList.add('offscreen-left');
    dialogueBox.classList.remove('visible');
    dialogueBox.classList.add('hidden');

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        lopezEl.classList.remove('offscreen-left');
        setTimeout(function () {
          dialogueBox.classList.remove('hidden');
          dialogueBox.classList.add('visible');
        }, 500);
      });
    });
  }

  dialogueContinueBtn.addEventListener('click', function () {
    dialogueBox.classList.remove('visible');
    dialogueBox.classList.add('hidden');
    lopezEl.classList.remove('offscreen-left');
    lopezEl.classList.add('offscreen-right');
    setTimeout(startQuizScene, 900);
  });

  // --------------------------------------------------------------------
  // 12. Motor genérico de preguntas (opción múltiple o verdadero/falso):
  //     cada click se evalúa al instante. Si es incorrecta, solo se marca
  //     como incorrecta (sin revelar la respuesta correcta) y el usuario
  //     puede seguir intentando con otras opciones. Al acertar, se bloquean
  //     las opciones y aparece el botón "Siguiente"; ese botón es el único
  //     que avanza de escena, y primero pausa el video de la escena actual
  //     para que no quede sonando/reproduciéndose debajo de la siguiente.
  // --------------------------------------------------------------------
  function setupQuiz(config) {
    var solved = false;

    config.optionButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (solved) return;
        var isCorrect = btn.getAttribute('data-correct') === 'true';

        config.optionButtons.forEach(function (b) { b.classList.remove('selected'); });
        btn.classList.add('selected');

        config.feedbackBox.classList.remove('hidden');
        config.feedbackBox.classList.toggle('state-correct', isCorrect);
        config.feedbackBox.classList.toggle('state-incorrect', !isCorrect);
        config.feedbackTitle.textContent = isCorrect ? '¡Correcto!' : (config.incorrectTitle || 'Incorrecto');
        config.feedbackText.textContent = isCorrect ? config.correctExplanation : (config.incorrectText || 'Vuelve a intentarlo.');

        if (isCorrect) {
          solved = true;
          btn.classList.add('correct');
          config.optionButtons.forEach(function (b) { b.disabled = true; });
          if (config.nextBtn) config.nextBtn.classList.remove('btn-hidden');
        } else {
          btn.classList.add('incorrect');
        }
      });
    });

    if (config.nextBtn) {
      config.nextBtn.addEventListener('click', function () {
        if (config.currentVideo) {
          try { config.currentVideo.pause(); } catch (e) {}
        }
        config.onCorrect();
      });
    }
  }

  // --------------------------------------------------------------------
  // 13. Escena 3 — Video "Correr para vivir (primera parte)" + opción múltiple
  // --------------------------------------------------------------------
  var VIDEO_SRC = encodeURI('../assets/Correr para vivir (primera parte).mp4');
  var CORRECT_EXPLANATION_1 =
    'A la edad de seis años, mientras asistía a la iglesia de su aldea en Sudán, unos soldados rebeldes ' +
    'irrumpieron en la misa y lo secuestraron en la caja de un camión militar junto con otros niños para ' +
    'convertirlos en niños soldado. Este hecho trágico inició su cautiverio en un campamento rebelde del que ' +
    'posteriormente lograría escapar con la ayuda de tres jóvenes mayores.';

  function startQuizScene() {
    SceneManager.activate('scene-quiz');
    var video = document.getElementById('quiz-video');
    if (!video.getAttribute('src')) video.src = VIDEO_SRC;
    var p = video.play();
    if (p && p.catch) p.catch(function () {});
  }

  setupQuiz({
    optionButtons: Array.prototype.slice.call(document.querySelectorAll('#quiz-options .quiz-option')),
    nextBtn: document.getElementById('quiz-next'),
    currentVideo: document.getElementById('quiz-video'),
    feedbackBox: document.getElementById('quiz-feedback'),
    feedbackTitle: document.getElementById('quiz-feedback-title'),
    feedbackText: document.getElementById('quiz-feedback-text'),
    correctExplanation: CORRECT_EXPLANATION_1,
    incorrectText: 'Revisa el video y vuelve a intentarlo.',
    onCorrect: function () { startQuiz2Scene(); },
  });

  // --------------------------------------------------------------------
  // 14. Escena 4 — Video "correrparavivir2.mp4" + Verdadero/Falso
  // --------------------------------------------------------------------
  var QUIZ2_VIDEO_SRC = encodeURI('../assets/correrparavivir2.mp4');
  var MOTHER_EXPLANATION =
    'A principios del verano de 2003, mientras Lopez estaba en el jardín de su casa en Nueva York, recibió la ' +
    'llamada de su amigo Simon desde el campo de refugiados de Kakuma. Simon le contó que su madre biológica ' +
    'había estado en el campo preguntando por él al escuchar rumores de que seguía vivo en América. Al ' +
    'enterarse y recibir el número telefónico, su madre adoptiva americana le animó a llamar de inmediato. ' +
    'Tras doce años sin escucharse (desde que fue secuestrado a los seis años), su madre respondió al teléfono ' +
    'reconociendo su nombre natal («¿Lopepe?») y rompió a llorar al confirmar que su hijo estaba vivo.';

  function startQuiz2Scene() {
    SceneManager.activate('scene-quiz2');
    var video = document.getElementById('quiz-video-2');
    if (!video.getAttribute('src')) video.src = QUIZ2_VIDEO_SRC;
    var p = video.play();
    if (p && p.catch) p.catch(function () {});
  }

  setupQuiz({
    optionButtons: Array.prototype.slice.call(document.querySelectorAll('#quiz2-options .quiz-option')),
    nextBtn: document.getElementById('quiz2-next'),
    currentVideo: document.getElementById('quiz-video-2'),
    feedbackBox: document.getElementById('quiz2-feedback'),
    feedbackTitle: document.getElementById('quiz2-feedback-title'),
    feedbackText: document.getElementById('quiz2-feedback-text'),
    correctExplanation: MOTHER_EXPLANATION,
    incorrectText: 'Revisa el video y vuelve a intentarlo.',
    onCorrect: function () { startFlightLeg2(); },
  });

  // --------------------------------------------------------------------
  // 15. Escena 5 — Video "video_serpersona.mp4" + reflexión final
  // --------------------------------------------------------------------
  var REFLEXION_VIDEO_SRC = encodeURI('../assets/video_serpersona.mp4');

  function startReflexionScene() {
    SceneManager.activate('scene-reflexion');
    var video = document.getElementById('reflexion-video');
    if (!video.getAttribute('src')) video.src = REFLEXION_VIDEO_SRC;
    var p = video.play();
    if (p && p.catch) p.catch(function () {});
  }

  document.getElementById('reflexion-next').addEventListener('click', function () {
    var video = document.getElementById('reflexion-video');
    try { video.pause(); } catch (e) {}
    startCloudsScene();
  });

  // --------------------------------------------------------------------
  // 15b. Escena 6 — Transición: "Avion_volando_sobre_nubes.mp4" (x2) +
  //      audio "capitan2.mp3" (~20s). Ambos medios corren en paralelo de
  //      forma independiente; solo se avanza a la Escena 7 cuando el
  //      audio Y el video (reproducido dos veces) han terminado.
  // --------------------------------------------------------------------
  var cloudsVideo = document.getElementById('clouds-video');
  var cloudsAudio = document.getElementById('clouds-audio');
  cloudsVideo.src = encodeURI('../assets/Avión_volando_sobre_nubes.mp4');
  // El video se reproduce sin sonido: el único audio de esta escena es el
  // del capitán (capitan2.mp3), reproducido por separado.
  cloudsVideo.muted = true;
  cloudsVideo.volume = 0;

  var cloudsVideoPlaysDone = 0;
  var cloudsAudioDone = false;
  var cloudsTransitionDone = false;

  function maybeFinishClouds() {
    if (cloudsTransitionDone) return;
    if (cloudsVideoPlaysDone >= 2 && cloudsAudioDone) {
      cloudsTransitionDone = true;
      startPeliculaScene();
    }
  }

  cloudsVideo.addEventListener('ended', function () {
    cloudsVideoPlaysDone++;
    if (cloudsVideoPlaysDone < 2) {
      try { cloudsVideo.currentTime = 0; } catch (e) {}
      playVideo(cloudsVideo);
    } else {
      maybeFinishClouds();
    }
  });

  cloudsAudio.addEventListener('ended', function () {
    cloudsAudioDone = true;
    maybeFinishClouds();
  });

  function startCloudsScene() {
    SceneManager.activate('scene-clouds');
    cloudsVideoPlaysDone = 0;
    cloudsAudioDone = false;
    cloudsTransitionDone = false;
    try { cloudsVideo.currentTime = 0; } catch (e) {}
    try { cloudsAudio.currentTime = 0; } catch (e) {}
    playVideo(cloudsVideo);
    var audioPromise = cloudsAudio.play();
    if (audioPromise && audioPromise.catch) audioPromise.catch(function () {});
  }

  // --------------------------------------------------------------------
  // 15c. Escena 7 — Video "pelicula.mp4" + pregunta (sin opciones,
  //      avanza al hacer click en "Siguiente").
  // --------------------------------------------------------------------
  var PELICULA_VIDEO_SRC = encodeURI('../assets/pelicula.mp4');

  function startPeliculaScene() {
    SceneManager.activate('scene-pelicula');
    var video = document.getElementById('pelicula-video');
    if (!video.getAttribute('src')) video.src = PELICULA_VIDEO_SRC;
    var p = video.play();
    if (p && p.catch) p.catch(function () {});
  }

  document.getElementById('pelicula-next').addEventListener('click', function () {
    var video = document.getElementById('pelicula-video');
    try { video.pause(); } catch (e) {}
    startFlightLeg3();
  });

  // --------------------------------------------------------------------
  // 15d. Tercer tramo de vuelo — Kenia -> Estados Unidos (misma lógica y
  //      temporización que los tramos anteriores).
  // --------------------------------------------------------------------
  function startFlightLeg3() {
    configureLeg(KENIA, ESTADOS_UNIDOS, startLeyendoScene);
    startFlightScene();
  }

  // --------------------------------------------------------------------
  // 15e. Escena 8 — Video "leyendo.mp4" a pantalla completa; al terminar
  //      avanza sola a la Escena 9 (e-book).
  // --------------------------------------------------------------------
  var leyendoVideo = document.getElementById('leyendo-video');
  leyendoVideo.src = encodeURI('../assets/leyendo.mp4');

  function startLeyendoScene() {
    SceneManager.activate('scene-leyendo');
    try { leyendoVideo.currentTime = 0; } catch (e) {}
    playVideo(leyendoVideo);
  }

  leyendoVideo.addEventListener('ended', function () {
    startEbookScene();
  });

  // --------------------------------------------------------------------
  // 15f. Escena 9 — E-book de dos páginas ("Manifestaciones de la
  //      persona" / "Identidad"), pantalla final de solo lectura.
  // --------------------------------------------------------------------
  function startEbookScene() {
    SceneManager.activate('scene-ebook');
    document.querySelectorAll('.ebook-page').forEach(function (p) {
      p.classList.toggle('active', p.getAttribute('data-page') === '1');
    });
  }

  document.querySelectorAll('.ebook-next-page, .ebook-prev-page').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var target = btn.getAttribute('data-goto');
      document.querySelectorAll('.ebook-page').forEach(function (p) {
        p.classList.toggle('active', p.getAttribute('data-page') === target);
      });
    });
  });

  // --------------------------------------------------------------------
  // 15g. Escenas 10-11 — Evaluaciones finales sobre la lectura y la
  //      biografía de Lopez Lomong. Se despliegan en secuencia al salir
  //      del e-book; reutilizan el mismo motor genérico de preguntas.
  // --------------------------------------------------------------------
  function startEval1Scene() {
    SceneManager.activate('scene-eval1');
  }

  function startEval2Scene() {
    SceneManager.activate('scene-eval2');
  }

  document.getElementById('ebook-next-scene').addEventListener('click', function () {
    startEval1Scene();
  });

  var EVAL1_EXPLANATION =
    'Para Ricardo Yepes, los actos auténticos emanan del fondo de la intimidad personal y exigen mantener la ' +
    'fidelidad o coherencia con los propios orígenes a lo largo del proyecto biográfico. Lopez Lomong encarna ' +
    'este ideal al no entender el atletismo como un fin egocéntrico, sino como una vocación que integra su ' +
    'historia de sufrimiento y gratitud. Al llegar a la cúspide deportiva y olímpica, utiliza su visibilidad ' +
    'pública para denunciar la crisis en Darfur, promover la educación y el agua potable en su país natal y ' +
    'representar a los niños vulnerables. De este modo, logra la unidad de vida de la que habla Yepes, uniendo ' +
    'su pasado en Sudán y Kakuma con su presente profesional en Estados Unidos.';

  setupQuiz({
    optionButtons: Array.prototype.slice.call(document.querySelectorAll('#eval1-options .quiz-option')),
    nextBtn: document.getElementById('eval1-next'),
    feedbackBox: document.getElementById('eval1-feedback'),
    feedbackTitle: document.getElementById('eval1-feedback-title'),
    feedbackText: document.getElementById('eval1-feedback-text'),
    correctExplanation: EVAL1_EXPLANATION,
    incorrectText: 'Vuelve a leer el fragmento y elige otra opción.',
    onCorrect: function () { startEval2Scene(); },
  });

  var EVAL2_EXPLANATION =
    'La antropología del texto Manifestaciones de la Persona plantea que la persona no existe en el ' +
    'aislamiento («no hay un yo si no hay un tú») y que la máxima realización personal se da en el acto de ' +
    'donación o entrega voluntaria hacia el prójimo. En la autobiografía de Lomong, este principio se ' +
    'manifiesta vívidamente cuando tres chicos mayores cautivos deciden proteger al pequeño Lopepe. Durante ' +
    'tres días de escape descalzos por la sabana, estos jóvenes no solo planearon la fuga, sino que ' +
    'compartieron su agua y comida, y lo cargaron físicamente sobre sus espaldas cuando sus fuerzas ' +
    'colapsaron, anteponiendo la vida del niño a su propia seguridad. Este acto heroico de donación mutua ' +
    'posibilitó la supervivencia y libertad de Lopez.';

  setupQuiz({
    optionButtons: Array.prototype.slice.call(document.querySelectorAll('#eval2-options .quiz-option')),
    nextBtn: document.getElementById('eval2-next'),
    feedbackBox: document.getElementById('eval2-feedback'),
    feedbackTitle: document.getElementById('eval2-feedback-title'),
    feedbackText: document.getElementById('eval2-feedback-text'),
    correctExplanation: EVAL2_EXPLANATION,
    incorrectText: 'Vuelve a leer el fragmento y elige otra opción.',
    onCorrect: function () { startLibertadVideoScene(); },
  });

  // --------------------------------------------------------------------
  // 15h. Escena 12 — Video "Libertad.mp4" a pantalla completa; al
  //      terminar avanza sola a la Escena 13 (contexto + pregunta). Se
  //      separaron en dos pantallas porque el video y el texto quedaban
  //      superpuestos al mostrarse juntos.
  // --------------------------------------------------------------------
  var libertadVideo = document.getElementById('libertad-video');
  libertadVideo.src = encodeURI('../assets/Libertad.mp4');

  function startLibertadVideoScene() {
    SceneManager.activate('scene-libertad-video');
    try { libertadVideo.currentTime = 0; } catch (e) {}
    playVideo(libertadVideo);
  }

  libertadVideo.addEventListener('ended', function () {
    startLibertadScene();
  });

  // --------------------------------------------------------------------
  // 15i. Escena 13 — Contexto y pregunta de reflexión sobre la Libertad
  //      (pantalla final, de solo lectura).
  // --------------------------------------------------------------------
  function startLibertadScene() {
    SceneManager.activate('scene-libertad');
  }

  // --------------------------------------------------------------------
  // 16. Pin de llegada animado (fin de la Escena 1, en cualquier tramo)
  // --------------------------------------------------------------------
  var arrivalPin = document.getElementById('arrival-pin');
  var arrivalTriggered = false;

  function triggerArrival() {
    var screen = worldToScreen(destMarker);
    // Se quita y se fuerza un reflow antes de volver a mostrarlo, para que
    // la animación se repita correctamente en el segundo tramo del vuelo.
    arrivalPin.classList.remove('show');
    void arrivalPin.offsetWidth;
    arrivalPin.style.left = screen.x + 'px';
    arrivalPin.style.top = screen.y + 'px';
    arrivalPin.classList.add('show');

    // La escena queda estática (avión y cámara ya no se mueven) exactamente
    // 2 segundos antes de abrir la siguiente pantalla.
    setTimeout(function () {
      if (currentLeg && currentLeg.onArrival) currentLeg.onArrival();
    }, 2000);
  }

  // --------------------------------------------------------------------
  // 17. Bucle de animación
  // --------------------------------------------------------------------
  var lastLabelUpdate = 0;
  var flightStartMs = null;

  function animate(nowMs) {
    requestAnimationFrame(animate);

    if (flightStartMs === null) flightStartMs = nowMs;
    var t = clamp((nowMs - flightStartMs) / (FLIGHT_ANIM_SECONDS * 1000), 0, 1);

    var pos = positionAt(t);
    var nextPos = positionAt(Math.min(t + 0.001, 1));
    plane.position.copy(pos);
    plane.up.copy(pos.clone().normalize());
    plane.lookAt(nextPos);

    var doneCount = Math.max(1, Math.floor(t * PATH_SEGMENTS));
    traveledLine.geometry.setDrawRange(0, doneCount + 1);
    remainingLine.geometry.setDrawRange(doneCount, PATH_SEGMENTS + 1 - doneCount);

    clouds.rotation.y += 0.00025;
    glowMaterial.uniforms.viewVector.value = camera.position.clone().sub(atmosphericGlow.position);

    var altM = altitudeMetersAt(t);
    var speed = speedKmhAt(t);
    var temp = exteriorTempAt(altM);
    var remainingHours = FLIGHT_DURATION_HOURS * (1 - t);

    if (el.progressFill) el.progressFill.style.width = (t * 100).toFixed(1) + '%';
    if (el.progressPct) el.progressPct.textContent = Math.round(t * 100) + '%';
    if (el.speed) el.speed.textContent = Math.round(speed).toLocaleString('es-CO');
    if (el.altitude) el.altitude.textContent = Math.round(altM).toLocaleString('es-CO');
    if (el.altitudeFt) el.altitudeFt.textContent = Math.round(altM * 3.28084).toLocaleString('es-CO');
    if (el.temp) el.temp.textContent = Math.round(temp);
    if (el.eta) el.eta.textContent = formatHM(remainingHours);

    // -- seguimiento "suave": solo se mueve el punto de mira (target) hacia
    //    el avión; la posición de la cámara la sigue calculando OrbitControls
    //    a partir de esa mira + la órbita/zoom que el usuario controla con el
    //    mouse, así que el usuario puede libremente moverse para ver el
    //    recorrido desde cualquier ángulo sin perder el seguimiento --
    if (followPlane) {
      var forwardDir = nextPos.clone().sub(pos);
      if (forwardDir.lengthSq() < 1e-10) forwardDir.set(0, 0, -1);
      forwardDir.normalize();
      var lookTarget = plane.position.clone().add(forwardDir.clone().multiplyScalar(0.02));
      controls.target.lerp(lookTarget, 0.06);
    }
    controls.update();

    scene.updateMatrixWorld(true);

    if (nowMs - lastLabelUpdate > 33) {
      updateLabels();
      lastLabelUpdate = nowMs;
    }

    renderer.render(scene, camera);

    if (t >= 1 && !arrivalTriggered) {
      arrivalTriggered = true;
      triggerArrival();
    }
  }

  // --------------------------------------------------------------------
  // 18. Resize
  // --------------------------------------------------------------------
  window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // --------------------------------------------------------------------
  // 19. Arranque de la Escena 1 (vuelo) y del segundo tramo
  // --------------------------------------------------------------------
  var animateStarted = false;

  function startFlightScene() {
    SceneManager.activate('scene-flight');
    hideLoadingScreen();
    flightStartMs = null;
    arrivalTriggered = false;
    if (!animateStarted) {
      animateStarted = true;
      requestAnimationFrame(animate);
    }
  }

  function startFlightLeg2() {
    configureLeg(SUDAN_DEL_SUR, KENIA, startReflexionScene);
    startFlightScene();
  }

  // --------------------------------------------------------------------
  // 20. Escena 0 — Sala de espera + audio del capitán
  //     El audio suena completo, sin cortes; a los 49s exactos se muestra
  //     (en simultáneo con el audio, que sigue de fondo) el despegue.
  // --------------------------------------------------------------------
  var startBtn = document.getElementById('start-btn');
  var captainAudio = document.getElementById('captain-audio');
  var TRANSITION_AT_SECONDS = 49;
  var waitingTransitionTriggered = false;

  function goToTakeoff() {
    if (waitingTransitionTriggered) return;
    waitingTransitionTriggered = true;
    startTakeoffScene(); // el audio NO se pausa: sigue sonando de fondo
  }

  startBtn.addEventListener('click', function () {
    startBtn.classList.add('fade-out');
    captainAudio.currentTime = 0;
    captainAudio.volume = 1;
    var playPromise = captainAudio.play();
    if (playPromise && playPromise.catch) {
      playPromise.catch(function () { /* audio bloqueado: el respaldo por reloj sigue la secuencia */ });
    }

    captainAudio.addEventListener('timeupdate', function onTimeUpdate() {
      if (captainAudio.currentTime >= TRANSITION_AT_SECONDS) {
        captainAudio.removeEventListener('timeupdate', onTimeUpdate);
        goToTakeoff();
      }
    });

    setTimeout(goToTakeoff, TRANSITION_AT_SECONDS * 1000);
  });

  // --------------------------------------------------------------------
  // 21. Escena de despegue — apuntodespegar.mp4 -> despegando.mp4, en
  //     continuo (el segundo video ya está precargado antes de que
  //     termine el primero, para un corte sin parpadeo).
  // --------------------------------------------------------------------
  var takeoffVideo1 = document.getElementById('takeoff-video-1');
  var takeoffVideo2 = document.getElementById('takeoff-video-2');
  takeoffVideo1.src = encodeURI('../assets/apuntodespegar.mp4');
  takeoffVideo2.src = encodeURI('../assets/despegando.mp4');

  function playVideo(videoEl) {
    var p = videoEl.play();
    if (p && p.catch) p.catch(function () {});
  }

  function startTakeoffScene() {
    SceneManager.activate('scene-takeoff');
    takeoffVideo1.classList.remove('hidden-video');
    takeoffVideo2.classList.add('hidden-video');
    try { takeoffVideo1.currentTime = 0; } catch (e) {}
    playVideo(takeoffVideo1);
  }

  takeoffVideo1.addEventListener('ended', function () {
    takeoffVideo1.classList.add('hidden-video');
    takeoffVideo2.classList.remove('hidden-video');
    try { takeoffVideo2.currentTime = 0; } catch (e) {}
    playVideo(takeoffVideo2);
  });

  takeoffVideo2.addEventListener('ended', function () {
    startFlightScene();
  });

  // --------------------------------------------------------------------
  // 22. Deja lista la ruta del primer tramo (Bogotá -> Sudán del Sur) para
  //     que la Escena 1 tenga todo listo apenas termine el despegue.
  // --------------------------------------------------------------------
  configureLeg(BOGOTA, SUDAN_DEL_SUR, startArrivalScene);
})();
