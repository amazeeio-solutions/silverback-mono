## INTRODUCTION

Base AI functionality for Silverback.

## REQUIREMENTS

- Media
- Webform (using some webform elements on reporting)

## INSTALLATION

Install as you would normally install a contributed Drupal module. See:
<https://www.drupal.org/node/895232> for further information.

## CONFIGURATION

- Open AI credentials can be set on:
  `/admin/config/system/silverback-ai-settings`. It is recommended though to add
  the Open AI Api key as environment variable (`OPEN_AI_API_KEY`).

## USAGE TRACKING

The Silverback AI module tracks OpenAI API token usage for monitoring and cost
management purposes:

- All Silverback AI submodules automatically report their token usage through
  the `TokenUsage` service
- Usage statistics can be viewed at `/admin/reports/silverback-ai-usage`
- The report shows:
  - Total tokens used per module
  - Cost estimates based on current OpenAI pricing
  - Usage breakdown by time period
  - Details of individual API calls
