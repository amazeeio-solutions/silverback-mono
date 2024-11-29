<?php

namespace Drupal\silverback_ai\HttpClient;

use Drupal\Core\Config\ConfigFactoryInterface;
use Drupal\Core\Http\ClientFactory;
use GuzzleHttp\Client;

/**
 * Custom HTTP client for OpenAI API.
 */
class OpenAiHttpClient extends Client {

  /**
   * Constructs a new OpenAiHttpClient object.
   *
   * @param \Drupal\Core\Http\ClientFactory $http_client_factory
   *   The HTTP client factory.
   * @param \Drupal\Core\Config\ConfigFactoryInterface $config_factory
   *   The config factory.
   */
  public function __construct(ClientFactory $http_client_factory, ConfigFactoryInterface $config_factory) {
    $config = $config_factory->get('silverback_ai.settings');
    $open_ai_api_key = $config->get('open_ai_api_key') ?? '';
    $open_ai_base_uri = $config->get('open_ai_base_uri') ?: 'https://api.openai.com/v1/';

    $options = [
      'base_uri' => $open_ai_base_uri,
      'headers' => [
        'Authorization' => 'Bearer ' . $open_ai_api_key,
        'Content-Type' => 'application/json',
      ],
    ];

    parent::__construct($options);
  }

}
