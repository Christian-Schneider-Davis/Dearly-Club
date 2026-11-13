/*
 * Ariane's photo library (supplied 12 Nov 2026), resized to max 2400px.
 * vite-imagetools turns each file into responsive WebP + JPEG versions at
 * build time. Use with <ResponsiveImage image={images.heroWide} />.
 */
const pictures = import.meta.glob('./*.jpg', {
  eager: true,
  import: 'default',
  query: { w: '640;1200;1920', format: 'webp;jpg', quality: '72', as: 'picture' },
})

// file name → alt text (describe what's in the photo, for screen readers)
const library = {
  'envelope-illustration': 'Engraved illustration of an open envelope holding a card',
  'ariane-painting': 'Ariane at her table with watercolour paints',
  'ariane-portrait': 'Portrait of Ariane, founder of Dearly Club',
  'blue-watercolour-palo-santo': 'Blue watercolour card with palo santo on a burgundy Dearly Club envelope',
  'blue-watercolour-sunglasses': 'Blue watercolour postcard with stickers, sunglasses and a pen',
  'letter-flower-sketch': 'Handwritten letter with a flower sketch and a pen beside a Dearly Club envelope',
  'poppy-card-pen': 'Watercolour poppy card and pen on a Dearly Club envelope',
  'poppy-card-pen-2': 'Watercolour poppy card and pen on a Dearly Club envelope',
  'poppy-camera-wide': 'Watercolour poppy card beside a film camera on a wooden desk',
  'poppy-camera-wide-2': 'Watercolour poppy card, envelope and film camera',
  'poppy-camera-1': 'Watercolour poppy card with a film camera and envelope',
  'poppy-camera-2': 'Watercolour poppy card with a film camera and envelope',
  'poppy-camera-3': 'Watercolour poppy card with a film camera and envelope',
  'flower-card-palo-santo': 'Hand-painted flower card with pressed flowers and palo santo',
  'flower-card-pressed-flowers': 'Hand-painted flower card with pressed flowers on a Dearly Club envelope',
  'flower-card-pressed-flowers-2': 'Hand-painted flower card with pressed flowers on a Dearly Club envelope',
  'kraft-envelope-pressed-flowers': 'Kraft envelope, pressed flower stickers and a pen on a burgundy envelope',
  'watercolour-market-bag': 'Watercolour card in a market bag with lemons',
  'watercolour-market-bag-2': 'Watercolour card and envelope in a market bag with lemons',
  'shape-of-the-year-wide': 'Dearly Club letters and hand-painted cards on a wooden desk with a plant',
  'shape-of-the-year-plant': 'Hand-painted cards and "The Shape of This Year" letter under a plant',
  'shape-of-the-year-plant-2': 'Hand-painted cards and "The Shape of This Year" letter under a plant',
  'shape-of-the-year-3': 'Hand-painted cards and "The Shape of This Year" letter on an envelope',
  'purple-watercolour-1': 'Purple watercolour card and letter tucked in a burgundy envelope',
  'purple-watercolour-2': 'Purple watercolour card and letter tucked in a burgundy envelope',
  'purple-watercolour-3': 'Purple watercolour card, letter and stickers in a burgundy envelope',
  'purple-watercolour-4': 'Purple watercolour card, letter and stickers in a burgundy envelope',
}

const toKey = (name) => name.replace(/-(\w)/g, (_, c) => c.toUpperCase())

export const images = Object.fromEntries(
  Object.entries(library).map(([file, alt]) => {
    const picture = pictures[`./${file}.jpg`]
    if (!picture) throw new Error(`Missing image: ${file}.jpg`)
    return [toKey(file), { ...picture, alt }]
  }),
)

// Where each photo is used (approved mockup)
export const roles = {
  heroWide: images.shapeOfTheYearWide,
  heroTall: images.shapeOfTheYearPlant2,
  why: images.blueWatercolourPaloSanto,
  founder: images.arianePortrait,
  newsletter: images.envelopeIllustration,
  gallery: [
    images.flowerCardPressedFlowers,
    images.poppyCardPen,
    images.watercolourMarketBag,
    images.blueWatercolourSunglasses,
  ],
}
