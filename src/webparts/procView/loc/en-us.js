define([], function () {
  return {
    PropertyPaneDescription: 'Shows a process diagram from a shared link.',
    NotConfiguredMessage: 'No process diagram is configured yet.',

    LinkErrorEmpty: 'Paste the diagram\'s "Simple image" link.',
    LinkErrorUnsupported:
      'This link is not from a supported process tool. Paste the "Simple image" link from SAP Signavio.',
    LinkErrorNotUrl: 'This is not a complete link — it must start with https://.',
    LinkErrorNotHttps: 'Only secure links starting with https:// are supported.',
    LinkErrorUnknownHost: 'This Signavio address is not supported. Paste the link exactly as copied from Signavio.',
    LinkErrorEmbedCode:
      'This is the embed code. In Signavio, open Share → Embed diagram and copy the link from the "Simple image" tab instead.',
    LinkErrorNotImageLink:
      'This is not an image link. In Signavio, open Share → Embed diagram and copy the link from the "Simple image" tab.',
    LinkErrorMissingAuthKey:
      'The link is missing its access key. Copy the complete link from the "Simple image" tab in Signavio.',
    LinkErrorInvalidModelId: 'The diagram id in this link is invalid. Copy the link again from Signavio.',
    LinkErrorInvalidAuthKey: 'The access key in this link is invalid. Copy the link again from Signavio.',

    DimensionErrorInvalidWidth:
      'Enter pixels (e.g. 800), a percentage of the column (e.g. 50%), or leave empty for automatic.',
    DimensionErrorInvalidHeight: 'Enter pixels (e.g. 600) or leave empty for automatic.',
    DimensionErrorTooLarge: 'The maximum is 10000 pixels.',
    DimensionErrorPercentOutOfRange: 'Use a percentage from 1% to 100%.',
    DimensionErrorPercentHeight: 'The height cannot be a percentage — enter pixels or leave empty for automatic.'
  };
});
