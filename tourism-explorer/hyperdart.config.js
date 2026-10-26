
import pkg from './package.json' with { type: 'json' };

export default {
  name: pkg.name,

  triggers: {
    keywords: [
      "tourism",
      "tourist attractions",
      "tourist places",
      "places to visit",
      "things to do",
      "travel explorer",
      "travel guide",
      "travel",
      "explore",
      "destination",
      "destinations",
      "landmarks",
      "historic sites",
      "historical places",
      "museums",
      "nature attractions",
      "attractions in",
      "places in",
      "tourist spots",
      "what to see in"
    ]
  },

  query_format: {
    regex: [
      "tourist attractions in .+",
      "tourist places in .+",
      "places to visit in .+",
      "things to do in .+",
      "tourism in .+",
      "travel guide to .+",
      "explore .+",
      "attractions in .+",
      "landmarks in .+",
      "museums in .+",
      "historic sites in .+",
      "historical places in .+",
      "nature attractions in .+",
      "tourist spots in .+",
      "what to see in .+",
      "places in .+"
    ]
  },

  server: {
    location: 'dist/backend/index.js',
    configPath: 'dist/backend/wrangler.jsonc',
    schemaPath: 'dist/backend/schema.jsonc'
  },

  client: {
    location: pkg.module,
    moduleName: pkg.umdName || 'HD' + pkg.name,
    baseURL: '/' + pkg.name
  },

  format: {
    mainline: true,
    sidebar: true
  },

  permissions: {},

  info: {
    description:
      'Discover tourist attractions, historical sites, museums and nature spots in any destination.'
  },

  github: '',
  demovideo: ''
};
