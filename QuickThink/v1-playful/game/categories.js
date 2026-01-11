// Quick Think - Category Lists with Difficulty Tiers
// Organized by type and difficulty for variety in gameplay

const categories = {
  // Easy categories - obvious answers, broad topics
  easy: {
    objects: [
      "Things in a kitchen",
      "Round things",
      "Things with wheels",
      "Things in a classroom",
      "Things you wear",
      "Things at the beach",
      "Things in a bathroom",
      "Things that are soft",
      "Things that make noise",
      "Things you plug in"
    ],
    colors: [
      "Things that are RED",
      "Things that are BLUE",
      "Things that are GREEN",
      "Yellow things",
      "White things",
      "Black things"
    ],
    food: [
      "Fruits",
      "Vegetables",
      "Desserts",
      "Pizza toppings",
      "Breakfast foods",
      "Things you drink",
      "Snacks",
      "Ice cream flavors"
    ],
    animals: [
      "Farm animals",
      "Pets",
      "Animals at the zoo",
      "Animals that swim",
      "Animals that fly",
      "Big animals"
    ],
    places: [
      "Countries",
      "Places to eat",
      "Places to shop",
      "Vacation destinations",
      "Places in a city"
    ],
    popCulture: [
      "Disney movies",
      "Superheroes",
      "Video games",
      "TV shows",
      "Cartoon characters"
    ]
  },

  // Medium categories - requires more thought
  medium: {
    objects: [
      "Things in a toolbox",
      "Things at a hospital",
      "Things at a playground",
      "Things made of metal",
      "Things that grow",
      "Things at a wedding",
      "Things in an office",
      "Things at a gym",
      "Things that float",
      "Things that spin"
    ],
    colors: [
      "Orange things",
      "Purple things",
      "Pink things",
      "Brown animals",
      "Things that glow",
      "Colorful things at a party"
    ],
    food: [
      "Spicy foods",
      "Foods from Italy",
      "Foods from Asia",
      "Things you bake",
      "Foods at a BBQ",
      "Street food",
      "Comfort foods"
    ],
    places: [
      "Countries in Europe",
      "Cities in America",
      "Mountain locations",
      "Famous landmarks",
      "Cold places",
      "Hot places",
      "Islands"
    ],
    people: [
      "Famous scientists",
      "Historical figures",
      "Musicians",
      "Athletes",
      "Movie stars",
      "Inventors"
    ],
    actions: [
      "Things you do in the morning",
      "Sports",
      "Hobbies",
      "Things you do outside",
      "Things you do on vacation",
      "Things you do at a party"
    ],
    popCulture: [
      "Song titles",
      "Board games",
      "Social media apps",
      "Things in Star Wars",
      "Things in Harry Potter",
      "90s things"
    ]
  },

  // Hard categories - obscure or abstract
  hard: {
    objects: [
      "Things in a laboratory",
      "Things at an airport",
      "Things in a museum",
      "Things that are transparent",
      "Things at a construction site",
      "Things from the 1800s",
      "Things that are fragile"
    ],
    abstract: [
      "Things that make you happy",
      "Reasons to celebrate",
      "Things that are scary",
      "Things you're grateful for",
      "Things you dream about",
      "Childhood memories",
      "Things that smell good",
      "Things that are funny",
      "Signs of good luck"
    ],
    people: [
      "Book characters",
      "Artists (painters)",
      "Philosophers",
      "World leaders (past or present)",
      "Nobel Prize winners"
    ],
    places: [
      "Capital cities",
      "UNESCO World Heritage sites",
      "Extinct places (no longer exist)",
      "Places in Africa",
      "Places in South America"
    ],
    actions: [
      "Dance moves",
      "Things you do quietly",
      "Things that take patience",
      "Things you do slowly",
      "Olympic sports"
    ],
    specific: [
      "Things at a circus",
      "Things in space",
      "Things in the ocean",
      "Things at a castle",
      "Things in ancient Egypt",
      "Things made of wood",
      "Things that are sticky"
    ],
    popCulture: [
      "One-hit wonders",
      "Cult classic movies",
      "Things from the 80s",
      "Classic literature titles",
      "Famous paintings"
    ]
  }
};

// Get all categories as a flat array with difficulty info
function getAllCategoriesWithDifficulty() {
  const result = [];

  Object.entries(categories).forEach(([difficulty, types]) => {
    Object.entries(types).forEach(([type, cats]) => {
      cats.forEach(category => {
        result.push({
          text: category,
          difficulty,
          type
        });
      });
    });
  });

  return result;
}

// Get all categories as a flat array (just text)
function getAllCategories() {
  return getAllCategoriesWithDifficulty().map(c => c.text);
}

// Get a random category
function getRandomCategory(usedCategories = []) {
  const all = getAllCategories();
  const available = all.filter(cat => !usedCategories.includes(cat));

  if (available.length === 0) {
    return all[Math.floor(Math.random() * all.length)];
  }

  return available[Math.floor(Math.random() * available.length)];
}

// Get categories for a full game with balanced difficulty
function getCategoriesForGame(roundCount) {
  const all = getAllCategoriesWithDifficulty();

  // Sort by difficulty to ensure variety
  const easy = all.filter(c => c.difficulty === 'easy');
  const medium = all.filter(c => c.difficulty === 'medium');
  const hard = all.filter(c => c.difficulty === 'hard');

  // Shuffle each difficulty
  const shuffle = arr => arr.sort(() => Math.random() - 0.5);
  shuffle(easy);
  shuffle(medium);
  shuffle(hard);

  const selected = [];

  // Distribute difficulties across rounds
  // Pattern: easy, medium, easy, medium, hard, repeat
  for (let i = 0; i < roundCount; i++) {
    let pool;
    const pattern = i % 5;

    if (pattern === 0 || pattern === 2) {
      pool = easy;
    } else if (pattern === 1 || pattern === 3) {
      pool = medium;
    } else {
      pool = hard;
    }

    if (pool.length > 0) {
      selected.push(pool.shift());
    } else {
      // Fallback if a difficulty runs out
      const fallback = [...easy, ...medium, ...hard].filter(
        c => !selected.find(s => s.text === c.text)
      );
      if (fallback.length > 0) {
        selected.push(fallback[Math.floor(Math.random() * fallback.length)]);
      }
    }
  }

  return selected.map(c => c.text);
}

// Get category info (difficulty, type)
function getCategoryInfo(categoryText) {
  const all = getAllCategoriesWithDifficulty();
  return all.find(c => c.text === categoryText) || { difficulty: 'medium', type: 'unknown' };
}

// Get difficulty level for display (1-3 stars)
function getDifficultyStars(difficulty) {
  switch (difficulty) {
    case 'easy': return 1;
    case 'medium': return 2;
    case 'hard': return 3;
    default: return 2;
  }
}

module.exports = {
  categories,
  getAllCategories,
  getAllCategoriesWithDifficulty,
  getRandomCategory,
  getCategoriesForGame,
  getCategoryInfo,
  getDifficultyStars
};
