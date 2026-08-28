import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

import { Colors } from '@/constants/theme';

// experiments.baseUrl, inlined at bundle time; unset under jest.
const baseUrl = process.env.EXPO_BASE_URL ?? '';

// The static HTML shell around every web page. Metro emits no web manifest,
// so the installable-app metadata (Safari's Add to Dock) is linked here.
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta
          name="theme-color"
          media="(prefers-color-scheme: light)"
          content={Colors.light.background}
        />
        <meta
          name="theme-color"
          media="(prefers-color-scheme: dark)"
          content={Colors.dark.background}
        />
        <link rel="manifest" href={`${baseUrl}/manifest.json`} />
        <link rel="apple-touch-icon" href={`${baseUrl}/icons/apple-touch-icon.png`} />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
