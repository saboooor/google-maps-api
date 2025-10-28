import express from 'express';
import cors from 'cors';
import { PlacesClient } from '@googlemaps/places';

// check for required environment variables
const requiredEnvVars = ['GOOGLE_MAPS_API_KEY', 'PLACE_ID', 'ORIGIN'] as const;
const { GOOGLE_MAPS_API_KEY, PLACE_ID, ORIGIN } = Object.fromEntries(
  requiredEnvVars.map((key) => {
    const value = process.env[key];
    if (!value) throw new Error(`${key} environment variable is not set.`);
    return [key, value];
  }),
) as Record<(typeof requiredEnvVars)[number], string>;

const fieldMask = [
  'reviews',
  'userRatingCount',
  'currentOpeningHours',
  'regularOpeningHours',
];

// initialize Google Maps Places client
const placesClient = new PlacesClient({
  apiKey: GOOGLE_MAPS_API_KEY,
});

// function to fetch place details
async function fetchPlaceDetails() {
  const response = await placesClient.getPlace({
    name: `places/${PLACE_ID}`,
  }, {
    otherArgs: {
      headers: {
        'x-Goog-FieldMask': fieldMask.join(','),
      },
    },
  });

  if (!response) {
    throw new Error('No response from Places API');
  }

  return {
    ...response[0],
    lastUpdated,
  };
}

// cache place details in memory - no need for a json file for this simple use case
let details: Awaited<ReturnType<typeof fetchPlaceDetails>>;
let lastUpdated: Date;

// set up Express server
const app = express();
const port = process.env.PORT || 3000;

// configure CORS for specified origin so that only our frontend can access the API
app.use(cors({
  origin: ORIGIN?.startsWith('/^') ? new RegExp(ORIGIN.slice(2, -1)) : ORIGIN || '*',
  methods: ['GET'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// friendly greeting at root endpoint (for health checks, etc.)
app.get('/', (req, res) => {
  res.send('hi :)');
});

// endpoint to get place details
app.get('/details', async (req, res) => {
  // serve from cache if data is less than 1 hour old
  if (lastUpdated > new Date(Date.now() - 60 * 60 * 1000) && details) return res.send(details);

  try {
    // fetch fresh details from Places API
    details = await fetchPlaceDetails();
    lastUpdated = new Date();
  } catch (error) {
    // log error and serve stale data if available
    console.error('Error fetching place details:', error);

    if (!details) return res.status(500).send({
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    console.log('Serving stale data from cache.');
    return res.send({
      details,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // send fresh details
  res.send(details);
});

// start the server
app.listen(port, () => {
  console.log(`Google Maps API listening on port ${port}`);
});