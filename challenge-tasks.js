/* Care for Plants · Challenge & Enrich: the content of the teacher page (challenge.html).
 * The unit runs in three phases: 2 periods of briefing, the SLS package as homework while the real plants grow,
 * then 2 periods of class discussion to consolidate. Every task has a tier the teacher assigns:
 *   core  🌱 Sprout  (every student)
 *   stretch 🌿 Sapling
 *   challenge 🌳 Tree  (to give high-ability students room to show the checklist behaviours)
 * Students only ever see the plant names (Sprout, Sapling, Tree), never "HAS".
 * Each task lists the checklist behaviours it can bring out (CHECKLIST ids) and what evidence to look for. */

/* The HAS identification checklist: supporting evidence for three traits. * marks the key indicators. */
const CH_TRAITS = [
  { id: 'CU', name: 'Curiosity', emoji: '🔍', color: '#66ccff', items: [
    { id: 'CU1', text: 'is not satisfied with simple explanations and asks relevant follow-up questions' },
    { id: 'CU2', text: 'shows interest in discussing with teacher/peers new scientific discoveries or advanced scientific ideas (e.g. approaches teacher after class)' },
    { id: 'CU3', text: 'shares what he/she learnt from beyond the classroom (e.g. science-related books, magazines, documentaries, videos, websites and news articles), such as by bringing and sharing interesting items' },
    { id: 'CU4', key: true, text: 'loves to try things out or needs to verify what they have learnt through investigations' }
  ]},
  { id: 'MP', name: 'Motivation & persistence', emoji: '💪', color: '#ffb627', items: [
    { id: 'MP1', text: 'can follow instructions and focus on learning (even though may show some playfulness)' },
    { id: 'MP2', text: 'persists in trying to understand difficult science concepts, complex examples or unexpected results' },
    { id: 'MP3', text: 'voluntarily participates in out-of-class science-related activities (e.g. STEM CCA, Young Scientist Badge, STEM Challenge)' },
    { id: 'MP4', key: true, text: 'initiates investigations to satisfy curiosity or answer scientific questions (e.g. information gathering, experiments)' },
    { id: 'MP5', key: true, text: 'shows intense interest and knowledge in an area of science (e.g. life sciences, tinkering/making, engineering, chemistry)' }
  ]},
  { id: 'SR', name: 'Scientific reasoning', emoji: '🧠', color: '#b557e6', items: [
    { id: 'SR1', text: 'exhibits more extensive scientific vocabulary than peers when explaining and discussing science phenomena' },
    { id: 'SR2', text: 'notices things others do not when making observations or identifying patterns in data' },
    { id: 'SR3', text: 'comes up with particularly interesting/innovative alternative ideas for experiments' },
    { id: 'SR4', text: 'demonstrates systematic and rigorous thinking about science or experiments in his/her work, and/or in identifying errors in others’ understanding/reasoning' },
    { id: 'SR5', key: true, text: 'makes connections between observed phenomena and scientific concepts, where connections are not obvious (or connects concepts to bigger ideas)' }
  ]}
];

const CH_TIERS = [
  { id: 'core', name: 'Sprout', emoji: '🌱', label: 'Core', color: '#3fc35f', who: 'Every student' },
  { id: 'stretch', name: 'Sapling', emoji: '🌿', label: 'Stretch', color: '#66ccff', who: 'Students ready for more' },
  { id: 'challenge', name: 'Tree', emoji: '🌳', label: 'Challenge', color: '#b557e6', who: 'Students you are watching for high ability' }
];

/* The unit, phase by phase. */
const CH_PHASES = [
  { id: 'brief', title: 'Brief', when: 'Periods 1 and 2 · in class', emoji: '📣', periods: [
    { title: 'Period 1 · Why care for plants?', steps: [
      ['Hook (5 min)', '“Think of what you ate at recess. Where did it grow?” Students guess which foods were grown in Singapore. Most were not.'],
      ['Food in Singapore (10 min)', 'Show the Food in Singapore explainer (in the discussion deck). Singapore has little land, so most of our food is brought in from other countries. Growing some here and wasting less keeps our food supply safer.'],
      ['Our plants are food (5 min)', 'Thai basil, kang kong and bayam are all vegetables we eat. Caring for them well is how a farmer gets a good harvest.'],
      ['Meet the SLS package (10 min)', 'Show the three challenge levels 🌱 Sprout, 🌿 Sapling and 🌳 Tree. Every student does the Sprout tasks. Hand out each student’s challenge card. Say: “Everyone can try the next level up when you finish yours.”']
    ]},
    { title: 'Period 2 · How to do the SLS tasks', steps: [
      ['Model the care log (10 min)', 'Fill in the first care log entry together on the board: date, water, light, what the plant looks like, height.'],
      ['Practise one task (10 min)', 'Students start task 🌱 Where does my food come from? in class, using the food packaging you bring in.'],
      ['Challenge groups (5 min)', 'Meet the 🌿 and 🌳 students for a few minutes. Show them how to plan a fair test and how to upload photos to SLS.'],
      ['Set the homework (5 min)', 'Give the deadline for each SLS section. Remind students to bring anything interesting they find at home or in the news to share.']
    ]}
  ]},
  { id: 'sls', title: 'SLS homework', when: 'While the plants grow · about 2 weeks', emoji: '💻', note: 'Students work through the SLS package at home. Each section below is ready to copy into SLS. Watch the submissions for the checklist evidence listed with each task.' },
  { id: 'consolidate', title: 'Consolidate', when: 'Periods 3 and 4 · class discussion', emoji: '💬', periods: [
    { title: 'Period 3 · What did our plants teach us?', steps: [
      ['Care log share (10 min)', 'Buddy groups compare care logs. “Two plants got the same care but grew differently. Why?”'],
      ['Tree presentations (12 min)', '🌳 students present their investigation in 2 minutes each, as the class experts. Others ask one question each.'],
      ['Gallery walk (8 min)', 'Food-waste posters, Sapling line graphs and regrown scraps go on the tables. Students leave a sticky note with an “I wonder…” question.']
    ]},
    { title: 'Period 4 · From seed to plate', steps: [
      ['Big questions (15 min)', 'Use the “Less food waste at home” questions in the discussion deck (our audits, the 5 Whys, use-me-first systems), then “Care for plants · our food” for the bigger picture.'],
      ['Reflect (10 min)', 'Students answer the reflection questions (What have you learnt? What inspired you? What do you still wonder?).'],
      ['Feedback (5 min)', 'Students fill in the Google Form feedback. Add new “I wonder…” questions to the class board.']
    ]}
  ]}
];

/* The SLS package. phase: 'sls' tasks are homework; 'consolidate' tasks happen in Periods 3 and 4.
 * student: the words students see (copied into SLS). evidence: what the teacher looks for. traits: checklist ids. */
const CH_TASKS = [
  /* Section A · Caring for my plant */
  { id: 'A1', section: 'A', tier: 'core', title: 'My plant care log',
    student: 'Three times a week, check your plant and fill in your care log:\n• Date\n• Did I water it? How much?\n• Where is it? (sunny / shady)\n• What does it look like? (colour of leaves, new leaves, droopy or firm)\n• How tall is it? (measure once a week, in cm)\nTake one photo each week and upload it.',
    evidence: 'Complete, regular entries. Notes that go beyond what was asked (e.g. a leaf turned yellow after rain).',
    traits: ['MP1', 'SR2'] },
  { id: 'A2', section: 'A', tier: 'core', title: 'What does my plant need?',
    student: 'Your plant needs water, air, light and nutrients from the soil to grow well.\nLook at your care log. Write one thing you did that helped your plant grow, and one thing you would change.',
    evidence: 'Links a care action to a plant need, using words like light, water or nutrients.',
    traits: ['SR1'] },
  { id: 'A3', section: 'A', tier: 'stretch', title: 'Plant detective',
    student: 'Compare your plant with a buddy’s plant (or with your photo from last week).\n1. Find two differences. Look closely: leaves, colour, stem, height.\n2. For each difference, suggest a reason. Was it water? Light? Something else?\n3. How could you check if your reason is right?',
    evidence: 'Spots small differences others miss. Gives a testable reason and a way to check it.',
    traits: ['SR2', 'SR5', 'CU4'] },
  { id: 'A4', section: 'A', tier: 'stretch', title: 'My growth line graph',
    student: 'Use your weekly heights to draw a line graph. Put the weeks along the bottom and the height (cm) up the side.\nDescribe the pattern: did your plant grow the same amount every week? Which week did it grow the most? Why do you think so?',
    evidence: 'Reads the pattern from the graph, not only the last value. Explains a change in growth rate.',
    traits: ['SR2', 'SR4'] },
  { id: 'A5', section: 'A', tier: 'challenge', title: 'The unexpected result',
    student: 'Scientists get excited when something unexpected happens!\nRecord anything about your plant that surprised you (a leaf changing colour, a sudden growth spurt, a plant that did not grow).\n1. Give two possible explanations.\n2. Plan how you could find out which explanation is right.\n3. If you can, try it and report what happened.',
    evidence: 'Does not stop at the first explanation. Keeps going when the result is puzzling. Plans a real check.',
    traits: ['MP2', 'SR4', 'CU1', 'MP4'] },

  /* Section B · Food in Singapore (enrichment) */
  { id: 'B1', section: 'B', tier: 'core', title: 'Where does my food come from?',
    student: 'Look at the labels on three foods at home or at the supermarket (vegetables, fruit, eggs or rice).\nFor each one, write the food and the country it came from.\nHow many were grown in Singapore?',
    evidence: 'Brings real labels or photos. Adds facts they found themselves.',
    traits: ['CU3', 'MP1'] },
  { id: 'B2', section: 'B', tier: 'core', title: 'Why grow food in Singapore?',
    student: 'Read: Singapore is small, with little land for farms. Most of our food comes from other countries by ship, plane and truck. If something stops the food from coming, we could run short. Growing some of our own food, and wasting less, helps keep our food supply safe.\n\nQuestion: Give one reason why Singapore wants to grow more of its own food.\nThen: Name one way your family could help.',
    evidence: 'Explains the reason in their own words, not copied.',
    traits: ['SR1'],
    teacherNote: 'Pair this with a short video from the SLS library on Singapore’s food story. Check the Singapore Food Agency website for the latest local production targets before quoting numbers.' },
  { id: 'B3', section: 'B', tier: 'core', title: 'Food waste watch',
    student: 'For one day, notice the food your family throws away (leftovers, peels, food that went bad).\nWrite down what was thrown away.\nSuggest one idea to waste less food at home.',
    evidence: 'Practical ideas. Notices patterns (e.g. bread always goes mouldy first).',
    traits: ['SR2', 'MP1'] },
  { id: 'B4', section: 'B', tier: 'stretch', title: 'Grow it again from scraps',
    student: 'Some vegetables can grow again from scraps! Ask an adult for the bottom of a spring onion (with roots) or a kang kong stem.\nPut it in a cup with a little water, near a window. Change the water every 2 days.\nTake a photo on day 1, day 4 and day 7. What changed? Where did the new growth come from?',
    evidence: 'Keeps it going for the full week. Notices where new growth starts. Asks follow-up questions.',
    traits: ['CU4', 'MP4', 'SR2'] },
  { id: 'B5', section: 'B', tier: 'stretch', title: 'My “I wonder” questions',
    student: 'Write two “I wonder…” questions about plants and food.\nChoose one. Find out the answer from a book, a video or a trusted website, or by asking an adult.\nWrite what you found, and where you found it.',
    evidence: 'Questions that go beyond the lesson. Uses a real source and names it.',
    traits: ['CU1', 'CU3'] },
  { id: 'B6', section: 'B', tier: 'challenge', title: 'Fair test: scraps in water or soil?',
    student: 'Design a fair test with two spring onion bottoms: one in water and one in soil.\n1. What will you change? What will you keep the same?\n2. What will you measure, and how often?\n3. Predict: which will grow better? Why?\n4. Run it for 7 days. Record your results in a table with photos.\n5. Was your prediction right? What would you do differently next time?',
    evidence: 'Controls variables without being told. Measures carefully. Reflects honestly on a wrong prediction.',
    traits: ['CU4', 'MP4', 'SR4', 'SR3', 'MP2'] },
  { id: 'B7', section: 'B', tier: 'challenge', title: 'Can our class feed the canteen?',
    student: 'Imagine our class wants to grow enough kang kong for every P3 student to have one serving at recess.\nUse your own plant data (how many leaves, how tall, how long it took).\n1. Estimate how many plants we would need.\n2. How much space would they take?\n3. What would we need to care for them every day?\nShow your working. Say which numbers you guessed and which you measured.',
    evidence: 'Connects their own data to a bigger idea. Shows systematic working. Keeps trying when the numbers get hard.',
    traits: ['SR5', 'SR4', 'MP2'],
    teacherNote: 'A Math link (multiplication, estimation). There is no single right answer: look at the reasoning.' },
  { id: 'B8', section: 'B', tier: 'challenge', title: 'Design a rooftop or corridor farm',
    student: 'Design a small farm for the school rooftop or an HDB corridor.\nDraw and label it. Include:\n• which plants you would grow and why\n• how they get light, water and nutrients\n• who cares for them during the school holidays\n• one problem your farm might have, and how you would solve it.',
    evidence: 'Original ideas. Applies plant needs to a new situation. Anticipates problems.',
    traits: ['SR3', 'SR5', 'MP5'] },
  { id: 'B9', section: 'B', tier: 'challenge', title: 'Food journey detective',
    student: 'Choose one food you like. Find out where it is grown and how it travels to Singapore.\nCompare it with a food that is grown in Singapore.\nWhich food should Singapore try to grow more of? Give two reasons using what you found out.',
    evidence: 'Gathers information on their own. Argues with evidence. Wants to discuss it further.',
    traits: ['CU3', 'MP4', 'SR5', 'CU2'] },

  /* Section E · Less food waste at home: find out how much (audit), why (5 Whys), then fix it with a use-me-first system */
  { id: 'E1', section: 'E', tier: 'challenge', title: 'Home food-waste audit',
    student: 'Be a food-waste detective for 7 days!\n1. Put a bowl or bag next to the bin. Every time food is thrown away, put it in there first.\n2. At the end of each day, weigh it on the kitchen scale (ask an adult to help).\n3. Sort it into two groups and weigh each: food that COULD have been eaten (leftovers, food that went bad) and food that could NOT (peels, bones, seeds).\n4. Record everything in a table: day, total grams, could-have-eaten grams, what the food was.\n5. Look for patterns: Which day was the most? Which meal? Which food came up again and again?',
    evidence: 'Measures every day without being reminded. Spots patterns others miss. Notices problems with the measuring (e.g. tiny amounts the scale cannot show).',
    traits: ['SR2', 'SR4', 'MP4', 'MP2'],
    teacherNote: 'Builds on B3 Food waste watch. Remind students to wash hands and to ask an adult before handling waste. Their data feeds the discussion questions in “Less food waste at home”.' },
  { id: 'E2', section: 'E', tier: 'challenge', title: 'The 5 Whys',
    student: 'Choose one food from your audit that could have been eaten.\nAsk “Why was it thrown away?” Then ask “Why?” about your answer. Keep going five times.\nExample: Rice was thrown away. Why? We cooked too much. Why? Nobody measured. Why? We guess every time…\nWrite your chain as a ladder or a chain of boxes.\nCircle the reason at the end: it should be a habit your family could change.',
    evidence: 'Goes past the first easy answer. Ends at a real cause, not a blame. Sees that one problem can have more than one cause.',
    traits: ['CU1', 'SR5', 'SR4'] },
  { id: 'E3', section: 'E', tier: 'core', title: 'Use me first!',
    student: 'Food gets wasted when it is forgotten at the back of the fridge.\nMake a simple “Use me first” reminder for your family. You could:\n• label a box “USE ME FIRST” and put food that must be eaten soon inside it\n• make colour stickers: green = fresh, yellow = eat soon, red = eat today\n• stick a note on the fridge door listing what to finish first.\nTake a photo of it in your fridge and upload it. Explain it to your family!',
    evidence: 'A clear, practical reminder placed where the family will see it. Explains it to the family.',
    traits: ['MP1', 'SR3'] },
  { id: 'E4', section: 'E', tier: 'challenge', title: 'Invent a use-me-first system',
    student: 'Design and build your own use-me-first system to stop food being forgotten: a labelled box, a colour-sticker code, a whiteboard chart, or your own idea.\n1. Draw your design and label it. Where in the fridge or kitchen will it go? Why there?\n2. Build it and explain it to your family.\n3. Test it for a week. Do your food-waste audit again and compare with your first week.\n4. Ask your family: What was easy? What did you forget? Then improve your design (version 2).\n5. Did your system work? How sure are you? What else could have changed the result?',
    evidence: 'An original design. A fair comparison (same way of weighing both weeks). Asks for feedback and improves the design instead of giving up.',
    traits: ['MP5', 'SR3', 'SR4', 'MP2'] },
  { id: 'E5', section: 'E', tier: 'core', title: 'Make a poster: less food waste at home',
    student: 'Make a poster that helps families waste less food. Choose ONE area:\n• My food-waste audit: what my family threw away, and what we found out\n• The 5 Whys: why one food was wasted, and the habit behind it\n• My use-me-first system: how it works, and why it helps\n\nYour poster must have:\n☐ a catchy title that tells your message\n☐ your evidence: your own numbers or chart, your 5 Whys chain, or your before-and-after\n☐ pictures or diagrams with labels\n☐ at least three science words (for example: wasted, fresh, compost, nutrients, habit)\n☐ a clear action for families: what should they do?\n☐ big writing, easy to read from 2 metres away\n\n🌱 Sprout: title, one fact, one picture and one action.\n🌿 Sapling: add a chart or table from your own data.\n🌳 Tree: show your 5 Whys chain or your before-and-after result, and what you improved.\n\nMake it on paper or on the computer. Upload a photo or the file to SLS.',
    evidence: 'Evidence from their own data rather than general tips. A message aimed at a real audience (their family). Accurate science words.',
    traits: ['SR1', 'SR5', 'MP5'],
    example: 'poster-example.html',
    teacherNote: 'Show the example poster first and ask the class to find each item on the checklist. Posters go on the tables for the Period 3 gallery walk.' },

  /* Section C · Reflect (all) */
  { id: 'C1', section: 'C', tier: 'core', title: 'My reflection',
    student: '1. What have you learnt about caring for plants?\n2. What have you learnt about food in Singapore?\n3. What inspired you? (a person, a video, something your plant did)\n4. What surprised you most? “I was surprised that…”\n5. What do you still wonder about? “I wonder…”',
    evidence: 'Depth of the “I wonder” question. Inspiration from outside the classroom.',
    traits: ['CU1', 'CU3'],
    teacherNote: 'Links to the lesson plan reflection R1–R5 (feelings, observe, care, learning beyond school, curiosity).' },
  { id: 'C2', section: 'C', tier: 'challenge', title: 'Teach it back',
    student: 'Make a 1-minute video, poster or comic that teaches a P1 student how to care for a plant, and why growing food matters for Singapore.\nUse at least three science words correctly (for example: germinate, nutrients, sunlight, roots, harvest).',
    evidence: 'Rich, accurate vocabulary. Explains clearly for a younger audience.',
    traits: ['SR1', 'MP5'] },

  /* Consolidation (Periods 3 and 4) */
  { id: 'D1', section: 'D', tier: 'challenge', title: 'Be the class expert',
    student: 'Share your Tree investigation with the class in 2 minutes:\n• What question did you ask?\n• What did you do?\n• What did you find out?\n• What would you test next?\nThen answer one question from a classmate.',
    evidence: 'Handles follow-up questions. Spots weaknesses in their own method. Wants to keep going.',
    traits: ['CU2', 'SR4', 'SR1'] },
  { id: 'D2', section: 'D', tier: 'stretch', title: 'Gallery walk questions',
    student: 'Walk around the gallery of graphs and regrown scraps. Leave one sticky note on two projects: one thing you noticed, and one “I wonder…” question.',
    evidence: 'Notices details in others’ work. Asks questions that push the idea further.',
    traits: ['SR2', 'CU1'] }
];

const CH_SECTIONS = {
  A: { title: 'Caring for my plant', emoji: '🪴', phase: 'sls' },
  B: { title: 'Food in Singapore', emoji: '🍽️', phase: 'sls' },
  E: { title: 'Less food waste at home', emoji: '♻️', phase: 'sls' },
  C: { title: 'Reflect', emoji: '💭', phase: 'sls' },
  D: { title: 'In class: consolidate', emoji: '💬', phase: 'consolidate' }
};

/* The questions in the Google Form (backend/FeedbackForm.gs builds the same form). evidence: checklist ids an answer can show. */
const CH_FORM = [
  { q: 'Class and register number', type: 'short', evidence: [] },
  { q: 'Which challenge level did you do?', type: 'choice', opts: ['🌱 Sprout', '🌿 Sapling', '🌳 Tree'], evidence: [] },
  { q: 'How much did you enjoy caring for your plant?', type: 'scale', evidence: ['MP5'] },
  { q: 'Which activity did you like most?', type: 'choice', opts: ['My care log', 'Where does my food come from?', 'Growing scraps', 'My line graph', 'My own investigation', 'Designing a farm'], evidence: [] },
  { q: 'When an activity was hard, what did you do?', type: 'choice', opts: ['I kept trying until I got it', 'I asked someone for help', 'I tried a different way', 'I stopped', 'Nothing was hard'], evidence: ['MP2'] },
  { q: 'What have you learnt about caring for plants?', type: 'para', evidence: ['SR1'] },
  { q: 'What have you learnt about food in Singapore?', type: 'para', evidence: ['SR5'] },
  { q: 'What inspired you?', type: 'para', evidence: ['CU3'] },
  { q: 'What do you still wonder about?', type: 'para', evidence: ['CU1'] },
  { q: 'Did you try anything extra on your own (outside SLS)? What was it?', type: 'para', evidence: ['MP4', 'CU4', 'MP3'] },
  { q: 'Would you like harder challenges next time?', type: 'choice', opts: ['Yes, please!', 'Maybe', 'Not yet'], evidence: ['MP5'] },
  { q: 'One thing I will do at home to waste less food', type: 'short', evidence: [] }
];

/* How AI was used to design these tasks: the prompts, so colleagues can reuse them for other topics. */
const CH_AI_DESIGN = [
  { step: '1 · Start from the checklist, not the activity', text: 'Give the AI the three checklists (curiosity, motivation and persistence, scientific reasoning) and ask what kinds of task would let a P3 student show each behaviour. The tasks were built backwards from the evidence you want to see.' },
  { step: '2 · Ask for tiers with the same core', text: 'Ask for a Core task every student can do, then Stretch and Challenge tasks on the same topic, so the whole class talks about the same ideas in the discussion.' },
  { step: '3 · Ask for the evidence', text: 'For every task, ask: “Which checklist behaviours could this reveal, and what exactly would a student say or do that shows it?” This is the Evidence line on each card.' },
  { step: '4 · Check it as a teacher', text: 'Check every fact (e.g. food figures against the Singapore Food Agency), the reading level for P3 and safety at home. The AI drafts; the teacher decides.' }
];
