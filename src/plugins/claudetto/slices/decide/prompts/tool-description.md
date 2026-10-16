Asks Jev, a decision model, for a second opinion on a choice that facts can settle.
Use it for a close call or a technical choice, and when the user asks for a second opinion.
Do not use it for goals, preferences, or approvals, because only the user decides those.
Jev returns a pick and a confidence from 0 to 1.
The question, the options, and the state go to the TypeSafe API, so put no secret and no personal data in them.
Keep the question neutral, because a leading question gets the answer that it leads to.
Give each option with one fact for it and one fact against it.
Leave out the lean of the user, the notes, or the team, because Jev judges the facts only.
The tool puts the options in a random order.
When Jev gives no answer, the tool uses a small Claude model, and it says so in its result.
When you do not follow the pick, tell the user and give the reason.
