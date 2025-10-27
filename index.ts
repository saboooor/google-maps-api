import express from 'express';
import type { PlaceReview } from './types';

const requiredEnvVars = ['GOOGLE_MAPS_API_KEY', 'PLACE_ID'];
if (!process.env.GOOGLE_MAPS_API_KEY || !process.env.PLACE_ID) {
  for (const varName of requiredEnvVars) {
    if (!process.env[varName]) throw new Error(`${varName} environment variable is not set.`);
  }
}

const { GOOGLE_MAPS_API_KEY, PLACE_ID } = process.env;

async function getPlaceDetails() {
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?place_id=${PLACE_ID}&key=${GOOGLE_MAPS_API_KEY}`,
  );
  const data = await res.json() as {
    result: {
      reviews: PlaceReview[];
    };
  };
  return data.result.reviews;
}

const reviews = await getPlaceDetails();
console.log('Place Reviews:', reviews);

const app = express();
const port = 3000;

app.get('/reviews', (req, res) => {
  res.send({
    reviews: reviews,
  });
});

app.listen(port, () => {
  console.log(`Google Maps API listening on port ${port}`);
});