import { defineConfig } from 'vite';

const repository = process.env.GITHUB_REPOSITORY?.split('/')[1];
const isUserOrOrganizationSite = repository?.toLowerCase().endsWith('.github.io');
const base = process.env.GITHUB_ACTIONS === 'true' && repository && !isUserOrOrganizationSite
  ? '/' + repository + '/'
  : '/';

export default defineConfig({ base });
