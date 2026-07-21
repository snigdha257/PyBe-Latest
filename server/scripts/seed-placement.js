require('dotenv').config();
const mongoose = require('mongoose');
const { LearningPath, PlacementQuiz } = require('../models');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  await PlacementQuiz.deleteMany({});
  console.log('Cleared existing placement quizzes');

  // Find paths to attach quizzes to
  const paths = await LearningPath.find().sort({ order: 1 }).lean();
  
  if (paths.length < 3) {
    console.error('Error: Not enough LearningPaths found. Please run seed.js first.');
    process.exit(1);
  }

  const structuresPathId = paths.find(p => p.name === 'Structures')._id;
  const designPathId = paths.find(p => p.name === 'Design')._id;

  const quizzes = [
    {
      pathId: structuresPathId,
      passingScore: 4,
      questions: [
        {
          question: 'What does this code print?\n```python\nx = 5\ny = x\nx = 10\nprint(y)\n```',
          choices: ['5', '10', 'y', 'Error'],
          correctIndex: 0
        },
        {
          question: 'What does this code print?\n```python\nscore = 85\nif score > 90:\n    grade = "A"\nelif score > 80:\n    grade = "B"\nif score > 70:\n    grade = "C"\nprint(grade)\n```',
          choices: ['A', 'B', 'C', 'Error'],
          correctIndex: 2
        },
        {
          question: 'What does this code print?\n```python\ncount = 0\ntotal = 0\nwhile count < 3:\n    count += 1\n    total += count\nprint(total)\n```',
          choices: ['3', '6', '0', '5'],
          correctIndex: 1
        },
        {
          question: 'What does this code print?\n```python\nn = 5\nresult = 0\nwhile n > 0:\n    if n == 3:\n        n -= 2\n        continue\n    result += n\n    n -= 1\nprint(result)\n```',
          choices: ['12', '10', '9', '5'],
          correctIndex: 1
        },
        {
          question: 'What does this code print?\n```python\na = True\nb = False\nc = True\nif a and b:\n    print("One")\nelif a and c:\n    print("Two")\nelif b or c:\n    print("Three")\nelse:\n    print("Four")\n```',
          choices: ['One', 'Two', 'Three', 'Four'],
          correctIndex: 1
        }
      ]
    },
    {
      pathId: designPathId,
      passingScore: 4,
      questions: [
        {
          question: 'What does this code print?\n```python\nitems = ["apple", "banana", "cherry", "date"]\nitems[1] = items[-1]\nprint(items)\n```',
          choices: [
            '["apple", "date", "cherry", "date"]',
            '["apple", "cherry", "date", "date"]',
            '["apple", "banana", "cherry", "date"]',
            'Error: cannot reassign list item'
          ],
          correctIndex: 0
        },
        {
          question: 'What does this code print?\n```python\ndata = {"a": 1, "b": 2}\ndata["a"] = data.get("c", 3)\ndata["c"] = 4\nprint(data["a"] + data["c"])\n```',
          choices: ['3', '4', '7', 'KeyError'],
          correctIndex: 2
        },
        {
          question: 'What does this code print?\n```python\ndef update(x):\n    x.append(4)\n    x = [1, 2, 3]\n\nnums = [0]\nupdate(nums)\nprint(nums)\n```',
          choices: ['[1, 2, 3]', '[0]', '[0, 4]', '[0, 4, 1, 2, 3]'],
          correctIndex: 2
        },
        {
          question: 'What does this code print?\n```python\ndef f(a, b):\n    if a > b:\n        return a\n    return b\n\ndef g(x):\n    return f(x, f(x-2, x+1))\n\nprint(g(5))\n```',
          choices: ['5', '6', '3', '8'],
          correctIndex: 1
        },
        {
          question: 'What does this code print?\n```python\nregistry = {\n    "ids": [101, 102],\n    "active": True\n}\nuser_id = registry["ids"].pop()\nregistry["ids"].insert(0, 103)\nprint(user_id, registry["ids"][1])\n```',
          choices: ['102 101', '101 103', '102 103', '101 101'],
          correctIndex: 0
        }
      ]
    }
  ];

  await PlacementQuiz.insertMany(quizzes);
  console.log(`Inserted ${quizzes.length} placement quizzes`);

  await mongoose.disconnect();
  console.log('Placement seed complete.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
