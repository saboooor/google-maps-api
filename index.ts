import express from 'express';
import cors from 'cors';
import { PlacesClient } from '@googlemaps/places';

// check for required environment variables
const requiredEnvVars = ['GOOGLE_MAPS_API_KEY', 'ALLOWED_PLACE_IDS', 'ORIGIN', 'FIELD_MASK'] as const;
const { GOOGLE_MAPS_API_KEY, ALLOWED_PLACE_IDS, ORIGIN, FIELD_MASK } = Object.fromEntries(
  requiredEnvVars.map((key) => {
    const value = process.env[key];
    if (!value) throw new Error(`${key} environment variable is not set.`);
    return [key, value];
  }),
) as Record<(typeof requiredEnvVars)[number], string>;

const allowedPlaceIds = ALLOWED_PLACE_IDS.split(',');

// initialize Google Maps Places client
const placesClient = new PlacesClient({
  apiKey: GOOGLE_MAPS_API_KEY,
});

// function to fetch place details
async function fetchPlaceDetails(placeId: string) {
  const response = await placesClient.getPlace({
    name: `places/${placeId}`,
  }, {
    otherArgs: {
      headers: {
        'x-Goog-FieldMask': FIELD_MASK,
      },
    },
  });

  if (!response) {
    throw new Error('No response from Places API');
  }

  return {
    ...response[0],
    lastUpdated: new Date(),
  };
}

// cache place details in memory - no need for a json file for this simple use case
const details: {
  [key: string]: Awaited<ReturnType<typeof fetchPlaceDetails>>;
} = {};

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
  // validate placeId
  const placeId = req.query.placeId as string;
  if (!placeId || !allowedPlaceIds.includes(placeId)) {
    return res.status(403).send({ error: 'Forbidden: Invalid or missing placeId' });
  }

  // serve from cache if data is less than 1 hour old
  if (details[placeId] && details[placeId].lastUpdated > new Date(Date.now() - 60 * 60 * 1000)) {
    console.debug('Serving data from cache.');
    return res.send(details[placeId]);
  }

  try {
    // fetch fresh details from Places API
    details[placeId] = await fetchPlaceDetails(placeId);
  } catch (error) {
    // log error and serve stale data if available
    console.error('Error fetching place details:', error);

    if (!details[placeId]) return res.status(500).send({
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    console.log('Serving stale data from cache.');
    return res.send({
      ...details[placeId],
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // send fresh details
  console.debug('Serving fresh data from Places API.');
  res.send(details[placeId]);
});

// start the server
app.listen(port, () => {
  console.log(`Google Maps API listening on port ${port}`);
});