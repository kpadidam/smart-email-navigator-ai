Feature: Enhanced Email Categorization
  As an email user
  I want my emails automatically categorized with security analysis
  So that I can focus on important messages and avoid threats

  Scenario: Categorize a meeting invitation
    Given I have the enhanced email categorizer
    When I process an email with subject "Team Meeting Tomorrow 2pm"
    Then it should be categorized as "Meetings"
    And the confidence should be at least 85 percent
    And it should extract the meeting time "2pm"

  Scenario: Identify a delivery notification
    Given I have the enhanced email categorizer
    When I process an email from "tracking@fedex.com" with tracking number "123456789"
    Then it should be categorized as "Deliveries"
    And it should extract the tracking number
    And the confidence should be at least 90 percent

  Scenario: Detect a phishing attempt
    Given I have the enhanced email categorizer
    When I process an email claiming "You won $1000000 click here"
    Then it should be categorized as "Phishing/Spam/Scam"
    And the security risk should be "HIGH"
    And the confidence should be at least 95 percent