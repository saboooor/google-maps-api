import express from 'express';
import cors from 'cors';
import { PlacesClient } from '@googlemaps/places';

const requiredEnvVars = ['GOOGLE_MAPS_API_KEY', 'PLACE_ID'];
if (!process.env.GOOGLE_MAPS_API_KEY || !process.env.PLACE_ID) {
  for (const varName of requiredEnvVars) {
    if (!process.env[varName]) throw new Error(`${varName} environment variable is not set.`);
  }
}

const { GOOGLE_MAPS_API_KEY, PLACE_ID, ORIGIN } = process.env;

const placesClient = new PlacesClient({
  apiKey: GOOGLE_MAPS_API_KEY!,
});
async function getPlaceDetails() {
  const response = await placesClient.getPlace({
    name: `places/${PLACE_ID}`,
  }, {
    otherArgs: {
      headers: {
        'x-Goog-FieldMask': 'reviews,userRatingCount,currentOpeningHours,regularOpeningHours',
      },
    },
  });

  if (!response) {
    throw new Error('No response from Places API');
  }

  console.log(response[0]);

  // clean up the reviews data
  response[0].reviews = response[0].reviews?.map((review) => ({
    ...review,
    originalText: null,
  }));

  return response[0];
}

const reviews = await getPlaceDetails();

const app = express();
const port = 3000;

app.use(cors({
  origin: ORIGIN?.startsWith('/^') ? new RegExp(ORIGIN.slice(2, -1)) : ORIGIN || '*',
  methods: ['GET'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.get('/', (req, res) => {
  res.send('hi pookie, how did you get here uwu');
});

app.get('/details', (req, res) => {
  res.send(reviews);
});

app.listen(port, () => {
  console.log(`Google Maps API listening on port ${port}`);
});