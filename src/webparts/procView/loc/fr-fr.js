// French texts: Signavio menu labels as the (machine-translated) French SAP Signavio user
// guide names them — not verified against the French UI; infinitive instructions, no form
// of address; French typography with no-break spaces (U+00A0, invisible) inside « » and
// before : and %
define([], function () {
  return {
    PropertyPaneDescription: 'Affiche un diagramme de processus à partir d’un lien partagé.',
    DefaultAltText: 'Diagramme de processus',

    DiagramGroupName: 'Diagramme',
    ImageLinkLabel: 'Lien de l’image',
    ImageLinkDescription:
      'Dans Signavio\u00a0: Partager → Incorporer un diagramme → onglet «\u00a0Image simple\u00a0» → copier le lien.',
    NaturalSizeKnown: 'Taille maximale\u00a0: {0} × {1} px',
    NaturalSizeUnknown: 'Taille maximale\u00a0: affichée dès que le diagramme est chargé.',
    CaptionGroupName: 'Légende',
    CaptionLabel: 'Texte',
    CaptionDescription: 'Affichée sous le diagramme. Vide\u00a0: pas de légende.',
    CaptionAlignLabel: 'Alignement',
    AlignLeft: 'Aligner à gauche',
    AlignCenter: 'Centrer',
    AlignRight: 'Aligner à droite',
    HubLinkGroupName: 'Lien vers le Collaboration Hub',
    ShowHubLinkLabel: 'Afficher le lien vers le Collaboration Hub',
    ToggleOn: 'Activé',
    ToggleOff: 'Désactivé',
    HubLinkTextLabel: 'Texte du lien',
    HubLinkTextDescription:
      'Vide\u00a0: «\u00a0Ouvrir dans Signavio\u00a0». Un accès à SAP Signavio est nécessaire pour l’ouvrir.',
    HubLinkDefaultText: 'Ouvrir dans Signavio',
    HubLinkAlignLabel: 'Alignement',
    HubLinkPositionLabel: 'Position',
    PositionBelow: 'Sous le diagramme',
    PositionOverlay: 'Sur le diagramme, en bas à droite',
    NewTabHint: '(s’ouvre dans un nouvel onglet)',

    MessageNoLinkTitle: 'Ajouter un diagramme de processus',
    MessageNoLinkBody:
      'Dans SAP Signavio, ouvrir Partager → Incorporer un diagramme, copier le lien de l’onglet «\u00a0Image simple\u00a0» et le coller dans les paramètres de ce composant WebPart.',
    MessageInvalidLinkTitle: 'Ce lien ne peut pas être affiché',
    MessageUnavailableReader: 'Le diagramme est actuellement indisponible.',
    MessageLoadFailedTitle: 'Le diagramme n’a pas pu être chargé',
    MessageLoadFailedCauses: 'Causes possibles\u00a0:',
    MessageLoadFailedReader: 'Le diagramme n’a pas pu être chargé.',
    CauseSharingRevoked: 'Le partage en lecture seule du diagramme a été désactivé dans SAP Signavio.',
    CauseLinkIncorrect:
      'Le lien est incomplet ou obsolète — le copier à nouveau depuis l’onglet «\u00a0Image simple\u00a0».',
    CauseDomainBlocked:
      'Le réseau, le pare-feu ou le proxy bloque le domaine de SAP Signavio — le service informatique peut l’autoriser.',
    MessageBlockedTitle: 'Les images de {0} sont bloquées',
    MessageBlockedBody:
      'Une stratégie de sécurité de ce site empêche le chargement du diagramme depuis {0}. L’administrateur SharePoint peut autoriser ce domaine.',
    ConfigureButton: 'Configurer',
    SizeGroupName: 'Taille et alignement',
    WidthLabel: 'Largeur',
    WidthDescription:
      'Pixels (p.\u00a0ex. 800), pourcentage de la colonne (p.\u00a0ex. 50\u00a0%) ou vide pour automatique. Jamais plus large que la colonne.',
    HeightLabel: 'Hauteur',
    HeightDescription: 'Pixels (p.\u00a0ex. 600) ou vide pour automatique. Le diagramme conserve ses proportions.',
    DiagramAlignLabel: 'Alignement',
    ViewingGroupName: 'Affichage',
    OfferZoomLabel: 'Proposer le zoom',
    OfferFullScreenLabel: 'Proposer le plein écran',
    ShowBackgroundLabel: 'Arrière-plan derrière le diagramme',
    BackgroundColorLabel: 'Couleur d’arrière-plan',
    FullScreen: 'Plein écran',
    CloseFullScreen: 'Fermer',
    ZoomIn: 'Zoom avant',
    ZoomOut: 'Zoom arrière',
    ZoomReset: 'Ajuster au cadre',
    ZoomViewportLabel: 'Diagramme zoomable\u00a0: + et − zooment, les flèches déplacent, 0 l’ajuste au cadre',
    AltTextLabel: 'Texte de remplacement',
    AltTextDescription:
      'Décrit le diagramme pour les lecteurs d’écran. Vide\u00a0: «\u00a0Diagramme de processus\u00a0».',
    AboutGroupName: 'À propos',
    RepositoryLinkText: 'Code source et documentation sur GitHub',
    VersionText: 'Version {0}',

    LinkErrorEmpty: 'Coller le lien de l’onglet «\u00a0Image simple\u00a0» du diagramme.',
    LinkErrorUnsupported:
      'Ce lien ne provient pas d’un outil de processus pris en charge. Coller le lien de l’onglet «\u00a0Image simple\u00a0» de SAP Signavio.',
    LinkErrorNotUrl: 'Ce n’est pas un lien complet — il doit commencer par https://.',
    LinkErrorNotHttps: 'Seuls les liens sécurisés commençant par https:// sont pris en charge.',
    LinkErrorUnknownHost:
      'Cette adresse Signavio n’est pas prise en charge. Coller le lien tel qu’il a été copié depuis Signavio.',
    LinkErrorEmbedCode:
      'Il s’agit du code d’incorporation. Dans Signavio, ouvrir Partager → Incorporer un diagramme et copier plutôt le lien de l’onglet «\u00a0Image simple\u00a0».',
    LinkErrorNotImageLink:
      'Ce n’est pas un lien d’image. Dans Signavio, ouvrir Partager → Incorporer un diagramme et copier le lien de l’onglet «\u00a0Image simple\u00a0».',
    LinkErrorMissingAuthKey:
      'Il manque la clé d’accès dans ce lien. Copier le lien complet depuis l’onglet «\u00a0Image simple\u00a0» de Signavio.',
    LinkErrorInvalidModelId:
      'L’identifiant du diagramme dans ce lien n’est pas valide. Copier à nouveau le lien depuis Signavio.',
    LinkErrorInvalidAuthKey: 'La clé d’accès de ce lien n’est pas valide. Copier à nouveau le lien depuis Signavio.',

    DimensionErrorInvalidWidth:
      'Saisir des pixels (p.\u00a0ex. 800) ou un pourcentage de la colonne (p.\u00a0ex. 50\u00a0%), ou laisser vide pour automatique.',
    DimensionErrorInvalidHeight: 'Saisir des pixels (p.\u00a0ex. 600) ou laisser vide pour automatique.',
    DimensionErrorTooLarge: 'Le maximum est de {0} pixels.',
    DimensionErrorPercentOutOfRange: 'Utiliser un pourcentage de 1\u00a0% à 100\u00a0%.',
    DimensionErrorPercentHeight:
      'La hauteur ne peut pas être un pourcentage — saisir des pixels ou laisser vide pour automatique.'
  };
});
