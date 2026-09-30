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
  SizeGroupName: string;
  WidthLabel: string;
  WidthDescription: string;
  HeightLabel: string;
  HeightDescription: string;
  AccessibilityGroupName: string;
  AltTextLabel: string;
  AltTextDescription: string;

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
