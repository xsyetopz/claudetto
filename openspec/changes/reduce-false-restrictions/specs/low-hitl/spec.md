## ADDED Requirements

### Requirement: A Cut Classifier Reply Is Named

When the classifier reply holds no verdict, the denial SHALL name the cause: a failed call with its status, an abort or time limit, a reply cut by its token budget, or a reply with no text. A cut reply SHALL still deny, because the classifier fails closed.

#### Scenario: Reply Cut by the Budget

- **WHEN** the model stops at its token budget before it writes `<block>`
- **THEN** the call is denied, and the denial says that the reply was cut by the budget

#### Scenario: Failed Call

- **WHEN** the model call fails with an HTTP status
- **THEN** the call is denied, and the denial gives the status and the error
