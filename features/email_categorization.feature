Feature: AI-Powered Email Categorization
  As a busy professional
  I want my emails automatically categorized by AI
  So that I can quickly focus on important messages

  Scenario: Categorize incoming work email
    Given I am authenticated with my Gmail account
    When a new work email arrives from "boss@company.com"
    Then the AI should categorize it as "work" with confidence above 70%
    And the email should appear in my work category inbox

  Scenario: Categorize promotional email
    Given I am authenticated with my Gmail account  
    When a promotional email arrives with subject "50% OFF Sale"
    Then the AI should categorize it as "promotional" with confidence above 70%
    And the email should appear in my promotional category inbox

  Scenario: Process batch of mixed emails
    Given I am authenticated with my Gmail account
    When I sync 10 new emails of different types
    Then all emails should be categorized within 2 seconds
    And each email should have a category and confidence score
    And my smart inbox should show emails grouped by category