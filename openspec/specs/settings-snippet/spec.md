# settings-snippet Specification

## Purpose

The tools that the settings snippet of the setup turns on or off.

## Requirements

### Requirement: No Denied Tool That `claudetto` Needs

The system SHALL not deny a tool that a claudetto text or hook tells the model to use.

#### Scenario: A Prompt Names a Tool

- **WHEN** a test reads each prompt of the plugin and the deny list of the snippet
- **THEN** no tool that a prompt names is in the deny list
