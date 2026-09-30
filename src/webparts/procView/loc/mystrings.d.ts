declare interface IProcViewWebPartStrings {
  PropertyPaneDescription: string;
  NotConfiguredMessage: string;

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
