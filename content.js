/* ============================================================================
   Correr para Vivir — CONTENIDO
   ----------------------------------------------------------------------------
   Todo el texto, los datos de las actividades y el orden del recorrido viven
   aquí. El motor (script.js) lee CONTENT.flow y construye cada pantalla.
   Cada paso tiene un "id" estable (se usa para guardar el progreso).
============================================================================ */
(function () {
  'use strict';

  var A = function (file) { return encodeURI('assets/' + file); };

  // ------------------------------------------------------------------
  // Ciudades de las rutas de vuelo
  // ------------------------------------------------------------------
  var CITIES = {
    BOGOTA: { name: 'Bogotá', code: 'BOG', lat: 4.711, lon: -74.0721, tz: 'America/Bogota' },
    SUDAN: { name: 'Sudán del Sur', code: 'SSD', lat: 4.8517, lon: 31.5825, tz: 'Africa/Juba' },
    KENIA: { name: 'Kenia', code: 'KEN', lat: -1.2921, lon: 36.8219, tz: 'Africa/Nairobi' },
    USA: { name: 'Estados Unidos', code: 'USA', lat: 38.9072, lon: -77.0369, tz: 'America/New_York' },
  };

  // ------------------------------------------------------------------
  // Capítulos (menú y barra superior)
  // ------------------------------------------------------------------
  var CHAPTERS = [
    { id: 'prologo', title: 'Prólogo · El despegue', short: 'Prólogo' },
    { id: 'sudan', title: 'Capítulo 1 · Sudán del Sur', short: 'Sudán del Sur' },
    { id: 'kenia', title: 'Capítulo 2 · Kenia', short: 'Kenia' },
    { id: 'usa', title: 'Capítulo 3 · Estados Unidos', short: 'Estados Unidos' },
    { id: 'autoestima', title: 'Sección 1 · Autoestima', short: 'Autoestima' },
    { id: 'personalidad', title: 'Sección 2 · Personalidad', short: 'Personalidad' },
    { id: 'amistad', title: 'Sección 3 · Amistad', short: 'Amistad' },
    { id: 'familia', title: 'Sección 4 · Familia', short: 'Familia' },
    { id: 'redes', title: 'Sección 5 · Redes sociales', short: 'Redes sociales' },
    { id: 'final', title: 'Final del viaje', short: 'Final' },
  ];

  var WRONG = 'Revisa el video y vuelve a intentarlo.';
  var WRONG_READ = 'Vuelve a leer la información y elige otra opción.';

  // ------------------------------------------------------------------
  // Recorrido completo
  // ------------------------------------------------------------------
  var flow = [
    // ============================ PRÓLOGO ============================
    {
      id: 'intro', type: 'intro', chapter: 'prologo', skipOnBack: true,
      bg: A('salaespera.jpg'),
      audio: A('Audio_capitan.mp3'),
      transitionAt: 49,
      title: 'Correr para Vivir',
      subtitle: 'Un viaje por la historia de Lopez Lomong y por lo que nos hace personas',
      caption: 'Mensaje del capitán',
    },
    {
      id: 'takeoff', type: 'takeoff', chapter: 'prologo', skipOnBack: true,
      videos: [A('apuntodespegar.mp4'), A('despegando.mp4')],
    },
    {
      id: 'flight-1', type: 'flight', chapter: 'prologo', skipOnBack: true,
      from: 'BOGOTA', to: 'SUDAN', flightCode: 'AV045',
    },

    // ============================ SUDÁN DEL SUR ============================
    {
      id: 'arrival', type: 'dialogue', chapter: 'sudan',
      bg: A('aeropuerto_sudan.jpg'),
      character: A('lopezlomong.png'),
      name: 'López Lomong',
      text: 'Hola amigo, bienvenido a mi país natal Sudán del Sur, te contaré un poco sobre mi historia',
    },
    {
      id: 'quiz-1', type: 'videoQuiz', chapter: 'sudan',
      video: A('Correr para vivir (primera parte).mp4'),
      kicker: 'Correr para Vivir — Parte 1',
      question: '¿Qué suceso desencadena la historia de Lopepe (López Lomong) al comienzo del libro <em>Correr para vivir</em>?',
      options: [
        { letter: 'A', text: 'Fue seleccionado por un reclutador internacional para entrenar como atleta profesional en Kenia.' },
        { letter: 'B', text: 'Fue secuestrado a los seis años por soldados rebeldes durante una misa dominical en su aldea natal de Kimotong.', correct: true },
        { letter: 'C', text: 'Emigró voluntariamente junto a sus padres y hermanos hacia un campo de refugiados en busca de alimentos.' },
        { letter: 'D', text: 'Ganó un concurso escolar de redacción que le permitió viajar a Estados Unidos.' },
      ],
      explanation: 'A la edad de seis años, mientras asistía a la iglesia de su aldea en Sudán, unos soldados rebeldes irrumpieron en la misa y lo secuestraron en la caja de un camión militar junto con otros niños para convertirlos en niños soldado. Este hecho trágico inició su cautiverio en un campamento rebelde del que posteriormente lograría escapar con la ayuda de tres jóvenes mayores.',
      wrong: WRONG,
    },
    {
      id: 'quiz-2', type: 'videoQuiz', chapter: 'sudan',
      video: A('correrparavivir2.mp4'),
      kicker: 'Correr para Vivir — Parte 2',
      question: '¿López Lomong se da cuenta de que su madre biológica seguía con vida?',
      options: [
        { letter: 'V', text: 'Verdadero', correct: true },
        { letter: 'F', text: 'Falso' },
      ],
      explanation: 'A principios del verano de 2003, mientras Lopez estaba en el jardín de su casa en Nueva York, recibió la llamada de su amigo Simon desde el campo de refugiados de Kakuma. Simon le contó que su madre biológica había estado en el campo preguntando por él al escuchar rumores de que seguía vivo en América. Al enterarse y recibir el número telefónico, su madre adoptiva americana le animó a llamar de inmediato. Tras doce años sin escucharse (desde que fue secuestrado a los seis años), su madre respondió al teléfono reconociendo su nombre natal («¿Lopepe?») y rompió a llorar al confirmar que su hijo estaba vivo.',
      wrong: WRONG,
    },
    {
      id: 'ws-lopez', type: 'wordsearch', chapter: 'sudan',
      kicker: 'Minijuego · Sopa de letras',
      title: 'La historia de Lopez',
      intro: 'Encuentra las 10 palabras clave de lo que acabas de ver. Arrastra sobre las letras (o toca la primera y la última).',
      words: ['KIMOTONG', 'SECUESTRO', 'SOLDADOS', 'IGLESIA', 'CAMION', 'KAKUMA', 'SIMON', 'MADRE', 'LOPEPE', 'ESCAPE'],
    },
    {
      id: 'flight-2', type: 'flight', chapter: 'kenia', skipOnBack: true,
      from: 'SUDAN', to: 'KENIA', flightCode: 'AV046',
    },

    // ============================ KENIA ============================
    {
      id: 'gardner', type: 'videoText', chapter: 'kenia',
      video: A('video_serpersona.mp4'),
      kicker: 'Para reflexionar',
      html:
        '<p class="r-context">En esta entrevista, Howard Gardner sostiene categóricamente que <strong>«una mala persona no llega nunca a ser un buen profesional»</strong>. Tras sus investigaciones en el Goodwork Project de la Universidad de Harvard, concluye que los mejores profesionales son siempre aquellos que combinan tres factores (ECE): son <strong>Excelentes</strong> en su desempeño, están <strong>Comprometidos</strong> con su trabajo y actúan de forma <strong>Ética</strong>.</p>' +
        '<p class="r-context">Para Gardner, una persona sin principios éticos o guiada únicamente por el ego, la avaricia o el beneficio personal puede llegar a tener pericia técnica o acumular riqueza, pero nunca alcanzará la excelencia verdadera. Esto se debe a que la excelencia exige trascender las necesidades propias para servir a un propósito más amplio que beneficie a la comunidad. Sin embargo, el propio autor advierte con preocupación que muchos estudiantes ven la ética como algo secundario al inicio de sus carreras, creyendo que para triunfar primero necesitan dar "codazos".</p>' +
        '<p class="r-question">¿Hasta qué punto consideras que la ética y el compromiso con los demás son indispensables para alcanzar la verdadera excelencia en tu vida laboral, o crees —como piensan muchos jóvenes según Gardner— que la ética es un "lujo" que solo se puede uno permitir tras haber alcanzado el éxito?</p>',
    },
    {
      id: 'cw-gardner', type: 'crossword', chapter: 'kenia',
      kicker: 'Minijuego · Crucigrama',
      title: 'Gardner y el buen trabajo',
      intro: 'Completa el crucigrama con las ideas de la entrevista. Toca una pista o una casilla y escribe.',
      entries: [
        { answer: 'PROFESIONAL', clue: '«Una mala persona no llega nunca a ser un buen…»' },
        { answer: 'COMPROMETIDO', clue: 'Factor ECE: estar … con el propio trabajo.' },
        { answer: 'EXCELENTE', clue: 'Factor ECE: ser … en el desempeño.' },
        { answer: 'ETICA', clue: 'Factor ECE: actuar de forma…' },
        { answer: 'HARVARD', clue: 'Universidad donde se desarrolló el Goodwork Project.' },
        { answer: 'GARDNER', clue: 'Apellido del psicólogo entrevistado.' },
        { answer: 'CODAZOS', clue: 'Lo que muchos estudiantes creen que deben dar para triunfar.' },
        { answer: 'AVARICIA', clue: 'Junto al ego y el beneficio personal, aleja de la excelencia verdadera.' },
      ],
    },
    {
      id: 'clouds', type: 'cinematic', chapter: 'kenia', skipOnBack: true,
      video: A('Avión_volando_sobre_nubes.mp4'),
      videoMuted: true,
      loops: 2,
      audio: A('capitan2.mp3'),
      caption: 'Mensaje del capitán',
    },
    {
      id: 'pelicula', type: 'videoText', chapter: 'kenia',
      video: A('pelicula.mp4'),
      videoSide: 'right',
      html: '<p class="r-question">¿Te acuerdas de esta película en tu clase de Core 1? ¿Qué puedes rescatar de esta película que te haya servido a lo largo de todos estos años, ahora que te encuentras en Core 5?</p>',
    },
    {
      id: 'flight-3', type: 'flight', chapter: 'usa', skipOnBack: true,
      from: 'KENIA', to: 'USA', flightCode: 'AV047',
    },

    // ============================ ESTADOS UNIDOS ============================
    {
      id: 'leyendo', type: 'cinematic', chapter: 'usa', skipOnBack: true,
      video: A('leyendo.mp4'),
      loops: 1,
    },
    {
      id: 'ebook', type: 'ebook', chapter: 'usa',
      pages: [
        {
          title: 'Manifestaciones de la persona',
          paragraphs: [
            'La noción de persona humana constituye el núcleo de la antropología y el fundamento de la dignidad e inviolabilidad de cada individuo. Su característica definatoria es la intimidad, un mundo interior inmaterial y creador que contiene pensamientos e ideas inéditas. Esta dimensión íntima le otorga a la persona una identidad única, irremplazable e irrepetible, reconocida a través de un nombre propio.',
            'Esa interioridad no permanece estática, sino que se exterioriza necesariamente mediante el cuerpo y el lenguaje. El cuerpo —manifestado especialmente en el rostro, los gestos y la vestimenta protegida por el pudor— es la condición de posibilidad para mostrar la intimidad al mundo. Por su parte, la palabra permite comunicar los pensamientos y hacerlos públicos para entrar en relación con otros.',
            'Por último, la persona alcanza su plenitud en la intersubjetividad y el diálogo, ya que posee una naturaleza comunitaria y no puede existir en el aislamiento («no hay un yo si no hay un tú»). Esta apertura a los demás se despliega a través de la libertad —como dominio sobre los propios actos— y la capacidad de donación o amor, mediante la cual la persona entrega voluntariamente algo de su propia intimidad a sus semejantes.',
          ],
        },
        {
          title: 'Identidad',
          paragraphs: [
            'La identidad personal y la autenticidad no son propiedades estáticas otorgadas a priori, sino el resultado dinámico del despliegue de la libertad a lo largo de la biografía de cada individuo. En su sentido genuino, lo auténtico representa la correspondencia verdadera entre la conducta exterior y el fondo inalienable de la intimidad personal. Asimismo, esta identidad posee una dimensión dialógica, puesto que requiere del reconocimiento de los demás para constituirse plenamente y evitar distorsiones como el autoengaño, la alienación o la inautenticidad.',
            'Como desarrollo de esta tesis, la autenticidad exige un refrendo personal de la acción, lo que implica que las decisiones no broten de condicionamientos externos o modas miméticas, sino que sean asumidas voluntariamente desde el núcleo de valores de la persona. Frente al individualismo moderno que reduce la libertad a la simple elección espontánea o al consumo, la existencia auténtica se configura como una virtud e ideal moral (kalokagathía), caracterizada por la coherencia interior, la madurez y la intensidad vital.',
            'Finalmente, el texto plantea que el factor máximamente personalizador de la vida es la vocación, entendida como el descubrimiento de un proyecto biográfico global e irremplazable. Lejos de ser una invención puramente egoísta, la vocación se experimenta como una llamada o don recibido que responde a la pregunta de quién se es, otorgando un «para qué» fundamental y logrando la unidad de vida a través de la fidelidad entre el origen, el presente y el destino.',
          ],
        },
      ],
    },
    {
      id: 'eval-1', type: 'quiz', chapter: 'usa',
      kicker: 'Evaluación 1 · Autenticidad y Trayectoria',
      question: 'En <em>Identidad</em>, Ricardo Yepes afirma que la auténtica identidad personal no surge de la mera espontaneidad o la búsqueda de éxito superficial, sino de la fidelidad a los propios orígenes y del descubrimiento de una vocación que da unidad y sentido al proyecto vital. ¿Cómo se refleja esta noción de la autenticidad en la trayectoria de Lopez Lomong cuando se convierte en atleta profesional en Estados Unidos?',
      options: [
        { letter: 'A', text: 'Lopez concibe el atletismo de manera puramente mercantil, buscando la fama y la riqueza personal para desvincularse por completo de su doloroso pasado en Sudán.' },
        { letter: 'B', text: 'Lopez asume el correr no solo como un deporte, sino como una vocación y plataforma para dar voz a los "niños perdidos", ayudar a su pueblo en Sudán del Sur y mantener la coherencia con sus raíces.', correct: true },
        { letter: 'C', text: 'Lopez decide abandonar la competición profesional porque considera que el éxito deportivo occidental entra en conflicto insalvable con su identidad africana.' },
        { letter: 'D', text: 'Lopez utiliza el deporte como un medio de evasión individualista, argumentando que la libertad consiste únicamente en elegir sin compromisos comunitarios ni morales.' },
      ],
      explanation: 'Para Ricardo Yepes, los actos auténticos emanan del fondo de la intimidad personal y exigen mantener la fidelidad o coherencia con los propios orígenes a lo largo del proyecto biográfico. Lopez Lomong encarna este ideal al no entender el atletismo como un fin egocéntrico, sino como una vocación que integra su historia de sufrimiento y gratitud. Al llegar a la cúspide deportiva y olímpica, utiliza su visibilidad pública para denunciar la crisis en Darfur, promover la educación y el agua potable en su país natal y representar a los niños vulnerables. De este modo, logra la unidad de vida de la que habla Yepes, uniendo su pasado en Sudán y Kakuma con su presente profesional en Estados Unidos.',
      wrong: 'Vuelve a leer el fragmento y elige otra opción.',
    },
    {
      id: 'eval-2', type: 'quiz', chapter: 'usa',
      kicker: 'Evaluación 2 · Intersubjetividad y Donación',
      question: 'El texto <em>Manifestaciones de la Persona</em> sostiene que el ser humano es un ser esencialmente comunitario que alcanza su plenitud a través de la intersubjetividad, el diálogo y la donación de sí mismo (el amor como entrega de la propia intimidad al otro). ¿Qué suceso crucial de la infancia de Lopez en <em>Correr para vivir</em> ejemplifica de manera más clara esta dimensión de donación y protección interpersonal?',
      options: [
        { letter: 'A', text: 'El tiempo en que permaneció en soledad dentro del barracón militar reflexionando sobre su propio destino.' },
        { letter: 'B', text: 'El momento en que observó por primera vez una transmisión de televisión en una granja cercana al campo de Kakuma.' },
        { letter: 'C', text: 'La acción desinteresada de los "tres ángeles" (jóvenes mayores) que arriesgaron sus vidas, compartieron sus escasos recursos y lo cargaron a sus espaldas para salvarlo durante la huida del campamento rebelde.', correct: true },
        { letter: 'D', text: 'El trayecto individual en avión que realizó desde Nairobi hasta Nueva York al ser adoptado por la familia Rogers.' },
      ],
      explanation: 'La antropología del texto Manifestaciones de la Persona plantea que la persona no existe en el aislamiento («no hay un yo si no hay un tú») y que la máxima realización personal se da en el acto de donación o entrega voluntaria hacia el prójimo. En la autobiografía de Lomong, este principio se manifiesta vívidamente cuando tres chicos mayores cautivos deciden proteger al pequeño Lopepe. Durante tres días de escape descalzos por la sabana, estos jóvenes no solo planearon la fuga, sino que compartieron su agua y comida, y lo cargaron físicamente sobre sus espaldas cuando sus fuerzas colapsaron, anteponiendo la vida del niño a su propia seguridad. Este acto heroico de donación mutua posibilitó la supervivencia y libertad de Lopez.',
      wrong: 'Vuelve a leer el fragmento y elige otra opción.',
    },
    {
      id: 'libertad-video', type: 'cinematic', chapter: 'usa', skipOnBack: true,
      video: A('Libertad.mp4'),
      loops: 1,
    },
    {
      id: 'libertad', type: 'text', chapter: 'usa',
      kicker: 'Para reflexionar',
      html:
        '<p class="r-context">Libertad constitutiva o interior: Es el nivel más profundo de la persona; un centro de intimidad y dignidad inviolable que nadie puede arrebatar, ni siquiera en situaciones de cautiverio o coerción externa. Esta dimensión parte de la «síntesis pasiva» —es decir, las circunstancias que no elegimos, como nuestro cuerpo, familia o momento histórico—, las cuales no son un límite que nos anula, sino el punto de partida real desde el cual actuamos.</p>' +
        '<ul class="r-list">' +
        '<li><strong>Libertad de elección o arbitrio:</strong> La capacidad de autodeterminarse y seleccionar entre diferentes opciones. El autor advierte sobre el riesgo de confundir la libertad con la mera espontaneidad caprichosa o con el consumo superficial.</li>' +
        '<li><strong>Libertad moral (crecimiento):</strong> Se fortalece mediante la práctica de virtudes (como la fortaleza, la prudencia y la justicia), las cuales amplían la capacidad operativa de la persona. Elegir lo que degrada o perjudica acaba debilita la voluntad y reduce la capacidad de actuar libremente.</li>' +
        '<li><strong>Realización y proyecto vital:</strong> La libertad adquiere su verdadero valor cuando se encauza hacia metas e ideales altos (magnanimidad) que configuran la propia historia, en lugar de agotarse en elecciones triviales o intrascendentes.</li>' +
        '</ul>' +
        '<p class="r-question">Pensando en tu propia vida, ¿en qué medida tus decisiones cotidianas responden a un proyecto vital que fortalece tu carácter y amplía tu libertad, o sientes que con frecuencia tu libertad se diluye en la simple reacción a impulsos del momento o a elecciones triviales que te impone el entorno?</p>',
    },
    {
      id: 'ws-libertad', type: 'wordsearch', chapter: 'usa',
      kicker: 'Minijuego · Sopa de letras',
      title: 'Las dimensiones de la libertad',
      intro: 'Encuentra las 10 palabras relacionadas con la libertad.',
      words: ['ARBITRIO', 'VIRTUDES', 'FORTALEZA', 'PRUDENCIA', 'JUSTICIA', 'MAGNANIMIDAD', 'DIGNIDAD', 'PROYECTO', 'ELECCION', 'VOLUNTAD'],
    },

    // ============================ SECCIÓN 1 · AUTOESTIMA ============================
    {
      id: 'auto-intro', type: 'section', chapter: 'autoestima',
      number: '01', title: 'Autoestima',
      tagline: 'Cómo te valoras y cómo enfrentas los retos de la vida',
      quote: 'La autoestima es dinámica y siempre implica la oportunidad de mejora.',
      quoteAuthor: 'Viviana L. Aya G.',
      sources: 'C. Mruk, «Auto-estima: investigación, teoría y práctica» · V. L. Aya G., «Tipos de autoestima: qué hacer para fortalecerla»',
      steps: ['Lectura breve (2 páginas)', 'Crucigrama', 'Preguntas de selección múltiple', 'Preguntas de reflexión'],
    },
    {
      id: 'auto-info-1', type: 'info', chapter: 'autoestima', page: '1 / 2',
      kicker: 'Autoestima · Lectura 1 de 2',
      title: '¿Qué es la autoestima?',
      lead: 'Para el psicólogo Christopher Mruk, la autoestima es <strong>el estatus vital de la competencia y el merecimiento</strong> de una persona al manejar los retos de la vida a lo largo del tiempo.',
      blocks: [
        { type: 'pair', items: [
          { icon: 'target', title: 'Competencia', text: 'Es la parte <strong>que se ve</strong>: lo que haces y cómo te resulta. Responde a la pregunta <em>«¿qué tan bueno(a) soy para…?»</em>' },
          { icon: 'heart', title: 'Merecimiento', text: 'Es el <strong>valor que te das como persona</strong>, más allá de tus acciones. Responde a <em>«¿qué tan valioso(a) me considero?»</em>' },
        ] },
        { type: 'callout', icon: 'spark', text: 'La autoestima aparece cuando ambas se juntan: <strong>ser competente en algo que vale la pena</strong>. Ser muy eficaz haciendo algo malo no genera autoestima; sentirse valioso sin esforzarse tampoco basta.' },
        { type: 'cards', items: [
          { icon: 'brain', title: 'Se piensa…', text: 'Plano <strong>cognitivo</strong>: el juicio que hago sobre mí.' },
          { icon: 'pulse', title: '…y se siente', text: 'Plano <strong>afectivo</strong>: lo que siento sobre mí; me motiva o me frena.' },
          { icon: 'wave', title: 'Es dinámica', text: 'Es <strong>relativamente estable, pero abierta al cambio</strong>: un logro la eleva, un error la sacude, y siempre se puede fortalecer.' },
        ] },
      ],
    },
    {
      id: 'auto-info-2', type: 'info', chapter: 'autoestima', page: '2 / 2',
      kicker: 'Autoestima · Lectura 2 de 2',
      title: 'Los 4 tipos de autoestima y cómo fortalecerla',
      lead: 'Combinando los niveles de competencia y merecimiento aparecen cuatro tipos. Para cada uno, la educación de una <strong>virtud</strong> (un hábito bueno) ayuda a crecer.',
      blocks: [
        { type: 'types', items: [
          { name: 'Alta', comp: 'Alta', mer: 'Alto', virtue: 'Generosidad', text: 'Se sabe valiosa y es competente. Crece aún más al <strong>dar y darse</strong>: poner sus talentos al servicio de los demás.' },
          { name: 'Baja', comp: 'Baja', mer: 'Bajo', virtue: 'Fortaleza', text: 'No se siente valiosa ni competente. La fortaleza —<strong>resistir y acometer</strong>— le ayuda a superar con valentía las dificultades.' },
          { name: 'Narcisista', comp: 'Baja', mer: 'Alto', virtue: 'Humildad', text: 'Se cree muy valiosa aunque no sea competente. La humildad le permite <strong>reconocer fortalezas y debilidades</strong> sin buscar el aplauso ajeno.' },
          { name: 'Pseudo', comp: 'Alta', mer: 'Bajo', virtue: 'Optimismo', text: 'Es competente pero no se siente valiosa. El optimismo le ayuda a <strong>confiar en sus posibilidades</strong> y ver las dificultades como oportunidades.' },
        ] },
        { type: 'callout', icon: 'key', text: 'La clave: <strong>la educación de las virtudes humanas</strong> (hábitos operativos buenos) permite el desarrollo armónico de la persona y es el camino para fortalecer la autoestima, que siempre puede mejorar.' },
      ],
    },
    {
      id: 'auto-cw', type: 'crossword', chapter: 'autoestima',
      kicker: 'Autoestima · Crucigrama',
      title: 'Competencia, merecimiento y virtudes',
      intro: 'Completa el crucigrama con lo que aprendiste.',
      entries: [
        { answer: 'MERECIMIENTO', clue: 'Valor que la persona se adjudica como ser humano.' },
        { answer: 'COMPETENCIA', clue: 'Componente conductual y observable de la autoestima.' },
        { answer: 'GENEROSIDAD', clue: 'Virtud que implica «dar y darse»; recomendada para la autoestima alta.' },
        { answer: 'FORTALEZA', clue: 'Virtud que implica resistir y acometer; ayuda a la autoestima baja.' },
        { answer: 'OPTIMISMO', clue: 'Virtud para la autoestima pseudo: confiar en las propias posibilidades.' },
        { answer: 'HUMILDAD', clue: 'Virtud para la autoestima narcisista.' },
        { answer: 'DINAMICA', clue: 'La autoestima no es estática: es…' },
        { answer: 'MRUK', clue: 'Apellido del teórico que propone la competencia y el merecimiento.' },
      ],
    },
    {
      id: 'auto-mcq', type: 'mcq', chapter: 'autoestima',
      kicker: 'Autoestima · Selección múltiple',
      title: 'Pon a prueba lo aprendido',
      questions: [
        {
          q: 'Según Mruk, ¿cuáles son los dos componentes básicos de la autoestima?',
          options: ['La inteligencia y la apariencia física', 'La competencia y el merecimiento', 'La fama y la aprobación de los demás', 'La memoria y la voluntad'],
          correct: 1,
          explanation: 'La competencia (lo que hago y cómo me resulta) y el merecimiento (el valor que me doy como persona). La autoestima surge cuando ambos se combinan.',
        },
        {
          q: 'Una persona muy competente en sus tareas, pero que no se considera valiosa como persona, tiene autoestima…',
          options: ['Alta', 'Narcisista', 'Pseudo', 'Baja'],
          correct: 2,
          explanation: 'La autoestima pseudo combina competencia alta y merecimiento bajo. Se fortalece con la virtud del optimismo.',
        },
        {
          q: '¿Qué virtud se recomienda para la autoestima narcisista (merecimiento alto, competencia baja)?',
          options: ['La humildad', 'El optimismo', 'La generosidad', 'La fortaleza'],
          correct: 0,
          explanation: 'La humildad permite reconocer las propias fortalezas y debilidades y aprovechar las capacidades sin buscar el aplauso ajeno.',
        },
        {
          q: '¿Por qué se dice que la autoestima es dinámica?',
          options: ['Porque nunca cambia después de la infancia', 'Porque depende únicamente de lo que opinan los demás', 'Porque es relativamente estable, pero está abierta al cambio y siempre se puede mejorar', 'Porque solo existe cuando ganamos algo importante'],
          correct: 2,
          explanation: 'Es estable y abierta a la vez: fluctúa con las experiencias y puede fortalecerse con el trabajo personal y las virtudes.',
        },
      ],
      wrong: WRONG_READ,
    },
    {
      id: 'auto-refl', type: 'reflection', chapter: 'autoestima',
      kicker: 'Autoestima · Reflexión',
      title: 'Mírate con honestidad',
      intro: 'No hay respuestas correctas o incorrectas. Si quieres, escribe tus ideas: se guardan en este dispositivo y podrás descargarlas al final.',
      questions: [
        '¿En qué área de tu vida te sientes más competente y en cuál te cuesta más sentirte valioso(a)? ¿Por qué crees que ocurre?',
        '¿Cuál de los cuatro tipos de autoestima predomina hoy en ti? ¿Qué virtud concreta podrías practicar esta semana para fortalecerla?',
        'Piensa en un reto reciente: ¿cómo influyó en lo que piensas y sientes sobre ti mismo(a)?',
      ],
    },

    // ============================ SECCIÓN 2 · PERSONALIDAD ============================
    {
      id: 'pers-intro', type: 'section', chapter: 'personalidad',
      number: '02', title: 'Personalidad',
      tagline: 'El sello propio de cada persona y el arte de llegar a ser equilibrado',
      quote: 'La personalidad es como una orquesta… la persona es el director.',
      quoteAuthor: 'Enrique Rojas',
      sources: 'E. Rojas, «La personalidad y su génesis» · E. Rojas, «La persona equilibrada»',
      steps: ['Lectura breve (2 páginas)', 'Sopa de letras', 'Preguntas de selección múltiple', 'Preguntas de reflexión'],
    },
    {
      id: 'pers-info-1', type: 'info', chapter: 'personalidad', page: '1 / 2',
      kicker: 'Personalidad · Lectura 1 de 2',
      title: '¿Qué es la personalidad?',
      lead: 'Es la <strong>forma de ser</strong> de cada uno: un conjunto de elementos físicos, psicológicos, sociales y culturales que se integran en un estilo propio de <strong>pensar, sentir, reaccionar, interpretar y actuar</strong>.',
      blocks: [
        { type: 'roots', title: 'Tres raíces', items: [
          { icon: 'dna', title: 'Herencia', text: 'Lo que traemos al nacer.' },
          { icon: 'home', title: 'Ambiente', text: 'Lo que recibimos de nuestro entorno.' },
          { icon: 'path', title: 'Experiencia', text: 'Lo que vamos viviendo en nuestra propia trayectoria.' },
        ] },
        { type: 'cards', items: [
          { icon: 'dna', title: 'Temperamento', text: 'La parte <strong>heredada</strong>, con raíz neurobiológica.' },
          { icon: 'hammer', title: 'Carácter', text: 'La parte <strong>adquirida</strong>, forjada por la vida, la educación y la cultura.' },
          { icon: 'anchor', title: 'Rasgo', text: 'Una tendencia <strong>estable</strong>: comportarse igual en situaciones distintas (por ejemplo, ser ordenado).' },
          { icon: 'cloud', title: 'Estado', text: 'Algo <strong>pasajero</strong>: enojarse por un hecho concreto no es lo mismo que ser irascible.' },
        ] },
        { type: 'callout', icon: 'music', text: '<strong>Una orquesta:</strong> cada rasgo es un instrumento; la persona es el director que los armoniza en una sinfonía con sello propio. La palabra <em>persona</em> nombraba la máscara del actor, y aún hoy la cara es «el espejo del alma». La personalidad no es estática: está siempre en movimiento.' },
      ],
    },
    {
      id: 'pers-info-2', type: 'info', chapter: 'personalidad', page: '2 / 2',
      kicker: 'Personalidad · Lectura 2 de 2',
      title: 'La persona equilibrada: 10 claves',
      lead: 'Para Rojas, llegar a ser una persona equilibrada es una <strong>tarea de artesanía psicológica</strong>. El equilibrio no es un punto fijo: se va conquistando poco a poco.',
      blocks: [
        { type: 'decalogue', items: [
          { title: 'Conocerse a sí mismo', text: 'Saber tus aptitudes y tus limitaciones.' },
          { title: 'Corazón y cabeza', text: 'Equilibrar sentimientos y razones.' },
          { title: 'Superar las heridas', text: 'Vivir el presente, asumir el pasado y abrirse al futuro.' },
          { title: 'Proyecto de vida', text: 'Coherente y realista: amor, trabajo y cultura.' },
          { title: 'Voluntad sólida', text: 'Orden, constancia, motivación y disciplina.' },
          { title: 'Gobierno de uno mismo', text: 'Juicio sereno; no convertir un problema en un drama.' },
          { title: 'Modelos positivos', text: 'Crecer mirando personas coherentes que inspiran.' },
          { title: 'Saber convivir', text: 'Tolerancia, respeto y no llevar cuentas de fallos.' },
          { title: 'Sentido de la vida', text: 'Dirección, contenido y coherencia.' },
          { title: 'Salud física', text: 'Una base física básicamente positiva.' },
        ] },
        { type: 'callout', icon: 'balance', text: 'Una <strong>personalidad sana</strong> logra un buen equilibrio entre sus componentes, una madurez acorde a la edad, conocimiento y aceptación de sí, un proyecto de vida y una conducta coherente con metas realistas.' },
      ],
    },
    {
      id: 'pers-ws', type: 'wordsearch', chapter: 'personalidad',
      kicker: 'Personalidad · Sopa de letras',
      title: 'Palabras de la personalidad',
      intro: 'Encuentra las 10 palabras clave de la lectura.',
      words: ['TEMPERAMENTO', 'CARACTER', 'RASGO', 'ESTADO', 'HERENCIA', 'AMBIENTE', 'EXPERIENCIA', 'VOLUNTAD', 'EQUILIBRIO', 'ORQUESTA'],
    },
    {
      id: 'pers-mcq', type: 'mcq', chapter: 'personalidad',
      kicker: 'Personalidad · Selección múltiple',
      title: 'Pon a prueba lo aprendido',
      questions: [
        {
          q: '¿Cuáles son las tres raíces de la personalidad según Enrique Rojas?',
          options: ['La herencia, el ambiente y la propia experiencia', 'El dinero, la fama y el poder', 'La edad, la estatura y el peso', 'La suerte, el destino y el azar'],
          correct: 0,
          explanation: 'La personalidad es la suma de pautas de conducta con tres raíces: herencia, ambiente y la propia experiencia de la vida.',
        },
        {
          q: 'Completa: «El temperamento es la parte ___ de la personalidad y el carácter es la parte ___».',
          options: ['adquirida / heredada', 'heredada / adquirida', 'pasajera / estable', 'social / cultural'],
          correct: 1,
          explanation: 'El temperamento se hereda (raíz neurobiológica); el carácter se va forjando con las influencias psicológicas, sociales y culturales.',
        },
        {
          q: 'Alguien que se enoja por un hecho concreto, pero que habitualmente no es irascible, está mostrando un…',
          options: ['Rasgo', 'Estado', 'Temperamento', 'Carácter'],
          correct: 1,
          explanation: 'El estado es transitorio. Ser irascible sería un rasgo; responder con enfado a un suceso concreto es un estado.',
        },
        {
          q: 'Según el decálogo de la persona equilibrada, el proyecto de vida se apoya en tres grandes temas:',
          options: ['Fama, dinero y placer', 'Amor, trabajo y cultura', 'Deporte, viajes y redes sociales', 'Estudio, silencio y soledad'],
          correct: 1,
          explanation: 'Un proyecto de vida coherente y realista tiene tres notas: amor, trabajo y cultura.',
        },
      ],
      wrong: WRONG_READ,
    },
    {
      id: 'pers-refl', type: 'reflection', chapter: 'personalidad',
      kicker: 'Personalidad · Reflexión',
      title: 'Afina tu orquesta',
      intro: 'Escribe con calma. Tus respuestas se guardan en este dispositivo.',
      questions: [
        'Si tu personalidad fuera una orquesta, ¿qué «instrumentos» (rasgos) suenan más fuerte en ti y cuáles te gustaría afinar?',
        'De las 10 claves de la persona equilibrada, ¿cuál es tu mayor fortaleza y cuál necesitas trabajar más? ¿Qué paso pequeño puedes dar?',
        '¿Qué modelo de identidad positivo (familiar, profesor o personaje) ha influido en tu forma de ser? ¿Qué aprendiste de él o ella?',
      ],
    },

    // ============================ SECCIÓN 3 · AMISTAD ============================
    {
      id: 'amis-intro', type: 'section', chapter: 'amistad',
      number: '03', title: 'Amistad',
      tagline: 'Nadie se realiza solo: la persona crece con los otros',
      quote: 'No hay yo sin tú.',
      quoteAuthor: 'Ricardo Yepes',
      sources: 'A. M. Romero Tribas, «La innecesaria necesidad de la amistad» · R. Yepes, «Fundamentos de antropología: relaciones interpersonales»',
      steps: ['Lectura breve (2 páginas)', 'Crucigrama', 'Preguntas de selección múltiple', 'Preguntas de reflexión'],
    },
    {
      id: 'amis-info-1', type: 'info', chapter: 'amistad', page: '1 / 2',
      kicker: 'Amistad · Lectura 1 de 2',
      title: '¿Qué es la amistad?',
      lead: 'La persona es un ser <strong>dialogante</strong>: necesita de otros para reconocerse a sí misma y alcanzar su plenitud. La soledad total sería su fracaso. Por eso, «no hay yo sin tú».',
      blocks: [
        { type: 'cards', items: [
          { icon: 'heart', title: 'Benevolencia', text: '<strong>Querer el bien</strong> del amigo… y alegrarse sinceramente de sus éxitos.' },
          { icon: 'hand', title: 'Beneficencia', text: '<strong>Hacerle el bien</strong> de verdad: ayudar, animar, incluso decirle con franqueza lo que no está bien.' },
          { icon: 'key', title: 'Confidencia', text: '<strong>Compartir la intimidad.</strong> La confianza no se impone: se gana con tiempo, trato y sinceridad.' },
        ] },
        { type: 'levels', title: 'Tres niveles de dar', items: [
          { title: 'Lo que hago', text: 'Prestar apuntes, ayudar en una tarea.' },
          { title: 'Lo que tengo', text: 'Mis cosas, mi experiencia… y mi tiempo, que es regalar parte de mi vida.' },
          { title: 'Lo que soy', text: 'Darme: compartir mi mundo interior. Es lo propio de la amistad verdadera.' },
        ] },
        { type: 'callout', icon: 'chat', text: 'Las ideas, la alegría y la amistad son <strong>bienes que se comparten sin disminuir</strong>: al contrario, crecen. Aristóteles distingue amistades por utilidad, por placer y por el amigo mismo; solo esta última, desinteresada, es la amistad perfecta, porque «el amigo es otro yo». Y la amistad se alimenta de <strong>conversación</strong>… y también de silencios.' },
      ],
    },
    {
      id: 'amis-info-2', type: 'info', chapter: 'amistad', page: '2 / 2',
      kicker: 'Amistad · Lectura 2 de 2',
      title: 'Pilares y polillas de la amistad',
      lead: 'Lo que se construye para que dure necesita <strong>cimientos</strong> y también <strong>cuidados</strong> frente a lo que lo desgasta.',
      blocks: [
        { type: 'pillars', title: 'Pilares', items: [
          { title: 'Respeto', text: 'Aceptar al amigo como es y respetar su libertad.' },
          { title: 'Lealtad', text: 'Sinceridad y confianza: guardar sus secretos y decir las cosas a la cara.' },
          { title: 'Generosidad', text: 'Dar sin medir y escuchar de verdad.' },
          { title: 'Perdón', text: 'Aceptar los fallos y perdonar sin rencor.' },
          { title: 'Apertura', text: 'La amistad no es posesiva: se enriquece con otros.' },
          { title: 'Imaginación', text: 'Ponerse en su lugar y adelantarse a sus necesidades.' },
          { title: 'Compromiso', text: '«Domesticar significa crear lazos» (El Principito).' },
        ] },
        { type: 'moths', title: 'Polillas', items: [
          { title: 'Crítica', text: 'Hablar mal del amigo; puede llegar a la calumnia.' },
          { title: 'Egoísmo', text: 'Utilizar a las personas o «ir a lo mío».' },
          { title: 'Resentimiento', text: 'Llevar la cuenta de errores y agravios.' },
          { title: 'Susceptibilidad', text: 'Sentirse herido por todo.' },
        ] },
      ],
    },
    {
      id: 'amis-cw', type: 'crossword', chapter: 'amistad',
      kicker: 'Amistad · Crucigrama',
      title: 'Pilares y polillas',
      intro: 'Completa el crucigrama con lo que aprendiste.',
      entries: [
        { answer: 'BENEVOLENCIA', clue: 'Querer el bien para el amigo.' },
        { answer: 'CONFIDENCIA', clue: 'Compartir la propia intimidad con el amigo.' },
        { answer: 'CONVERSACION', clue: '«Ante todo, amistad es…» (Yepes).' },
        { answer: 'RESENTIMIENTO', clue: 'Polilla: llevar la cuenta de los errores y la lista de agravios.' },
        { answer: 'LEALTAD', clue: 'Pilar que se construye sobre la sinceridad y la confianza.' },
        { answer: 'CRITICA', clue: 'Polilla: hablar mal del amigo a sus espaldas.' },
        { answer: 'PERDON', clue: 'Pilar: aceptar los fallos del amigo sin guardar rencor.' },
        { answer: 'LAZOS', clue: '«Domesticar significa crear…» (El Principito).' },
      ],
    },
    {
      id: 'amis-mcq', type: 'mcq', chapter: 'amistad',
      kicker: 'Amistad · Selección múltiple',
      title: 'Pon a prueba lo aprendido',
      questions: [
        {
          q: '¿Cuáles son las tres notas que caracterizan a la amistad?',
          options: ['Benevolencia, beneficencia y confidencia', 'Fama, dinero y diversión', 'Competencia, rivalidad y control', 'Utilidad, placer y comodidad'],
          correct: 0,
          explanation: 'Querer el bien del amigo (benevolencia), hacérselo de hecho (beneficencia) y compartir la intimidad (confidencia).',
        },
        {
          q: 'Según Aristóteles, citado por Yepes, la amistad perfecta es la que se da…',
          options: ['Por la utilidad que nos reporta', 'Por el placer que produce', 'Por el amigo mismo, de forma desinteresada', 'Por obligación social'],
          correct: 2,
          explanation: 'Las amistades por utilidad o por placer se disuelven cuando eso desaparece. La perfecta quiere al amigo por sí mismo: es desinteresada.',
        },
        {
          q: '¿Cuál de las siguientes es una «polilla» que desgasta la amistad?',
          options: ['La generosidad', 'La lealtad', 'La susceptibilidad', 'La imaginación'],
          correct: 2,
          explanation: 'La susceptibilidad, junto con la crítica, el egoísmo y el resentimiento, corroe las buenas amistades.',
        },
        {
          q: 'El nivel más profundo de donación en la amistad es dar…',
          options: ['Lo que hago', 'Lo que tengo', 'Lo que soy: compartir la propia intimidad', 'Regalos costosos'],
          correct: 2,
          explanation: 'Dar lo que hago y lo que tengo es necesario, pero no suficiente: la amistad verdadera exige darse, compartir lo que uno es.',
        },
      ],
      wrong: WRONG_READ,
    },
    {
      id: 'amis-refl', type: 'reflection', chapter: 'amistad',
      kicker: 'Amistad · Reflexión',
      title: 'Tus amistades',
      intro: 'Escribe con calma. Tus respuestas se guardan en este dispositivo.',
      questions: [
        'Piensa en tu mejor amigo(a): ¿qué pilares sostienen esa amistad y cuál te gustaría cuidar más?',
        '¿Has visto alguna «polilla» (crítica, egoísmo, resentimiento o susceptibilidad) dañar una amistad? ¿Cómo se podría haber evitado?',
        '¿Das a tus amigos solo lo que haces y lo que tienes, o también lo que eres? ¿Qué te ayudaría a abrirte más?',
      ],
    },

    // ============================ SECCIÓN 4 · FAMILIA ============================
    {
      id: 'fam-intro', type: 'section', chapter: 'familia',
      number: '04', title: 'Familia',
      tagline: 'El lugar donde nacemos como personas y al que siempre podemos volver',
      quote: 'La familia es el lugar en el que todo hombre se revela en su unicidad e irrepetibilidad.',
      quoteAuthor: 'Karol Wojtyła, citado por J. M. Burgos',
      sources: 'J. M. Burgos, «Antropología: una guía para la existencia» (cap. La familia) · R. Yepes, «Fundamentos de antropología»',
      steps: ['Lectura breve (2 páginas)', 'Sopa de letras', 'Preguntas de selección múltiple', 'Preguntas de reflexión'],
    },
    {
      id: 'fam-info-1', type: 'info', chapter: 'familia', page: '1 / 2',
      kicker: 'Familia · Lectura 1 de 2',
      title: 'La familia forma a la persona',
      lead: 'La familia es la <strong>célula esencial de la sociedad</strong>: de su buen funcionamiento depende, en gran medida, el de todo el entramado social. Y es allí donde cada persona se forja.',
      blocks: [
        { type: 'levels', title: 'Cómo nos forma', items: [
          { title: 'La vida y lo básico', text: 'Alimento, vestido, cuidados y un hogar; siempre con un sentido humano y cultural.' },
          { title: 'Socialización primaria', text: 'Andar, hablar, normas de convivencia: compartir, respetar, agradecer. En la infancia somos como «plastilina moldeable».' },
          { title: 'Identidad', text: 'Si el niño crece rodeado de amor, ve el mundo como un lugar acogedor y forma una personalidad estable con una autoestima adecuada.' },
        ] },
        { type: 'pair', items: [
          { icon: 'shield', title: 'Principio de seguridad', text: 'Suele encarnarlo la <strong>madre</strong>: protección, refugio y amor incondicionado.' },
          { icon: 'compass', title: 'Principio de realidad', text: 'Suele encarnarlo el <strong>padre</strong>: el mundo tiene leyes, los demás tienen derechos, y vale la pena afrontar retos.' },
        ] },
        { type: 'callout', icon: 'link', text: 'Estos papeles <strong>no son exclusivos ni excluyentes</strong>: es el mismo amor, igual de radical, expresado de dos maneras complementarias (una cuida en el tobogán, el otro anima a deslizarse).' },
      ],
    },
    {
      id: 'fam-info-2', type: 'info', chapter: 'familia', page: '2 / 2',
      kicker: 'Familia · Lectura 2 de 2',
      title: 'El lugar de la existencia',
      lead: 'También en la vida adulta la familia sigue siendo decisiva. Burgos señala cuatro ámbitos:',
      blocks: [
        { type: 'cards', items: [
          { icon: 'root', title: 'Las raíces', text: 'Sabemos quiénes somos y de dónde venimos: el nombre dice nuestro yo único; los apellidos, nuestro origen. Es el lugar al que siempre podemos volver.' },
          { icon: 'heart', title: 'El centro afectivo', text: 'Allí somos queridos <strong>de manera incondicional</strong>, por ser quienes somos, y allí aprendemos a amar con más entrega.' },
          { icon: 'home', title: 'Familia y trabajo', text: 'El «trabajo de construcción del hogar» —casa, cuidado y educación de los hijos, relación de pareja— merece mucha más valoración.' },
          { icon: 'hands', title: 'Acompañar al final', text: 'Las personas más importantes deben acompañarnos en el momento más decisivo: morir rodeado y querido por los suyos.' },
        ] },
        { type: 'callout', icon: 'users', text: 'Yepes llama al amor familiar <strong>amor natural</strong>: nace de una comunidad de origen y crece con la cercanía. En la familia todo ser humano es reconocido como único e irrepetible.' },
      ],
    },
    {
      id: 'fam-ws', type: 'wordsearch', chapter: 'familia',
      kicker: 'Familia · Sopa de letras',
      title: 'Palabras de la familia',
      intro: 'Encuentra las 10 palabras clave de la lectura.',
      words: ['CELULA', 'RAICES', 'HOGAR', 'IDENTIDAD', 'SEGURIDAD', 'REALIDAD', 'AFECTO', 'SOCIALIZACION', 'LENGUAJE', 'APELLIDOS'],
    },
    {
      id: 'fam-mcq', type: 'mcq', chapter: 'familia',
      kicker: 'Familia · Selección múltiple',
      title: 'Pon a prueba lo aprendido',
      questions: [
        {
          q: '¿Por qué se dice que la familia es la «célula» de la sociedad?',
          options: ['Porque es el grupo más pequeño que existe', 'Porque de su buen funcionamiento depende en gran medida el de toda la sociedad', 'Porque solo se ocupa de la alimentación', 'Porque está separada del resto de la sociedad'],
          correct: 1,
          explanation: 'Es la estructura esencial: cuando funciona bien, sostiene el funcionamiento global del entramado social.',
        },
        {
          q: 'En la familia, la madre suele representar el principio de ___ y el padre el principio de ___.',
          options: ['seguridad / realidad', 'realidad / seguridad', 'autoridad / obediencia', 'trabajo / descanso'],
          correct: 0,
          explanation: 'Seguridad (protección y amor incondicionado) y realidad (el mundo tiene leyes y los demás tienen derechos). No son papeles exclusivos.',
        },
        {
          q: '¿Qué incluye la socialización primaria?',
          options: ['Aprender a conducir un autobús', 'Las habilidades básicas, el lenguaje y normas como compartir, respetar y agradecer', 'Solo los estudios universitarios', 'Elegir una profesión'],
          correct: 1,
          explanation: 'Son las claves básicas para integrarse en la sociedad, que se reciben sobre todo en los primeros años.',
        },
        {
          q: '¿Qué significa que la familia sea el «centro afectivo» de la persona?',
          options: ['Que allí nos quieren solo por nuestros logros', 'Que allí somos queridos de manera incondicional, por ser quienes somos', 'Que allí no hay conflictos nunca', 'Que allí se decide nuestro trabajo'],
          correct: 1,
          explanation: 'En la familia se nos quiere independientemente de la edad, la salud o las cualidades, y allí desarrollamos al máximo nuestra capacidad de amar.',
        },
      ],
      wrong: WRONG_READ,
    },
    {
      id: 'fam-refl', type: 'reflection', chapter: 'familia',
      kicker: 'Familia · Reflexión',
      title: 'Tus raíces',
      intro: 'Escribe con calma. Tus respuestas se guardan en este dispositivo.',
      questions: [
        '¿Qué «raíces» (valores, costumbres, historias) has recibido de tu familia y cuáles quieres conservar?',
        '¿Cómo han influido en tu personalidad y en tu autoestima las personas con las que creciste?',
        '¿Qué gesto concreto podrías tener esta semana para hacer de tu familia un verdadero centro afectivo?',
      ],
    },

    // ============================ SECCIÓN 5 · REDES SOCIALES ============================
    {
      id: 'redes-intro', type: 'section', chapter: 'redes',
      number: '05', title: 'Redes sociales',
      tagline: 'La amistad de hoy: conexión digital, individualismo y soledad',
      quote: 'La cercanía digital no es suficiente.',
      quoteAuthor: 'Diego Rodríguez-Cárdenas, psicólogo',
      sources: 'Especial multimedia de Semana, «La amistad de hoy: redes sociales, individualismo y soledad» · Video «Redes sociales»',
      steps: ['Video', 'Lectura breve (2 páginas)', 'Clasifica: ¿suma o resta?', 'Une cada concepto', 'Preguntas de selección múltiple', 'Preguntas de reflexión'],
    },
    {
      id: 'redes-video', type: 'videoText', chapter: 'redes',
      video: A('Video_Redes_Sociales_web.mp4'),
      kicker: 'Redes sociales · Video',
      html:
        '<p class="r-context">Hoy podemos tener cientos de «amigos» a un clic de distancia y, sin embargo, la soledad crece en todo el mundo, sobre todo entre los jóvenes. Mira el video con calma: después leerás lo que dicen los estudios y pondrás a prueba lo aprendido.</p>' +
        '<p class="r-question">Mientras lo ves, piensa: de todos tus contactos en redes, ¿cuántos son amigos de verdad, de esos que están en las buenas y en las malas?</p>',
    },
    {
      id: 'redes-info-1', type: 'info', chapter: 'redes', page: '1 / 2',
      kicker: 'Redes sociales · Lectura 1 de 2',
      title: 'Los amigos también son salud',
      lead: 'La ciencia lo confirma: las amistades cercanas protegen la salud física y mental. Pero los vínculos profundos <strong>necesitan tiempo</strong>, y la calidad importa más que la cantidad.',
      blocks: [
        { type: 'cards', items: [
          { icon: 'book', title: 'Estudio Grant (Harvard)', text: 'Siguió desde 1938 a 268 estudiantes. El mejor predictor de una vida sana y feliz no fue el dinero ni la genética: fueron <strong>las relaciones</strong>.' },
          { icon: 'pulse', title: 'Vivir más', text: 'Un estudio de 2010 asoció los lazos sociales fuertes con un <strong>50 % menos de probabilidad de muerte prematura</strong>, un efecto comparable a dejar de fumar.' },
          { icon: 'spark', title: 'Calmante natural', text: 'Compartir con amigos libera <strong>endorfinas</strong>, y su compañía ayuda a sobrellevar el estrés.' },
        ] },
        { type: 'levels', title: '¿Cuántos amigos y cuánto tiempo?', items: [
          { title: 'Unas 150 relaciones', text: 'Según Robin Dunbar, podemos sostener alrededor de 150 vínculos… pero solo de 3 a 5 amigos muy cercanos.' },
          { title: '80 a 100 horas', text: 'Es lo que, según Jeffrey Hall, se necesita para que un conocido se vuelva un amigo casual.' },
          { title: 'Más de 200 horas', text: 'Es el tiempo compartido que hace falta para llegar a ser amigos cercanos.' },
        ] },
        { type: 'callout', icon: 'users', text: 'La amistad es un vínculo <strong>horizontal</strong>: igualitario y recíproco. En la infancia nos enseña lealtad, confianza y reconciliación; en la adolescencia influye mucho en nuestros hábitos. Como dice Lydia Denworth, <strong>la calidad importa más que la cantidad</strong>.' },
      ],
    },
    {
      id: 'redes-info-2', type: 'info', chapter: 'redes', page: '2 / 2',
      kicker: 'Redes sociales · Lectura 2 de 2',
      title: 'Conectados… ¿pero solos?',
      lead: 'Las redes rompen las barreras de espacio y tiempo, pero también pueden crear una <strong>ilusión de cercanía</strong>. Bien usadas, fortalecen amistades que ya existen; mal usadas, aumentan la soledad.',
      blocks: [
        { type: 'pair', items: [
          { icon: 'link', title: 'Relaciones «líquidas»', text: 'El sociólogo Carlos Charry, retomando a Zygmunt Bauman, advierte que los vínculos se vuelven superficiales y casi <strong>transacciones</strong>. En redes construimos un <strong>alter ego</strong> que hace frustrante el encuentro real.' },
          { icon: 'cloud', title: 'La paradoja de la soledad', text: 'Una investigación de María Barreto halló que quienes tenían más «amigos» de Facebook que no conocían realmente <strong>se sentían más solos</strong>. El 40 % de los jóvenes de 16 a 24 años dice sentirse solo a menudo.' },
        ] },
        { type: 'levels', title: 'Tres tipos de soledad', items: [
          { title: 'Social', text: 'Insatisfacción con la cantidad de relaciones.' },
          { title: 'Emocional', text: 'Insatisfacción con la calidad de las relaciones.' },
          { title: 'Crónica', text: 'La creencia persistente de que nadie nos valora.' },
        ] },
        { type: 'pillars', title: 'Señales de un amigo fiel (Andrés Aljure)', items: [
          { title: 'No es virtual', text: 'Cien amigos virtuales no reemplazan a uno real.' },
          { title: 'No es idéntico', text: 'Las diferencias enriquecen la amistad.' },
          { title: 'No es idílico', text: 'Hay desacuerdos, pero la amistad los supera.' },
          { title: 'Está siempre', text: 'En las buenas y en las malas; sabe escuchar.' },
          { title: 'Dice la verdad', text: 'Aunque cueste, porque quiere tu bien.' },
          { title: 'Te acepta', text: 'Te quiere como eres, sin intentar cambiarte.' },
        ] },
        { type: 'callout', icon: 'chat', text: '«La cercanía digital no es suficiente»: el afecto mutuo necesita <strong>encuentros cara a cara</strong> y experiencias compartidas. Los jóvenes distinguen entre amigos, contactos y seguidores; la clave es <strong>educar en el uso de las redes, sin satanizarlas</strong> (Diego Rodríguez-Cárdenas).' },
      ],
    },
    {
      id: 'redes-sort', type: 'sort', chapter: 'redes',
      kicker: 'Redes sociales · Actividad 1',
      title: '¿Suma o resta a la amistad?',
      intro: 'Toca una tarjeta y luego la columna donde crees que va (en computador también puedes arrastrarla). Clasifica las 10 situaciones.',
      bins: [
        { title: 'Fortalece la amistad', hint: 'Acerca a las personas', icon: 'heart' },
        { title: 'Debilita la amistad', hint: 'Aísla o vuelve superficial el vínculo', icon: 'cloud' },
      ],
      cards: [
        { text: 'Usar las redes para seguir en contacto con un amigo que vive lejos… y verse en persona cuando se puede.', bin: 0, why: 'Las redes rompen barreras de espacio y tiempo y fortalecen amistades que ya existen.' },
        { text: 'Medir el valor de una amistad por los «likes» o seguidores.', bin: 1, why: 'La calidad de la amistad no se mide en cifras: importa más la calidad que la cantidad.' },
        { text: 'Escribirle a un amigo que está pasando un mal momento y ofrecerle escucharlo.', bin: 0, why: 'El amigo fiel está en las buenas y en las malas y sabe escuchar.' },
        { text: 'Acumular cientos de «amigos» en redes a quienes no conoces realmente.', bin: 1, why: 'Tener muchos contactos desconocidos crea una ilusión de cercanía y puede aumentar la soledad.' },
        { text: 'Decirle a tu amigo una verdad difícil, con cariño, porque quieres su bien.', bin: 0, why: 'Un verdadero amigo dice la verdad aunque cueste.' },
        { text: 'Mostrar en redes un «alter ego» que no corresponde con quien eres.', bin: 1, why: 'El alter ego digital hace frustrante el encuentro real y aleja de la autenticidad.' },
        { text: 'Aceptar a tu amigo como es, aunque piense distinto de ti.', bin: 0, why: 'La amistad se enriquece con las diferencias; el amigo te acepta sin intentar cambiarte.' },
        { text: 'Buscar a los amigos solo cuando te sirven para algo.', bin: 1, why: 'Convertir la amistad en una transacción la vuelve superficial; requiere aporte mutuo.' },
        { text: 'Dedicar tiempo a compartir experiencias cara a cara.', bin: 0, why: 'Una amistad cercana necesita muchas horas compartidas y encuentros presenciales.' },
        { text: 'Reemplazar todos los encuentros presenciales por mensajes y reacciones.', bin: 1, why: 'La cercanía digital no es suficiente: el afecto mutuo necesita contacto cara a cara.' },
      ],
    },
    {
      id: 'redes-match', type: 'match', chapter: 'redes',
      kicker: 'Redes sociales · Actividad 2',
      title: 'Une cada concepto con su significado',
      intro: 'Toca un concepto de la izquierda y luego su significado a la derecha (o al revés). Forma las 6 parejas.',
      pairs: [
        { a: 'Estudio Grant de Harvard', b: 'Investigación iniciada en 1938 que encontró en las relaciones el mejor predictor de una vida sana y feliz.' },
        { a: 'Número de Dunbar', b: 'Alrededor de 150 vínculos posibles, de los cuales solo 3 a 5 son amigos muy cercanos.' },
        { a: 'Relaciones líquidas', b: 'Vínculos superficiales y pasajeros que funcionan casi como transacciones (Bauman).' },
        { a: 'Alter ego digital', b: 'Imagen idealizada que construimos en redes y que vuelve frustrante el encuentro real.' },
        { a: 'Soledad social', b: 'Insatisfacción con la cantidad de relaciones que se tienen.' },
        { a: 'Soledad emocional', b: 'Insatisfacción con la calidad de las relaciones que se tienen.' },
      ],
    },
    {
      id: 'redes-mcq', type: 'mcq', chapter: 'redes',
      kicker: 'Redes sociales · Selección múltiple',
      title: 'Pon a prueba lo aprendido',
      questions: [
        {
          q: 'Según el Estudio Grant de Harvard, ¿cuál resultó ser el mejor predictor de una vida sana y feliz?',
          options: ['El dinero', 'La genética', 'Las relaciones cercanas', 'El éxito profesional'],
          correct: 2,
          explanation: 'Los investigadores esperaban que fueran la genética, el dinero o la carrera, pero el factor más fuerte fueron las relaciones.',
        },
        {
          q: 'Según el antropólogo Robin Dunbar, ¿cuántos amigos muy cercanos suele tener una persona?',
          options: ['Entre 3 y 5', 'Alrededor de 150', 'Más de 500', 'Ninguno'],
          correct: 0,
          explanation: 'Podemos sostener unas 150 relaciones, pero solo de 3 a 5 amistades muy cercanas.',
        },
        {
          q: 'En la investigación de María Barreto, las personas con muchos «amigos» de Facebook a quienes no conocían realmente…',
          options: ['Se sentían más acompañadas', 'Se sentían más solas', 'Tenían más amigos íntimos', 'No sentían ninguna diferencia'],
          correct: 1,
          explanation: 'Reportaban más desconexión, tristeza y sensación de no ser comprendidas: la cantidad de contactos no reemplaza la calidad.',
        },
        {
          q: '¿Qué propone Diego Rodríguez-Cárdenas frente a las redes sociales?',
          options: ['Prohibirlas a los jóvenes', 'Reemplazar con ellas los encuentros presenciales', 'Reconocer que la cercanía digital no basta y educar en su uso, sin satanizarlas', 'Usarlas solo para trabajar'],
          correct: 2,
          explanation: 'Las redes quitan barreras de espacio y tiempo, pero el afecto mutuo necesita encuentros cara a cara. Hay que educar, no satanizar.',
        },
      ],
      wrong: WRONG_READ,
    },
    {
      id: 'redes-refl', type: 'reflection', chapter: 'redes',
      kicker: 'Redes sociales · Reflexión',
      title: 'Tus redes, tus amigos',
      intro: 'Escribe con calma. Tus respuestas se guardan en este dispositivo.',
      questions: [
        'De tus contactos en redes, ¿cuántos consideras amigos de verdad? ¿Qué los diferencia de un simple contacto o seguidor?',
        '¿Alguna vez te has sentido solo(a) aun estando «conectado(a)»? ¿Qué hiciste o qué podrías hacer la próxima vez?',
        '¿Qué cambio concreto puedes hacer esta semana para que las redes fortalezcan, y no reemplacen, tus amistades cara a cara?',
      ],
    },

    // ============================ FINAL ============================
    {
      id: 'final', type: 'final', chapter: 'final',
      title: '¡Viaje completado!',
      text: 'Recorriste con Lopez Lomong el camino de Bogotá a Sudán del Sur, Kenia y Estados Unidos, y exploraste la autoestima, la personalidad, la amistad, la familia y las redes sociales. Como él, cada persona corre su propia carrera: con raíces, con amigos y con un para qué.',
    },
  ];

  window.CONTENT = { cities: CITIES, chapters: CHAPTERS, flow: flow };
})();
