// Word lists by difficulty for Alias Auction

const words = {
  easy: [
    'CAT', 'PIZZA', 'HAPPY', 'HOUSE', 'BEACH', 'DOG', 'TREE', 'BALL', 'RAIN', 'SUN',
    'BOOK', 'CHAIR', 'BIRD', 'FISH', 'FLOWER', 'MUSIC', 'DANCE', 'SLEEP', 'JUMP', 'RUN',
    'SWIM', 'COOK', 'SMILE', 'LAUGH', 'CRY', 'COLD', 'HOT', 'BIG', 'SMALL', 'FAST',
    'SLOW', 'RED', 'BLUE', 'GREEN', 'YELLOW', 'APPLE', 'BANANA', 'MILK', 'BREAD', 'WATER',
    'DOOR', 'WINDOW', 'TABLE', 'BED', 'PHONE', 'CAR', 'TRAIN', 'PLANE', 'BOAT', 'BIKE'
  ],
  medium: [
    'TELESCOPE', 'BIRTHDAY', 'SCIENTIST', 'ADVENTURE', 'MOUNTAIN', 'RAINBOW', 'LIBRARY',
    'HOSPITAL', 'ELEPHANT', 'BUTTERFLY', 'VOLCANO', 'DINOSAUR', 'ASTRONAUT', 'SUPERHERO',
    'RESTAURANT', 'CHOCOLATE', 'STRAWBERRY', 'UMBRELLA', 'FIREWORKS', 'ORCHESTRA',
    'SUBMARINE', 'HELICOPTER', 'EARTHQUAKE', 'THUNDERSTORM', 'PHOTOGRAPHY', 'SKATEBOARD',
    'TREEHOUSE', 'WATERFALL', 'GYMNASTICS', 'BASKETBALL'
  ],
  hard: [
    'DEMOCRACY', 'FRUSTRATION', 'PROCRASTINATE', 'SERENDIPITY', 'NOSTALGIA', 'PHILOSOPHY',
    'IMAGINATION', 'PERSEVERANCE', 'COLLABORATION', 'SUSTAINABILITY', 'EMBARRASSMENT',
    'ENTHUSIASM', 'DETERMINATION', 'ACCOMPLISHMENT', 'EXTRAORDINARY', 'COMMUNICATION',
    'RESPONSIBILITY', 'INDEPENDENCE', 'CIVILIZATION', 'OPPORTUNITY'
  ]
};

function getRandomWord(difficulty = 'medium') {
  const wordList = words[difficulty] || words.medium;
  return wordList[Math.floor(Math.random() * wordList.length)];
}

function getWordsByDifficulty(difficulty) {
  return words[difficulty] || words.medium;
}

module.exports = {
  words,
  getRandomWord,
  getWordsByDifficulty
};
