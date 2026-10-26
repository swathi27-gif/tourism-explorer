
import express from 'express';
import cors from 'cors';
import { httpServerHandler } from 'cloudflare:node';
import { env } from 'cloudflare:workers';

const app = express();

app.use(express.json());

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  env.DEV_DOMAIN,
  env.STAGING_DOMAIN,
  env.PROD_DOMAIN,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  })
);

app.get('/api/message', (req, res) => {
  res.json({ message: 'Hello from Express on Workers!' });
});

app.get('/api/hello/:name', (req, res) => {
  res.json({
    message: `Hello, ${req.params.name} ${env.ENVIRONMENT || 'unknown'}`,
  });
});

app.get('/api/tourism', async (req, res) => {
  const city = String(req.query.city || '').trim();
  const category = String(
    req.query.category || 'tourism.sights'
  ).trim();

  if (!city) {
    return res.status(400).json({
      error: 'Please enter a destination.',
    });
  }

  const allowedCategories = [
    'tourism.sights',
    'entertainment.museum',
    'natural',
  ];

  if (!allowedCategories.includes(category)) {
    return res.status(400).json({
      error: 'Unsupported attraction category.',
    });
  }

  const apiKey = env.GEOAPIFY_API_KEY;

  if (!apiKey) {
    return res.status(503).json({
      error: 'GEOAPIFY_API_KEY is missing from the backend environment.',
    });
  }

  try {
    // Find the destination.
    const geocodeUrl = new URL(
      'https://api.geoapify.com/v1/geocode/search'
    );

    geocodeUrl.searchParams.set('text', city);
    geocodeUrl.searchParams.set('format', 'json');
    geocodeUrl.searchParams.set('limit', '10');
    geocodeUrl.searchParams.set('apiKey', apiKey);

    const geoResponse = await fetch(geocodeUrl);

    if (!geoResponse.ok) {
      throw new Error(`Geocoding failed: HTTP ${geoResponse.status}`);
    }

    const geoData = await geoResponse.json();
    const results = geoData.results || [];

    if (results.length === 0) {
      return res.status(404).json({
        error: `No location found for "${city}". Try New Delhi, India.`,
      });
    }

    const normalize = (value) =>
      String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const requested = normalize(city);
    const requestedParts = requested.split(' ').filter(Boolean);

    const location =
      results.find((result) => {
        const fields = [
          result.city,
          result.locality,
          result.name,
          result.formatted,
        ].map(normalize);

        return (
          fields.includes(requested) ||
          (requestedParts.length > 1 &&
            requestedParts.every((part) =>
              fields.some((field) => field.includes(part))
            ))
        );
      }) || results[0];

    if (
      typeof location.lat !== 'number' ||
      typeof location.lon !== 'number'
    ) {
      return res.status(404).json({
        error: 'Could not find destination coordinates.',
      });
    }

    // Fetch nearby attractions.
    const placesUrl = new URL(
      'https://api.geoapify.com/v2/places'
    );

    placesUrl.searchParams.set('categories', category);
    placesUrl.searchParams.set(
      'filter',
      `circle:${location.lon},${location.lat},10000`
    );
    placesUrl.searchParams.set('limit', '20');
    placesUrl.searchParams.set('apiKey', apiKey);

    const placesResponse = await fetch(placesUrl);

    if (!placesResponse.ok) {
      throw new Error(`Attraction search failed: HTTP ${placesResponse.status}`);
    }

    const placesData = await placesResponse.json();

    const places = (placesData.features || [])
      .map((feature) => {
        const properties = feature.properties || {};
        const coordinates = feature.geometry?.coordinates || [];

        return {
          place_id: properties.place_id || '',
          name: properties.name || '',
          address: properties.formatted || '',
          category:
            properties.categories?.join(', ') || 'Attraction',
          description:
            properties.datasource?.raw?.description || '',
          lat: properties.lat ?? coordinates[1] ?? null,
          lon: properties.lon ?? coordinates[0] ?? null,
        };
      })
      .filter((place) => place.name);

    return res.json({
      destination: {
        name:
          location.city ||
          location.locality ||
          location.name ||
          city,
        address: location.formatted || '',
        lat: location.lat,
        lon: location.lon,
      },
      places,
      total: places.length,
    });
  } catch (error) {
    console.error('Tourism API error:', error);

    return res.status(502).json({
      error: 'Unable to fetch attractions. Please try again.',
    });
  }
});

app.listen(3000);

export default httpServerHandler({ port: 3000 });
