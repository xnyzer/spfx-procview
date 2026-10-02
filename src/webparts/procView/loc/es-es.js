// Spanish texts: Signavio menu labels stay English (no Spanish Signavio documentation found;
// owner decision); infinitive instructions, no form of address; no-break spaces (U+00A0,
// invisible) before % and in 10 000
define([], function () {
  return {
    PropertyPaneDescription: 'Muestra un diagrama de procesos a partir de un enlace compartido.',
    DefaultAltText: 'Diagrama de procesos',

    DiagramGroupName: 'Diagrama',
    ImageLinkLabel: 'Enlace de la imagen',
    ImageLinkDescription: 'En Signavio: Share → Embed diagram → pestaña «Simple image» → copiar el enlace.',
    NaturalSizeKnown: 'Tamaño máximo: {0} × {1} px',
    NaturalSizeUnknown: 'Tamaño máximo: se muestra cuando el diagrama se haya cargado.',
    CaptionGroupName: 'Pie de imagen',
    CaptionLabel: 'Texto',
    CaptionDescription: 'Se muestra debajo del diagrama. Vacío: sin pie de imagen.',
    CaptionAlignLabel: 'Alineación',
    AlignLeft: 'Alinear a la izquierda',
    AlignCenter: 'Centrar',
    AlignRight: 'Alinear a la derecha',
    HubLinkGroupName: 'Enlace al Collaboration Hub',
    ShowHubLinkLabel: 'Mostrar el enlace al Collaboration Hub',
    ToggleOn: 'Activado',
    ToggleOff: 'Desactivado',
    HubLinkTextLabel: 'Texto del enlace',
    HubLinkTextDescription: 'Vacío: «Abrir en Signavio». Para abrirlo se necesita acceso a SAP Signavio.',
    HubLinkDefaultText: 'Abrir en Signavio',
    HubLinkAlignLabel: 'Alineación',
    HubLinkPositionLabel: 'Posición',
    PositionBelow: 'Debajo del diagrama',
    PositionOverlay: 'Sobre el diagrama, abajo a la derecha',
    NewTabHint: '(se abre en una pestaña nueva)',

    MessageNoLinkTitle: 'Agregar un diagrama de procesos',
    MessageNoLinkBody:
      'En SAP Signavio, abrir Share → Embed diagram, copiar el enlace de la pestaña «Simple image» y pegarlo en la configuración de este elemento web.',
    MessageInvalidLinkTitle: 'Este enlace no se puede mostrar',
    MessageUnavailableReader: 'El diagrama no está disponible en este momento.',
    MessageLoadFailedTitle: 'No se pudo cargar el diagrama',
    MessageLoadFailedCauses: 'Posibles causas:',
    MessageLoadFailedReader: 'No se pudo cargar el diagrama.',
    CauseSharingRevoked: 'El acceso de solo lectura al diagrama se desactivó en SAP Signavio.',
    CauseLinkIncorrect:
      'El enlace está incompleto o desactualizado: copiarlo de nuevo desde la pestaña «Simple image».',
    CauseDomainBlocked:
      'La red, el firewall o el proxy bloquean el dominio de SAP Signavio: el departamento de TI puede permitirlo.',
    MessageBlockedTitle: 'Las imágenes de {0} están bloqueadas',
    MessageBlockedBody:
      'Una directiva de seguridad de este sitio impide cargar el diagrama desde {0}. El administrador de SharePoint puede permitir este dominio.',
    ConfigureButton: 'Configurar',
    SizeGroupName: 'Tamaño',
    WidthLabel: 'Ancho',
    WidthDescription:
      'Píxeles (p. ej., 800), porcentaje de la columna (p. ej., 50 %) o vacío para automático. Nunca más ancho que la columna.',
    HeightLabel: 'Alto',
    HeightDescription: 'Píxeles (p. ej., 600) o vacío para automático. El diagrama conserva sus proporciones.',
    ViewingGroupName: 'Visualización',
    OfferZoomLabel: 'Ofrecer zoom',
    OfferFullScreenLabel: 'Ofrecer pantalla completa',
    ShowBackgroundLabel: 'Fondo detrás del diagrama',
    BackgroundColorLabel: 'Color de fondo',
    FullScreen: 'Pantalla completa',
    CloseFullScreen: 'Cerrar',
    ZoomIn: 'Acercar',
    ZoomOut: 'Alejar',
    ZoomReset: 'Ajustar al marco',
    ZoomViewportLabel: 'Diagrama ampliable: + y − hacen zoom, las flechas desplazan, 0 lo ajusta al marco',
    AccessibilityGroupName: 'Accesibilidad',
    AltTextLabel: 'Texto alternativo',
    AltTextDescription: 'Describe el diagrama para los lectores de pantalla. Vacío: «Diagrama de procesos».',
    AboutGroupName: 'Acerca de',
    RepositoryLinkText: 'Código fuente y documentación en GitHub',

    LinkErrorEmpty: 'Pegar el enlace de la pestaña «Simple image» del diagrama.',
    LinkErrorUnsupported:
      'Este enlace no procede de una herramienta de procesos compatible. Pegar el enlace de la pestaña «Simple image» de SAP Signavio.',
    LinkErrorNotUrl: 'No es un enlace completo: debe empezar por https://.',
    LinkErrorNotHttps: 'Solo se admiten enlaces seguros que empiecen por https://.',
    LinkErrorUnknownHost: 'Esta dirección de Signavio no es compatible. Pegar el enlace tal como se copió de Signavio.',
    LinkErrorEmbedCode:
      'Esto es el código para insertar. En Signavio, abrir Share → Embed diagram y copiar en su lugar el enlace de la pestaña «Simple image».',
    LinkErrorNotImageLink:
      'No es un enlace de imagen. En Signavio, abrir Share → Embed diagram y copiar el enlace de la pestaña «Simple image».',
    LinkErrorMissingAuthKey:
      'Al enlace le falta la clave de acceso. Copiar el enlace completo de la pestaña «Simple image» en Signavio.',
    LinkErrorInvalidModelId:
      'El identificador del diagrama en este enlace no es válido. Copiar de nuevo el enlace desde Signavio.',
    LinkErrorInvalidAuthKey:
      'La clave de acceso de este enlace no es válida. Copiar de nuevo el enlace desde Signavio.',

    DimensionErrorInvalidWidth:
      'Escribir píxeles (p. ej., 800) o un porcentaje de la columna (p. ej., 50 %), o dejar vacío para automático.',
    DimensionErrorInvalidHeight: 'Escribir píxeles (p. ej., 600) o dejar vacío para automático.',
    DimensionErrorTooLarge: 'El máximo es {0} píxeles.',
    DimensionErrorPercentOutOfRange: 'Usar un porcentaje del 1 % al 100 %.',
    DimensionErrorPercentHeight: 'El alto no puede ser un porcentaje: escribir píxeles o dejar vacío para automático.'
  };
});
