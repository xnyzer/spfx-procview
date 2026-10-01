define([], function () {
  return {
    PropertyPaneDescription: 'Shows a process diagram from a shared link.',
    NotConfiguredMessage: 'No process diagram is configured yet.',
    DefaultAltText: 'Process diagram',

    DiagramGroupName: 'Diagram',
    ImageLinkLabel: 'Image link',
    ImageLinkDescription: 'In Signavio: Share → Embed diagram → tab "Simple image" → copy the link.',
    NaturalSizeKnown: 'Maximum size: {0} × {1} px',
    NaturalSizeUnknown: 'Maximum size: shown once the diagram has loaded.',
    CaptionGroupName: 'Caption',
    CaptionLabel: 'Text',
    CaptionDescription: 'Shown below the diagram. Leave empty for no caption.',
    CaptionAlignLabel: 'Alignment',
    AlignLeft: 'Align left',
    AlignCenter: 'Center',
    AlignRight: 'Align right',
    HubLinkGroupName: 'Collaboration Hub link',
    ShowHubLinkLabel: 'Show link to the Collaboration Hub',
    ToggleOn: 'On',
    ToggleOff: 'Off',
    HubLinkTextLabel: 'Link text',
    HubLinkTextDescription: 'Empty: "Open in Signavio". Readers need access to SAP Signavio to open it.',
    HubLinkDefaultText: 'Open in Signavio',
    HubLinkAlignLabel: 'Alignment',
    HubLinkPositionLabel: 'Position',
    PositionBelow: 'Below the diagram',
    PositionOverlay: 'On the diagram, bottom right',
    NewTabHint: '(opens in a new tab)',

    MessageNoLinkTitle: 'Add a process diagram',
    MessageNoLinkBody:
      'In SAP Signavio, open Share → Embed diagram, copy the link from the "Simple image" tab and paste it into the settings of this web part.',
    MessageInvalidLinkTitle: 'This link cannot be displayed',
    MessageUnavailableReader: 'The diagram is currently unavailable.',
    MessageLoadFailedTitle: 'The diagram could not be loaded',
    MessageLoadFailedCauses: 'Possible causes:',
    MessageLoadFailedReader: 'The diagram could not be loaded.',
    CauseSharingRevoked: 'The read-only sharing of the diagram was turned off in SAP Signavio.',
    CauseLinkIncorrect: 'The link is incomplete or outdated — copy it again from the "Simple image" tab.',
    CauseDomainBlocked:
      'Your network, firewall or proxy blocks the SAP Signavio domain — ask your IT department to allow it.',
    MessageBlockedTitle: 'Images from {0} are blocked',
    MessageBlockedBody:
      'A security policy of this site prevents loading the diagram from {0}. Ask your SharePoint administrator to allow this domain.',
    ConfigureButton: 'Configure',
    SizeGroupName: 'Size',
    WidthLabel: 'Width',
    WidthDescription:
      'Pixels (e.g. 800), percent of the column (e.g. 50%), or empty for automatic. Never wider than the column.',
    HeightLabel: 'Height',
    HeightDescription: 'Pixels (e.g. 600) or empty for automatic. The diagram keeps its proportions.',
    ViewingGroupName: 'Viewing',
    OfferZoomLabel: 'Offer zoom',
    OfferFullScreenLabel: 'Offer full screen',
    ShowBackgroundLabel: 'Background behind the diagram',
    BackgroundColorLabel: 'Background color',
    FullScreen: 'Full screen',
    CloseFullScreen: 'Close',
    ZoomIn: 'Zoom in',
    ZoomOut: 'Zoom out',
    ZoomReset: 'Fit to frame',
    ZoomViewportLabel: 'Zoomable diagram: + and − zoom, arrow keys move, 0 fits it to the frame',
    AccessibilityGroupName: 'Accessibility',
    AltTextLabel: 'Alternative text',
    AltTextDescription: 'Describes the diagram for screen readers. Empty: "Process diagram".',
    AboutGroupName: 'About',
    RepositoryLinkText: 'Source code and documentation on GitHub',

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
