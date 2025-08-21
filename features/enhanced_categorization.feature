Feature: Enhanced Email Categorization System
  As an email user
  I want emails categorized into Meetings, Deliveries, Important, and Phishing/Spam/Scam
  So that I can quickly identify and respond to different types of emails

  Scenario: Categorize meeting invitation email
    Given I have an email categorizer system
    When I receive an email with subject "Team Meeting Tomorrow at 2 PM"
    And the email contains "Please join us for our weekly team sync"
    And the email has a calendar invite attachment
    Then the email should be categorized as "Meetings"
    And the confidence score should be above 85%
    And the reasoning should mention "calendar invite" and "meeting keywords"

  Scenario: Categorize delivery notification email  
    Given I have an email categorizer system
    When I receive an email from "tracking@fedex.com"
    And the subject contains "Your package is on its way"
    And the body contains tracking number "123456789012"
    Then the email should be categorized as "Deliveries"
    And the confidence score should be above 90%
    And the reasoning should mention "tracking number" and "shipping provider"

  Scenario: Categorize important urgent email
    Given I have an email categorizer system
    When I receive an email marked as high priority
    And the subject contains "URGENT: Action Required by EOD"
    And the sender is from executive management
    Then the email should be categorized as "Important"
    And the confidence score should be above 95%
    And the reasoning should mention "urgent keywords" and "high priority flag"

  Scenario: Detect phishing scam email
    Given I have an email categorizer system
    When I receive an email claiming "You've won $1,000,000"
    And the email contains suspicious links "http://bit.ly/claim-prize"
    And asks for personal information like SSN
    Then the email should be categorized as "Phishing/Spam/Scam"
    And the confidence score should be above 98%
    And the security risk score should be "HIGH"
    And the reasoning should mention "suspicious links" and "scam patterns"

  Scenario: Handle ambiguous email
    Given I have an email categorizer system
    When I receive an email about "Important delivery meeting tomorrow"
    Then the system should identify multiple possible categories
    And provide confidence scores for each category
    And select the highest confidence category as primary