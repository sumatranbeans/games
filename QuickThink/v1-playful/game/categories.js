// Quick Think - Category Lists
// Organized by type for variety in gameplay

const categories = {
  objects: [
    "Things in a kitchen",
    "Round things",
    "Things with wheels",
    "Things that are soft",
    "Things made of metal",
    "Things you find at the beach",
    "Things in a classroom",
    "Things that make noise",
    "Things you wear",
    "Things in a toolbox",
    "Things at a playground",
    "Things in a bathroom",
    "Things that grow",
    "Things you plug in",
    "Things in a hospital"
  ],
  colors: [
    "Things that are RED",
    "Things that are BLUE",
    "Things that are GREEN",
    "Yellow foods",
    "Orange things",
    "Purple things",
    "Pink things",
    "White things",
    "Black things",
    "Brown animals"
  ],
  places: [
    "Countries in Europe",
    "Cities in America",
    "Beach destinations",
    "Mountain locations",
    "Famous landmarks",
    "Places to eat",
    "Places to shop",
    "Cold places",
    "Hot places",
    "Places to visit"
  ],
  people: [
    "Famous scientists",
    "Cartoon characters",
    "Superheroes",
    "Historical figures",
    "Musicians",
    "Athletes",
    "Movie stars",
    "Book characters",
    "Inventors",
    "Artists"
  ],
  abstract: [
    "Things that make you happy",
    "Reasons to celebrate",
    "Things that are scary",
    "Things that are funny",
    "Things you're grateful for",
    "Things you dream about",
    "Childhood memories",
    "Things you do for fun",
    "Things that smell good",
    "Things that taste sweet"
  ],
  actions: [
    "Things you do in the morning",
    "Sports",
    "Hobbies",
    "Dance moves",
    "Things you do outside",
    "Things you do on vacation",
    "Things you do at a party",
    "Things you do quietly",
    "Things you do fast",
    "Things you do slowly"
  ],
  popCulture: [
    "Disney movies",
    "Video games",
    "TV shows",
    "Song titles",
    "Board games",
    "Social media apps",
    "Ice cream flavors",
    "Pizza toppings",
    "Breakfast foods",
    "Desserts"
  ]
};

// Get all categories as a flat array
function getAllCategories() {
  return Object.values(categories).flat();
}

// Get a random category
function getRandomCategory(usedCategories = []) {
  const all = getAllCategories();
  const available = all.filter(cat => !usedCategories.includes(cat));

  if (available.length === 0) {
    // If all categories used, reset
    return all[Math.floor(Math.random() * all.length)];
  }

  return available[Math.floor(Math.random() * available.length)];
}

// Get categories for a full game
function getCategoriesForGame(roundCount) {
  const all = getAllCategories();
  const shuffled = all.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, roundCount);
}

module.exports = {
  categories,
  getAllCategories,
  getRandomCategory,
  getCategoriesForGame
};
