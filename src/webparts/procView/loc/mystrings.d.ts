declare interface IProcViewWebPartStrings {
  PropertyPaneDescription: string;
  NotConfiguredMessage: string;
  DefaultAltText: string;

  DiagramGroupName: string;
  ImageLinkLabel: string;
  ImageLinkDescription: string;
  NaturalSizeKnown: string;
  NaturalSizeUnknown: string;
  CaptionGroupName: string;
  CaptionLabel: string;
  CaptionDescription: string;
  CaptionAlignLabel: string;
  AlignLeft: string;
  AlignCenter: string;
  AlignRight: string;
  HubLinkGroupName: string;
  ShowHubLinkLabel: string;
  ToggleOn: string;
  ToggleOff: string;
  HubLinkTextLabel: string;
  HubLinkTextDescription: string;
  HubLinkDefaultText: string;
  HubLinkAlignLabel: string;
  HubLinkPositionLabel: string;
  PositionBelow: string;
  PositionOverlay: string;
  NewTabHint: string;

  MessageNoLinkTitle: string;
  MessageNoLinkBody: string;
  MessageInvalidLinkTitle: string;
  MessageUnavailableReader: string;
  MessageLoadFailedTitle: string;
  MessageLoadFailedCauses: string;
  MessageLoadFailedReader: string;
  CauseSharingRevoked: string;
  CauseLinkIncorrect: string;
  CauseDomainBlocked: string;
  MessageBlockedTitle: string;
  MessageBlockedBody: string;
  ConfigureButton: string;
  SizeGroupName: string;
  WidthLabel: string;
  WidthDescription: string;
  HeightLabel: string;
  HeightDescription: string;
  ViewingGroupName: string;
  OfferZoomLabel: string;
  OfferFullScreenLabel: string;
  FullScreen: string;
  CloseFullScreen: string;
  ZoomIn: string;
  ZoomOut: string;
  ZoomReset: string;
  ZoomViewportLabel: string;
  AccessibilityGroupName: string;
  AltTextLabel: string;
  AltTextDescription: string;
  AboutGroupName: string;
  RepositoryLinkText: string;

  LinkErrorEmpty: string;
  LinkErrorUnsupported: string;
  LinkErrorNotUrl: string;
  LinkErrorNotHttps: string;
  LinkErrorUnknownHost: string;
  LinkErrorEmbedCode: string;
  LinkErrorNotImageLink: string;
  LinkErrorMissingAuthKey: string;
  LinkErrorInvalidModelId: string;
  LinkErrorInvalidAuthKey: string;

  DimensionErrorInvalidWidth: string;
  DimensionErrorInvalidHeight: string;
  DimensionErrorTooLarge: string;
  DimensionErrorPercentOutOfRange: string;
  DimensionErrorPercentHeight: string;
}

declare module 'ProcViewWebPartStrings' {
  const strings: IProcViewWebPartStrings;
  export = strings;
}
