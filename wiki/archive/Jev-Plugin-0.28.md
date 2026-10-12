# Jev plugin of 0.28.0

This page keeps the 0.28.0 text of the `dotclaude-jev` add-on.
In 1.0.0 the add-on is gone, and Jev is the `decide` slice of the core plugin.
The decision that split the add-ons is still in force ([Decisions: layout](Decisions-Layout)).

- `dotclaude-jev` registered a custom tool and not a skill.
  A custom tool cost about 10 tokens in the deferred list, against about 60 for a skill line.
  With `TYPESAFE_API_KEY` set, Claude asked Jev, and the handler put the options in a random order.
  When Jev failed, the tool result said that no second opinion was available.
