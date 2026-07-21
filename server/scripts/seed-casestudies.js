require('dotenv').config();
const mongoose = require('mongoose');
const { LearningPath, CaseStudy } = require('../models');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  await CaseStudy.deleteMany({});
  console.log('Cleared existing case studies');

  const paths = await LearningPath.find().sort({ order: 1 });
  if (paths.length < 3) {
    console.error('Not enough learning paths found. Please run seed.js first.');
    process.exit(1);
  }

  const caseStudies = [
    {
      pathId: paths[0]._id, // Foundations
      title: 'The Grade Tracker',
      scenario: `You're trying to calculate the final average for a student based on a list of their quiz scores. You wrote a quick script to loop through the scores, add them up, and divide by the total number of quizzes. But when you run it, the average is coming out completely wrong. A student who scored mostly 80s is somehow getting an average of 17.6. 
      
You need to fix this script so it prints the correct final average before grades are submitted to the principal's office.`,
      buggyCode: `scores = [85, 90, 78, 92, 88]
total = 0

for score in scores:
    total = score  # BUG: overwriting instead of accumulating

average = total / len(scores)
print(f"Final average: {average}")`,
      expectedOutput: `Final average: 86.6`,
      hints: [
        "Take a close look at what happens to the 'total' variable inside the loop.",
        "If you print 'total' on every iteration, what values do you see?",
        "You are currently replacing the total with the current score instead of adding to it. Use the += operator or total = total + score."
      ],
      reflectionPrompt: "What was causing the total to be wrong, and how does your fix change the way the variable is updated?"
    },
    {
      pathId: paths[1]._id, // Structures
      title: 'The Inventory Lookup',
      scenario: `You manage the inventory for a small electronics store. You have a list of product IDs that need to be restocked, and a dictionary containing the names and current stock levels of all products. You wrote a script to print out the names of the products that need restocking.

But instead of printing the product names, your code crashes with a KeyError, or prints the wrong items. You need to fix the script so it correctly prints the name of each product that needs to be restocked.`,
      buggyCode: `restock_ids = [102, 105, 108]
inventory = {
    101: {"name": "USB Cable", "stock": 45},
    102: {"name": "Monitor", "stock": 2},
    103: {"name": "Keyboard", "stock": 12},
    104: {"name": "Mouse", "stock": 8},
    105: {"name": "Webcam", "stock": 0},
    108: {"name": "Headphones", "stock": 1}
}

for i in range(len(restock_ids)):
    # BUG: using the index 'i' to look up in the inventory instead of the actual product ID
    product_name = inventory[i]["name"]
    print(f"Please order more: {product_name}")`,
      expectedOutput: `Please order more: Monitor
Please order more: Webcam
Please order more: Headphones`,
      hints: [
        "What is the value of 'i' during the first iteration of the loop?",
        "You are iterating over the indices of the list (0, 1, 2) instead of the actual product IDs (102, 105, 108).",
        "Try iterating directly over the items in 'restock_ids' using 'for product_id in restock_ids:', and use 'product_id' as the dictionary key."
      ],
      reflectionPrompt: "Explain the difference between iterating over the indices of a list versus iterating over the actual items, and why the dictionary lookup was failing."
    },
    {
      pathId: paths[2]._id, // Design
      title: 'The Bank Account',
      scenario: `You're writing the backend logic for a simple banking app. You created a BankAccount class with a withdraw method. If a user tries to withdraw more money than they have, it's supposed to raise a ValueError and prevent the transaction.

Your colleague wrote a test script that tries to withdraw too much money. It catches the error and prints "Transaction failed". However, when you run it, the withdrawal silently goes through, the balance goes negative, and the "Transaction failed" message never prints. The bank is going to lose a lot of money if this goes live!`,
      buggyCode: `class BankAccount:
    def __init__(self, balance):
        self.balance = balance

    def withdraw(self, amount):
        if amount > self.balance:
            # BUG: Just returning an error object instead of raising it!
            return ValueError("Insufficient funds")
        
        self.balance -= amount
        return self.balance

account = BankAccount(100)

try:
    account.withdraw(150)
    print(f"Success! Remaining balance: \${account.balance}")
except ValueError:
    print("Transaction failed: Insufficient funds")`,
      expectedOutput: `Transaction failed: Insufficient funds`,
      hints: [
        "Look closely at the if statement inside the withdraw method. How do you signal an error in Python?",
        "Returning an Exception object is not the same as throwing one. The 'try/except' block is waiting for an error to be thrown.",
        "Change 'return ValueError(...)' to 'raise ValueError(...)' so that the except block actually catches it."
      ],
      reflectionPrompt: "Why did the transaction succeed in the buggy version, and what is the difference between returning an error and raising an exception?"
    }
  ];

  await CaseStudy.insertMany(caseStudies);
  console.log(`Inserted ${caseStudies.length} case studies`);

  await mongoose.disconnect();
  console.log('Seed complete.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
