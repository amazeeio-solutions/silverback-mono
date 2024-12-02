## INTRODUCTION

The Silverback Image AI module provides AI-powered functionality for image
management in Drupal. Its main features include:

- Automatic generation of alt text for images using AI
- Intelligent image analysis and description
- Accessibility improvements through better image descriptions
- Integration with OpenAI's vision models for image processing

The module aims to enhance the accessibility and SEO of your Drupal site by
ensuring all images have meaningful alternative text.

## REQUIREMENTS

- Silveback AI module

## INSTALLATION

Install as you would normally install a contributed Drupal module. See:
<https://www.drupal.org/node/895232> for further information.

## CONFIGURATION

- Base settings form: `/admin/config/system/silverback/image-ai-settings`.

## SERVICES

### ImageAiUtilities Service

The `ImageAiUtilities` service provides core functionality for AI-powered image
processing. It handles:

- Generation of ALT text for images using OpenAI's vision models
- Processing of image files and media entities
- Integration with OpenAI's API for image analysis
- Token usage tracking and logging
