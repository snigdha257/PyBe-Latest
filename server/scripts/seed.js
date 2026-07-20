/**
 * seed.js — Problem-first module seeding
 * Run: node scripts/seed.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { LearningPath, Module, User, UserProgress } = require('../models');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  await LearningPath.deleteMany({});
  await Module.deleteMany({});
  console.log('Cleared existing paths and modules');

  // ── Learning Paths ───────────────────────────────────────────────────────
  const paths = await LearningPath.insertMany([
    {
      _id: new mongoose.Types.ObjectId('610000000000000000000001'),
      name: 'Foundations',
      description: "The core building blocks of Python. Every program you've ever run is made of these three ideas.",
      order: 1,
    },
    {
      _id: new mongoose.Types.ObjectId('610000000000000000000002'),
      name: 'Structures',
      description: 'How Python organizes collections of things — lists of items, lookups by name, and reusable recipes.',
      order: 2,
    },
    {
      _id: new mongoose.Types.ObjectId('610000000000000000000003'),
      name: 'Design',
      description: 'How professionals structure programs that last — handling the unexpected, defining kinds of things, and extending behaviour cleanly.',
      order: 3,
    },
  ]);
  console.log(`Inserted ${paths.length} learning paths`);

  // ── Modules ──────────────────────────────────────────────────────────────
  // All multi-line strings use template literals to avoid apostrophe issues.
  const modules = [
    // ══════════════════════ PATH 1 · FOUNDATIONS ═══════════════════════════
    {
      _id: new mongoose.Types.ObjectId('620000000000000000000001'),
      name: 'Variables',
      pathId: paths[0]._id,
      order: 1,

      problem: `You're baking cookies for a bake sale. You've measured out 240ml of milk but the recipe says "add more if the dough is too dry." You realize you'd been writing "240" on your hand as a reminder — but then you also need to remember that 240 means millilitres, and somewhere else you used 240 to mean the oven temperature in Fahrenheit.

You write notes to yourself all over the place. Some say "240ml," some say "240°F." When you come back later, you can't tell which note means what. You start wishing you could just call something by a name that carries its meaning with it.`,

      evaluationCriteria: [
        'Names represent values — the learner understands a variable is a labelled container',
        'Same value can have multiple names — they know about aliasing/references',
        'Names can be reassigned — they understand variables change over time',
      ],

      pythonSolution: {
        explanation: `You give each value a meaningful name. Instead of scattering "240" everywhere, you write "milk_ml = 240" and "oven_temp_f = 240". Python knows which is which from the name. When you update "milk_ml" later, the name "milk_ml" still works — you never have to hunt for the right number again.`,
        code: `# Give values meaningful names
milk_ml = 240          # "milk_ml" tells you what 240 means
oven_temp_f = 240      # different name, different meaning
print(milk_ml)         # -> 240
print(oven_temp_f)     # -> 240

# Reassign when the value changes
milk_ml = 280          # you added more milk
print(milk_ml)         # -> 280 — the name stays, the value updated`,
      },

      story: '',
      practicalTask: '',
      quizQuestion: '',
      quizChoices: [],
      reflectionPrompt: '',
    },

    {
      _id: new mongoose.Types.ObjectId('620000000000000000000002'),
      name: 'Conditionals',
      pathId: paths[0]._id,
      order: 2,

      problem: `You're packing for a trip and your bag is 11kg — 1kg over the airline's 10kg limit. You need a system: if the bag is over 10kg, take something out; otherwise you're good to go.

But your bag isn't the only variable. You also need to check: is it a domestic flight (no extra fee) or international (charged by weight)? And is it a budget airline that charges for any checked bag at all?

You end up with a long list of hand-written rules. When you stand at the check-in counter with a 20-page printout of "if this, then that," the staff just laughs. There's got to be a cleaner way to handle all these branches.`,

      evaluationCriteria: [
        'Single condition: learner checks one thing and acts on the result',
        'Multiple conditions: they handle more than one branch (if/elif/else)',
        'Mutually exclusive logic: they understand only one branch runs',
      ],

      pythonSolution: {
        explanation: `Python's if/elif/else lets you write exactly one branch that runs. The computer checks each condition top-to-bottom and stops at the first true one. If nothing matches, the else block runs. This is exactly your packing decision tree — just a lot shorter than your 20-page printout.`,
        code: `# Single condition
bag_kg = 11
if bag_kg > 10:
    print("Take something out before check-in")

# Three branches — exactly one runs
bag_kg = 11
flight_type = "international"
is_budget = True

if is_budget and bag_kg > 0:
    print("Budget airline — all checked bags cost extra")
elif flight_type == "domestic":
    print("Domestic flight — no weight charge")
else:
    print("International standard economy — you're within the 10kg allowance")`,
      },

      story: '',
      practicalTask: '',
      quizQuestion: '',
      quizChoices: [],
      reflectionPrompt: '',
    },

    {
      _id: new mongoose.Types.ObjectId('620000000000000000000003'),
      name: 'Loops',
      pathId: paths[0]._id,
      order: 3,

      problem: `You've just finished a marathon race. Your phone has recorded your split time for every single kilometre — 42 numbers in total. You're doing a post-race analysis: average pace, fastest km, slowest km, comparing km 1 vs km 42.

You'd do this in a spreadsheet. But you keep finding new questions — "what if I want the average pace for just the second half?" You copy-paste the formula. "What about the fastest km?" Copy-paste again. For 42 numbers it's manageable. But what if you had 42 million?`,

      evaluationCriteria: [
        'Repetition: they know to process each item in a collection',
        'Stopping condition: they know when to stop repeating',
        'Accumulation: they build up a result as they go (min, sum, count)',
      ],

      pythonSolution: {
        explanation: `A while loop repeats as long as a condition is true — perfect when you don't know exactly how many items you have, or when the stopping condition depends on what's happening inside the loop. Python runs the body, goes back to check the condition, and stops when it's false. Your 42 splits become a simple 4-line calculation.`,
        code: `# While loop: repeat until a condition becomes false
split_times = [5.2, 5.1, 5.4, 4.9, 5.0]  # km split times in minutes

index = 0
total_time = 0
fastest = float('inf')
slowest = 0

while index < len(split_times):
    t = split_times[index]
    total_time += t
    if t < fastest:
        fastest = t
    if t > slowest:
        slowest = t
    index += 1

print(f"Average pace: {total_time / len(split_times):.2f} min/km")
print(f"Fastest km: {fastest} min")`,
      },

      story: '',
      practicalTask: '',
      quizQuestion: '',
      quizChoices: [],
      reflectionPrompt: '',
    },

    // ══════════════════════ PATH 2 · STRUCTURES ═══════════════════════════
    {
      _id: new mongoose.Types.ObjectId('620000000000000000000004'),
      name: 'Lists',
      pathId: paths[1]._id,
      order: 1,

      problem: `You're organizing your music library on a new phone. You have 847 songs. You want to find the 423rd song alphabetically. You want to sort them by artist, then by album, then by track number. You want to add new songs in the right alphabetical position without re-sorting the whole list.

You could keep a written index — a numbered list of songs and their positions. But then every time you add a song, you have to renumber everything after it. The order of your songs matters — track 3 only makes sense after track 2. You're using order to carry information. Is there a cleaner way to manage this?`,

      evaluationCriteria: [
        'Ordered sequence: learner understands order carries meaning in their data',
        'Indexed access: they know position determines which item they get',
        'Mutability awareness: they know lists can be changed without recreating them',
      ],

      pythonSolution: {
        explanation: `A Python list is an ordered sequence where position is meaningful — exactly your music library. Lists are mutable, so you can insert a song at position 3 and everything shifts automatically. Python's built-in sorted() gives you a new sorted list without destroying the original order. The 423rd song is just playlist[422].`,
        code: `# A list is an ordered sequence — order carries meaning
playlist = ["Yesterday", "Bohemian Rhapsody", "Stairway to Heaven", "Imagine"]

# Access by index (position starts at 0)
print(playlist[0])   # -> "Yesterday"
print(playlist[-1])  # -> "Imagine" (last item)

# Insert in the right position — the rest shifts automatically
playlist.insert(2, "Hotel California")
print(playlist)  # -> ["Yesterday", "Bohemian Rhapsody", "Hotel California", ...]

# Sort without destroying the original
alphabetical = sorted(playlist)
print(alphabetical)  # new list — original unchanged`,
      },

      story: '',
      practicalTask: '',
      quizQuestion: '',
      quizChoices: [],
      reflectionPrompt: '',
    },

    {
      _id: new mongoose.Types.ObjectId('620000000000000000000005'),
      name: 'Dictionaries',
      pathId: paths[1]._id,
      order: 2,

      problem: `You're a teacher with 30 students. You have their exam scripts — each script has a student number written at the top. You have a printed mark sheet with student number and their name on the left, and a grade field on the right.

You spend 25 minutes matching student numbers on scripts to names on the mark sheet. Then you spend another 15 minutes looking up each name on the grade sheet to figure out if they passed. That's 40 minutes of searching through lists, one by one.

Your colleague looks at your process and says: "Why don't you just look them up directly?" You realize you don't have a phone book — you're doing the job of a phone book with a pile of loose papers.`,

      evaluationCriteria: [
        'Key-value association: they understand pairing a lookup key with a value',
        'Direct lookup: they know the key gives immediate access without searching',
        'Unordered by key: they understand dicts are organized by key, not position',
      ],

      pythonSolution: {
        explanation: `A Python dictionary is a phone book: give it a name (key), and it returns the number (value) immediately — no searching through a list. In O(1) constant time, regardless of how many students you have. "Anna's grade" is just grades["Anna"]. Adding a student is one line. No renumbering, no shifting, no searching.`,
        code: `# A dictionary: key -> value lookup, instant, no matter how big
student_grades = {
    "Anna":   {"score": 87, "grade": "A"},
    "Ben":    {"score": 72, "grade": "B"},
    "Chloe":  {"score": 55, "grade": "C"},
    "Daniel": {"score": 91, "grade": "A"},
}

# Direct lookup by key — no searching
print(student_grades["Ben"]["grade"])   # -> "B" — instant

# Add a new student in one line
student_grades["Eva"] = {"score": 78, "grade": "B"}

# Check if a key exists safely
if "Fred" in student_grades:
    print(student_grades["Fred"]["grade"])
else:
    print("Fred not enrolled yet")`,
      },

      story: '',
      practicalTask: '',
      quizQuestion: '',
      quizChoices: [],
      reflectionPrompt: '',
    },

    {
      _id: new mongoose.Types.ObjectId('620000000000000000000006'),
      name: 'Functions',
      pathId: paths[1]._id,
      order: 3,

      problem: `You're writing the same email format over and over at work. Each email has three parts: a greeting (with the recipient's name), a body (custom to each email), and a sign-off (always the same for your department). You copy-paste the template and fill in the two things that change.

Then the sign-off format changes. Now you have to go back through 140 sent emails and replace "Kind regards" with "Best regards" in each one. You spend two hours on something that should have taken two minutes.`,

      evaluationCriteria: [
        'Inputs and outputs: they know a function takes input and produces output',
        'Reusability: they understand the same function can be called many times',
        'Separation of concerns: they know to keep the reusable part separate from the changing part',
      ],

      pythonSolution: {
        explanation: `A Python function packages up reusable logic. You write it once with placeholders (parameters) for the parts that change — recipient name, email body. The parts that never change — sign-off, formatting — stay inside. Now when the sign-off changes, you change one line in one function and all 140 emails update instantly. The function is the email template; calling it is like filling in the template.`,
        code: `# A function: write once, use anywhere, change in one place
def send_email(recipient_name, body):
    greeting = f"Dear {recipient_name},"
    sign_off = "Best regards,\\nThe Admissions Team"
    return f"{greeting}\\n\\n{body}\\n\\n{sign_off}"

# Now email logic is one line — change it in one place
email1 = send_email("Priya", "Your application has been reviewed.")
email2 = send_email("Marco", "We need one more reference letter.")

print(email1)
# Dear Priya,
#
# Your application has been reviewed.
#
# Best regards,
# The Admissions Team`,
      },

      story: '',
      practicalTask: '',
      quizQuestion: '',
      quizChoices: [],
      reflectionPrompt: '',
    },

    // ══════════════════════ PATH 3 · DESIGN ════════════════════════════════
    {
      _id: new mongoose.Types.ObjectId('620000000000000000000007'),
      name: 'Exceptions',
      pathId: paths[2]._id,
      order: 1,

      problem: `You're building a flight booking system. Most of the time a user types in a flight code like "BA 249" and you look it up in your database. It works perfectly — until someone types "BAnull" or "flight 249" (wrong format) or just leaves it blank.

Your system crashes every time. You start adding checks before every lookup: "is it empty? is it the right length? does it contain a space? is it numeric?" Now every piece of code that looks up a flight has a 15-line wall of error-checking boilerplate before it, and the actual lookup logic — two lines — is buried somewhere in the middle.`,

      evaluationCriteria: [
        'Unexpected input: they recognize bad input as a category separate from logic errors',
        'Graceful handling: they understand handling failures without crashing',
        'Separation of concerns: they know error-checking is different from the happy-path logic',
      ],

      pythonSolution: {
        explanation: `Python's try/except separates the happy path from error handling. You try the lookup, and if something unexpected goes wrong — wrong format, not found, blank input — Python jumps to the except block instead of crashing. Your lookup logic stays clean: two lines. The error-handling is in one except block, not copy-pasted 15 times throughout the code.`,
        code: `# try/except: handle the unexpected without crashing
def lookup_flight(flight_code):
    try:
        # Happy path — this is all that should happen
        result = database.lookup(flight_code)
        return f"Found: {result['route']} — {result['time']}"
    except ValueError:
        # Wrong format — e.g. "BAnull"
        return f"Sorry, '{flight_code}' isn't a valid flight code format."
    except KeyError:
        # Flight not in database — e.g. "flight 249" without airline prefix
        return f"No flight found matching '{flight_code}'."
    except Exception as e:
        # Catch-all for anything else we did not anticipate
        return f"Something went wrong: {e}"

print(lookup_flight("BA 249"))   # -> Found: London -> New York — 08:30
print(lookup_flight("BAnull"))   # -> Sorry, 'BAnull' isn't a valid flight code format.`,
      },

      story: '',
      practicalTask: '',
      quizQuestion: '',
      quizChoices: [],
      reflectionPrompt: '',
    },

    {
      _id: new mongoose.Types.ObjectId('620000000000000000000008'),
      name: 'Classes',
      pathId: paths[2]._id,
      order: 2,

      problem: `You're managing a fleet of three delivery robots. Each robot has a location (x, y), a battery level, a status (idle/in_transit/charging), and a list of packages on board. Robot 1 is at (3, 7) with battery at 42%. Robot 2 is at (1, 2) with battery at 88%. Robot 3 is at (9, 4) with battery at 15%.

You write a function to move a robot: update its location, drain the battery slightly, check if it needs to return to base. You copy-paste this function three times with minor variations. Then you add a fourth robot and forget to update one of the three copies. Now your fleet has a subtle bug that only shows up with Robot 3.`,

      evaluationCriteria: [
        'Blueprint thinking: they know a class defines the template for making things',
        'Instance state: they understand each object has its own values',
        'Shared behaviour: they know all instances share the same methods',
      ],

      pythonSolution: {
        explanation: `A Python class is a blueprint for making robots. You define it once — location, battery, status, move(), charge() — and then create as many robot instances as you want. Each robot has its own values (self.x, self.battery) but shares the same logic (self.move()). When you fix a bug in the class, all robots get the fix. No more copy-paste bugs.`,
        code: `# A class is a blueprint — define once, use for many instances
class Robot:
    def __init__(self, x, y):
        self.x = x
        self.y = y
        self.battery = 100
        self.status = "idle"

    def move(self, dx, dy):
        self.x += dx
        self.y += dy
        self.battery -= abs(dx) + abs(dy)
        self.status = "in_transit"
        if self.battery < 20:
            self.charge()

    def charge(self):
        self.status = "charging"
        self.battery = min(100, self.battery + 50)
        if self.battery >= 100:
            self.status = "idle"

# Create three robots from the same blueprint
robot1 = Robot(3, 7)
robot2 = Robot(1, 2)
robot3 = Robot(9, 4)

robot1.move(2, 1)
print(robot1.x, robot1.y, robot1.battery)  # -> 5 8 97`,
      },

      story: '',
      practicalTask: '',
      quizQuestion: '',
      quizChoices: [],
      reflectionPrompt: '',
    },

    {
      _id: new mongoose.Types.ObjectId('620000000000000000000009'),
      name: 'Decorators',
      pathId: paths[2]._id,
      order: 3,

      problem: `You have three functions that query a database. Every time you call one, you want to log how long the query took. Every time one fails, you want to send an alert email. You add logging and alert code to each of the three functions. Six months later you have 47 such functions and you're maintaining logging and alert code in 47 places.

You start to wonder: what if the logging and alerting logic could be separated from the actual database query? What if you could wrap any function with logging and alerting without touching the function itself?`,

      evaluationCriteria: [
        'Behaviour addition: they know decorators add behaviour without modifying the inner function',
        'Function as argument: they know a decorator takes a function and returns a new one',
        'Order matters: they know multiple decorators are applied bottom-to-top',
      ],

      pythonSolution: {
        explanation: `A Python decorator is a function that wraps another function. It takes the original function, adds behaviour (logging, timing, alerts), and returns a new function that still does everything the original did. You write the logging logic once in the decorator, then just put @log_call above any function you want to instrument. One line adds logging to 47 functions — without touching any of them.`,
        code: `# A decorator: add behaviour to any function without changing the function itself
import time

def log_call(func):
    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        elapsed = time.time() - start
        print(f"{func.__name__} took {elapsed:.3f}s")
        return result
    return wrapper

def send_alert_on_failure(func):
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            print(f"ALERT: {func.__name__} failed — {e}")
            raise
    return wrapper

# Apply decorators with @ — they wrap the function automatically
@log_call
@send_alert_on_failure
def query_database(sql):
    # ... actual database query ...
    return [{"id": 1, "name": "Alice"}]

result = query_database("SELECT * FROM users")
# query_database took 0.042s`,
      },

      story: '',
      practicalTask: '',
      quizQuestion: '',
      quizChoices: [],
      reflectionPrompt: '',
    },
  ];

  await Module.insertMany(modules);
  console.log(`Inserted ${modules.length} modules`);

  // ── Seed progress for existing users ──────────────────────────────────
  const users = await User.find();
  if (users.length > 0) {
    const allModules = await Module.find().lean();
    const progressDocs = [];
    for (const user of users) {
      const firstByPath = new Map();
      for (const m of allModules) {
        const key = String(m.pathId);
        if (!firstByPath.has(key) || m.order < firstByPath.get(key).order) {
          firstByPath.set(key, m);
        }
      }
      for (const m of allModules) {
        const isFirst = firstByPath.get(String(m.pathId))._id.equals(m._id);
        progressDocs.push({
          userId: user._id,
          moduleId: m._id,
          status: isFirst ? 'unlocked' : 'locked',
          currentStep: isFirst ? 'problem' : 'problem',
        });
      }
    }
    await UserProgress.deleteMany({ userId: { $in: users.map((u) => u._id) } });
    await UserProgress.insertMany(progressDocs);
    console.log(`Seeded progress for ${users.length} user(s) across ${progressDocs.length} records`);
  }

  await mongoose.disconnect();
  console.log('Seed complete.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });