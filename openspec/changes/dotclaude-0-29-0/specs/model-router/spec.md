## MODIFIED Requirements

### Requirement: Search decides the frontmatter

The evals MAY search the frontmatter of an agent role.
When it does, a search SHALL run the cases of one role against the reference pair of that role, and keep the cheapest pair with no loss against the reference in the rates that the suite can express.
The order of priority SHALL be quality, then savings, then speed (design D18).

#### Scenario: Cheaper pair passes

- **WHEN** Haiku 5.5 at `medium` shows no loss against Sonnet 5.5 at `medium` for the `investigator` role
- **THEN** the agent file holds Haiku 5.5 at `medium` or a cheaper passing pair

#### Scenario: Rates compared

- **WHEN** a search compares a pair
- **THEN** it compares the resolve rate, the over-claim rate, the policy-violation rate, and the wrongful-revert rate, for each rate that the suite can express

## ADDED Requirements

### Requirement: Roster cost pilot

Before a release that changes the model of an agent, a pilot SHALL measure the cost of each changed agent with `just usage`.
The wiki SHALL give the date, the run count, and the cost for each run of the old and the new pair.

#### Scenario: Model change

- **WHEN** the model of `investigator` changes from Haiku 5.5 to Sonnet 5.5
- **THEN** the wiki gives the cost for each run of both models, from the pilot
