import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'trendzip',
  brand: {
    primaryColor: '#3182F6',
  },
  webView: {
    allowsInlineMediaPlayback: true,
  },
  permissions: [],
  webBundleDir: 'dist',
});
