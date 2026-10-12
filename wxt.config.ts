import { defineConfig } from 'wxt';

export default defineConfig({
  manifestVersion: 3,
  manifest: ({ browser }) => ({
    name: 'Page Tint',
    description: 'Sayfanın parlaklığını, kontrastını ve rengini sadece o sekmede ya da pencerede ayarla.',
    permissions: ['storage', 'scripting'],
    host_permissions: ['<all_urls>'],
    action: { default_title: 'Page Tint' },
    commands: {
      'toggle-tint': {
        suggested_key: { default: 'Alt+Shift+L' },
        description: 'Bu sekmede aç / kapat',
      },
    },
    ...(browser === 'firefox' && {
      browser_specific_settings: {
        gecko: { id: 'page-tint@ak1nttr', data_collection_permissions: { required: ['none'] } },
      },
    }),
  }),
});
