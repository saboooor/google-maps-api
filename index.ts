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

  try {
    if (!details[placeId]) {
      details[placeId] = await fetchPlaceDetails(placeId);
    }

    const now = Date.now();
    console.log(now);

    const oneHourAgo = new Date(now - 60 * 60 * 1000);
    const recent = details[placeId].lastUpdated > oneHourAgo;

    const nextOpenTime = details[placeId].currentOpeningHours?.nextOpenTime?.seconds;
    const pastNextOpenTime = nextOpenTime && Number(nextOpenTime) * 1000 < now;

    const nextCloseTime = details[placeId].currentOpeningHours?.nextCloseTime?.seconds;
    const pastNextCloseTime = nextCloseTime && Number(nextCloseTime) * 1000 - (15 * 60 * 1000) < now;

    // serve from cache if data is less than 1 hour old
    if (recent && !pastNextOpenTime && !pastNextCloseTime) {
      console.debug('Serving cached data');
      return res.send(details[placeId]);
    }

    if (pastNextCloseTime || pastNextOpenTime) {
      console.debug('Opening hours changed, refreshing data from Places API.');
    }

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