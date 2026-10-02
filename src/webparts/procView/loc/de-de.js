// German texts: Signavio menu labels as the German Signavio UI shows them; no form of
// address ("Sie"/"du") where it can be avoided
define([], function () {
  return {
    PropertyPaneDescription: 'Zeigt ein Prozessdiagramm aus einem freigegebenen Link an.',
    DefaultAltText: 'Prozessdiagramm',

    DiagramGroupName: 'Diagramm',
    ImageLinkLabel: 'Bildlink',
    ImageLinkDescription:
      'In Signavio: Freigeben → Diagramm einbetten → Registerkarte „Einfaches Bild“ → Link zum PNG-Bild kopieren.',
    NaturalSizeKnown: 'Maximale Größe: {0} × {1} px',
    NaturalSizeUnknown: 'Maximale Größe: wird angezeigt, sobald das Diagramm geladen ist.',
    CaptionGroupName: 'Bildunterschrift',
    CaptionLabel: 'Text',
    CaptionDescription: 'Erscheint unter dem Diagramm. Leer: keine Bildunterschrift.',
    CaptionAlignLabel: 'Ausrichtung',
    AlignLeft: 'Linksbündig',
    AlignCenter: 'Zentriert',
    AlignRight: 'Rechtsbündig',
    HubLinkGroupName: 'Link zum Collaboration Hub',
    ShowHubLinkLabel: 'Link zum Collaboration Hub anzeigen',
    ToggleOn: 'Ein',
    ToggleOff: 'Aus',
    HubLinkTextLabel: 'Linktext',
    HubLinkTextDescription: 'Leer: „In Signavio öffnen“. Zum Öffnen ist ein Zugang zu SAP Signavio nötig.',
    HubLinkDefaultText: 'In Signavio öffnen',
    HubLinkAlignLabel: 'Ausrichtung',
    HubLinkPositionLabel: 'Position',
    PositionBelow: 'Unter dem Diagramm',
    PositionOverlay: 'Auf dem Diagramm, unten rechts',
    NewTabHint: '(öffnet in einem neuen Tab)',

    MessageNoLinkTitle: 'Prozessdiagramm hinzufügen',
    MessageNoLinkBody:
      'In SAP Signavio unter Freigeben → Diagramm einbetten auf der Registerkarte „Einfaches Bild“ den Link zum PNG-Bild kopieren und in die Einstellungen dieses Webparts einfügen.',
    MessageInvalidLinkTitle: 'Dieser Link kann nicht angezeigt werden',
    MessageUnavailableReader: 'Das Diagramm ist derzeit nicht verfügbar.',
    MessageLoadFailedTitle: 'Das Diagramm konnte nicht geladen werden',
    MessageLoadFailedCauses: 'Mögliche Ursachen:',
    MessageLoadFailedReader: 'Das Diagramm konnte nicht geladen werden.',
    CauseSharingRevoked: 'Der Lesezugriff auf das Diagramm wurde in SAP Signavio widerrufen.',
    CauseLinkIncorrect:
      'Der Link ist unvollständig oder veraltet – ihn erneut von der Registerkarte „Einfaches Bild“ kopieren.',
    CauseDomainBlocked:
      'Netzwerk, Firewall oder Proxy blockieren die Domain von SAP Signavio – die IT-Abteilung kann sie freigeben.',
    MessageBlockedTitle: 'Bilder von {0} werden blockiert',
    MessageBlockedBody:
      'Eine Sicherheitsrichtlinie dieser Website verhindert, dass das Diagramm von {0} geladen wird. Die SharePoint-Administration kann diese Domain zulassen.',
    ConfigureButton: 'Konfigurieren',
    SizeGroupName: 'Größe',
    WidthLabel: 'Breite',
    WidthDescription:
      'Pixel (z. B. 800), Prozent der Spalte (z. B. 50 %) oder leer für automatisch. Nie breiter als die Spalte.',
    HeightLabel: 'Höhe',
    HeightDescription: 'Pixel (z. B. 600) oder leer für automatisch. Das Diagramm behält seine Proportionen.',
    ViewingGroupName: 'Ansicht',
    OfferZoomLabel: 'Zoom anbieten',
    OfferFullScreenLabel: 'Vollbild anbieten',
    ShowBackgroundLabel: 'Hintergrund hinter dem Diagramm',
    BackgroundColorLabel: 'Hintergrundfarbe',
    FullScreen: 'Vollbild',
    CloseFullScreen: 'Schließen',
    ZoomIn: 'Vergrößern',
    ZoomOut: 'Verkleinern',
    ZoomReset: 'Einpassen',
    ZoomViewportLabel: 'Zoombares Diagramm: + und − zoomen, Pfeiltasten verschieben, 0 passt es ein',
    AccessibilityGroupName: 'Barrierefreiheit',
    AltTextLabel: 'Alternativtext',
    AltTextDescription: 'Beschreibt das Diagramm für Screenreader. Leer: „Prozessdiagramm“.',
    AboutGroupName: 'Info',
    RepositoryLinkText: 'Quellcode und Dokumentation auf GitHub',

    LinkErrorEmpty: 'Den Link zum PNG-Bild von der Registerkarte „Einfaches Bild“ einfügen.',
    LinkErrorUnsupported:
      'Dieser Link stammt nicht aus einem unterstützten Prozesswerkzeug. Benötigt wird der Link von der Registerkarte „Einfaches Bild“ in SAP Signavio.',
    LinkErrorNotUrl: 'Das ist kein vollständiger Link – er muss mit https:// beginnen.',
    LinkErrorNotHttps: 'Nur sichere Links, die mit https:// beginnen, werden unterstützt.',
    LinkErrorUnknownHost:
      'Diese Signavio-Adresse wird nicht unterstützt. Den Link genau so einfügen, wie er aus Signavio kopiert wurde.',
    LinkErrorEmbedCode:
      'Das ist der Code von der Registerkarte „Einbettung“. In Signavio unter Freigeben → Diagramm einbetten stattdessen den Link von der Registerkarte „Einfaches Bild“ kopieren.',
    LinkErrorNotImageLink:
      'Das ist kein Bildlink. In Signavio unter Freigeben → Diagramm einbetten den Link von der Registerkarte „Einfaches Bild“ kopieren.',
    LinkErrorMissingAuthKey:
      'Dem Link fehlt der Zugriffsschlüssel. Den vollständigen Link von der Registerkarte „Einfaches Bild“ in Signavio kopieren.',
    LinkErrorInvalidModelId: 'Die Diagramm-ID in diesem Link ist ungültig. Den Link erneut aus Signavio kopieren.',
    LinkErrorInvalidAuthKey:
      'Der Zugriffsschlüssel in diesem Link ist ungültig. Den Link erneut aus Signavio kopieren.',

    DimensionErrorInvalidWidth:
      'Pixel (z. B. 800) oder Prozent der Spalte (z. B. 50 %) eingeben – oder leer lassen für automatisch.',
    DimensionErrorInvalidHeight: 'Pixel (z. B. 600) eingeben – oder leer lassen für automatisch.',
    DimensionErrorTooLarge: 'Das Maximum sind {0} Pixel.',
    DimensionErrorPercentOutOfRange: 'Einen Prozentwert von 1 % bis 100 % verwenden.',
    DimensionErrorPercentHeight:
      'Die Höhe kann kein Prozentwert sein – Pixel eingeben oder leer lassen für automatisch.'
  };
});
