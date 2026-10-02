# Changelog

All notable changes to this web part. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html). New entries go under "Unreleased";
`just release x.y.z` turns that section into the release's section (README "Versioning and
releases").

## [Unreleased]

### Added

- Process diagrams from SAP Signavio on modern SharePoint pages: paste the "Simple image" link
  of a shared diagram, and the web part shows the image directly — no iframe, no sign-in for
  readers; the embed code and other links are rejected with a hint
- Size: width in pixels or percent of the column, height in pixels, or automatic — never wider
  than the column, never distorted; a narrower diagram is aligned left, centred (default) or
  right
- Alternative text for screen readers and an optional caption with its own alignment
- Optional link to the interactive diagram in the SAP Signavio Collaboration Hub, below the
  diagram or on it
- Optional zoom and pan — buttons, Ctrl/Cmd + mouse wheel, keyboard, two-finger pinch — and a
  full-screen view (on by default)
- A colour behind the transparent diagram (on by default, white), on the page and in full
  screen
- Messages for editors with the cause and a "Configure" button; short messages for readers
- Colours from the site and section theme; in Microsoft Teams channel tabs the Teams theme
  (dark, high contrast)
- Texts in English, German, French and Spanish
- Accessibility: everything works with the keyboard, with a visible focus outline; screen
  readers get the alternative text and hear that links to Signavio open a new tab; Windows
  high-contrast mode and "reduce motion" are respected
- Privacy: no cookies, no telemetry, no API of its own; image requests and the Collaboration
  Hub link send no referrer, so SAP Signavio does not learn which page embeds the diagram
- The link to this repository and the version at the end of the property pane
- Own Microsoft Teams app icons
