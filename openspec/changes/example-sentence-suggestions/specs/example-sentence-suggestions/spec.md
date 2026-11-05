# Spec Delta

## Purpose

Allows users to add a real example sentence when a captured word or phrase has no surrounding context. Suggestions come from a free multilingual sentence source and remain optional and editable.

## ADDED Requirements

### Requirement: Suggest examples when the example is empty
When a captured word or phrase has no example sentence, LexBrain SHALL offer up to five matching sample sentences in the detected source language from a free online source whose content may be used in the product.

#### Scenario: Suggestions are available for an empty example
- **WHEN** a user captures a word or phrase and its example sentence is empty
- **THEN** LexBrain displays up to five matching sentences in the detected source language with the source identified

#### Scenario: No source language can be used
- **WHEN** the source language is unknown or unsupported by the sentence source
- **THEN** LexBrain does not show results from a different language and leaves manual example entry available

### Requirement: Keep the example under user control
LexBrain SHALL preserve existing or user-entered example text and SHALL save a suggested sentence only after the user selects it and saves the card.

#### Scenario: Captured context already exists
- **WHEN** a captured word or phrase already has a non-empty example sentence
- **THEN** LexBrain keeps that sentence and does not replace it with online suggestions

#### Scenario: User selects and edits a suggestion
- **WHEN** a user selects a suggested sentence
- **THEN** LexBrain places it in the editable example field, where the user may edit or clear it before saving

#### Scenario: User types while suggestions load
- **WHEN** the user enters an example before an asynchronous lookup completes
- **THEN** the lookup does not overwrite the user's text

#### Scenario: Capture changes while suggestions load
- **WHEN** a different word or phrase replaces the current capture before its example lookup completes
- **THEN** suggestions for the previous capture are discarded and cannot be displayed or selected for the new capture

### Requirement: Keep example lookup optional
An example lookup failure or empty result SHALL NOT prevent the user from entering an example, saving without one, or completing the existing translation and capture flow.

#### Scenario: Lookup returns no results or fails
- **WHEN** the source returns no matching sentences or cannot be reached
- **THEN** LexBrain leaves the example field usable and allows the existing save flow to continue

### Requirement: Disclose and limit example lookup data
For an example lookup, LexBrain SHALL disclose that the selected word or phrase and its detected source language are sent to Tatoeba, link to its Terms of Use including its privacy section, and SHALL NOT include captured page context, source URL, saved card content, or study data as lookup inputs. The disclosure SHALL NOT claim that Tatoeba specifies API-query retention when its published terms do not say so.

#### Scenario: Example lookup is requested
- **WHEN** LexBrain requests sample sentences
- **THEN** the privacy information identifies Tatoeba, the selected word or phrase, source language, and Tatoeba's Terms of Use, and no captured page context or card/study data is included in the lookup inputs