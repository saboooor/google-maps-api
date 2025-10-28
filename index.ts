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

  // clean up the reviews data
  response[0].reviews = response[0].reviews?.map((review) => ({
    ...review,
    originalText: null,
  }));

  return {
    ...response[0],
    lastUpdated,
  };
}

// cache place details in memory - no need for a json file for this simple use case
let details: Awaited<ReturnType<typeof fetchPlaceDetails>>;
let lastUpdated: Date;

const app = express();
const port = 3000;

app.use(cors({
  origin: ORIGIN?.startsWith('/^') ? new RegExp(ORIGIN.slice(2, -1)) : ORIGIN || '*',
  methods: ['GET'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.get('/', (req, res) => {
  res.send('hi :)');
});

app.get('/details', async (req, res) => {
  // check for additional fieldMask parameters in the query
  if (!lastUpdated || lastUpdated < new Date(Date.now() - 60 * 60 * 1000)) {
    details = await fetchPlaceDetails();
    lastUpdated = new Date();
  }

  res.send(details);
});

app.listen(port, () => {
  console.log(`Google Maps API listening on port ${port}`);
});