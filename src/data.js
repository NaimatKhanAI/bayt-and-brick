export const categories = [
  {
    slug: 'studio',
    label: 'Studio',
    plural: 'Studios',
    shortCode: 'ST',
    image: '/assets/studio.webp',
    galleryImage: '/assets/studio-kitchen.webp',
    price: 1350,
    description: 'Efficient layouts with practical storage and easy upkeep.',
    tagline: 'A private, practical base close to University City.',
    size: '410-520 sq ft',
  },
  {
    slug: '1-bhk',
    label: '1 BHK',
    plural: '1 BHK homes',
    shortCode: '1B',
    image: '/assets/one-bhk.webp',
    galleryImage: '/assets/one-bhk-bedroom.webp',
    price: 2150,
    description: 'Separate bedroom, comfortable living area and closed kitchen.',
    tagline: 'More privacy and room for everyday living.',
    size: '680-820 sq ft',
  },
  {
    slug: '2-bhk',
    label: '2 BHK',
    plural: '2 BHK homes',
    shortCode: '2B',
    image: '/assets/two-bhk.webp',
    galleryImage: '/assets/two-bhk-bedroom.webp',
    price: 2850,
    description: 'Two bedrooms and a flexible layout for couples or families.',
    tagline: 'A well-proportioned home for longer stays.',
    size: '980-1,240 sq ft',
  },
]

const listingNames = {
  studio: ['Furnished studio near University City', 'Studio with separate kitchen', 'Quiet studio with open view'],
  '1-bhk': ['Bright 1 BHK with separate bedroom', 'Unfurnished 1 BHK near Al Zahia', 'Furnished 1 BHK with dining area'],
  '2-bhk': ['Family 2 BHK with generous living room', 'Unfurnished 2 BHK with balcony', 'Furnished 2 BHK near University City'],
}

const variations = [
  { offset: 0, furnished: true, floor: '3rd floor', available: 'Available now' },
  { offset: 250, furnished: false, floor: '5th floor', available: 'Available from 22 Sep' },
  { offset: 420, furnished: true, floor: '2nd floor', available: 'Viewing by appointment' },
]

export const listingsFor = (category) => {
  const gallery = [category.image, category.galleryImage, '/assets/hero-apartment.webp']

  return variations.map((item, index) => ({
    ...item,
    id: `${category.slug}-${index + 1}`,
    reference: `BB-${category.shortCode}-${101 + index}`,
    name: listingNames[category.slug][index],
    category: category.label,
    slug: category.slug,
    image: gallery[index],
    images: gallery,
    video: '',
    location: ['Muwaileh, Sharjah', 'Al Nahda, Sharjah', 'Dubai Marina, Dubai'][index],
    area: ['Muwaileh', 'Al Nahda', 'Dubai Marina'][index],
    price: category.price + item.offset,
    size: category.size,
    leaseTerm: '12-month lease',
    crop: ['center', 'center', '58% center'][index],
  }))
}

export const allListings = categories.flatMap(listingsFor)

export const getCategory = (slug) => categories.find((category) => category.slug === slug)
export const getListing = (id) => allListings.find((listing) => listing.id === id)
