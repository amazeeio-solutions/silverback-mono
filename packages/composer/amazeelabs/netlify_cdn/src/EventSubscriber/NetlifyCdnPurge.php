<?php

namespace Drupal\netlify_cdn\EventSubscriber;
use Drupal\Core\Utility\Error;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpKernel\Event\TerminateEvent;
use Symfony\Component\HttpKernel\KernelEvents;

class NetlifyCdnPurge implements EventSubscriberInterface {

  const NETLIFY_PURGE_API_URL = 'https://api.netlify.com/api/v1/purge';

  const NETLIFY_PURGE_SUCCESS_CODE = 202;

  public static function getSubscribedEvents() {
    // Set this event's priority to very high, to make sure that other terminate
    // events do not destruct for example the static cache.
    $events[KernelEvents::TERMINATE][] = ['onKernelTerminate', 1000];
    return $events;
  }

  public function onKernelTerminate(TerminateEvent $event) {
    $cacheTagsToInvalidate = &drupal_static('netlify_cdn_image_style_flush', []);
    // No cache tags to invalidate, just exit.
    if (empty($cacheTagsToInvalidate)) {
      return;
    }
    $this->purge(array_unique($cacheTagsToInvalidate));
  }

  /**
   * Purge the netlify cache based on cache tags.
   *
   * This method might be moved to another service in the future, in case there
   * will be other types of events triggering the cache purge.
   *
   * @param string[] $tags
   *  An array of cache tags.
   *
   * @return void
   */
  protected function purge(array $tags = []) {
    $sites = $this->getSites();
    if (empty($sites)) {
      \Drupal::logger('netlify_cdn')->error('The are no netlify sites defined using NETLIFY_CDN_AUTH_TOKEN and NETLIFY_CDN_SITE_ID variables. Please read the README.md file of the netlify_cdn module to check how you can configure those env variables.');
      return;
    }
    foreach ($sites as $authToken => $siteIds) {
      if (empty($siteIds)) {
        continue;
      }
      foreach ($siteIds as $siteId) {
        $data = [
          'site_id' => $siteId,
          'cache_tags' => $tags,
        ];
        $headers = [
          'Content-Type' => 'application/json',
          'Authorization' => 'Bearer ' . $authToken,
        ];
        try {
          \Drupal::logger('netlify_cdn')->info("Netlify CDN purge call with tags: @tags", ['@tags' => implode(', ', $tags)]);
          $result = \Drupal::httpClient()->post(self::NETLIFY_PURGE_API_URL, [
            'body' => json_encode($data),
            'headers' => $headers
          ]);
          if ($result->getStatusCode() !== self::NETLIFY_PURGE_SUCCESS_CODE) {
            throw new \Exception("Wrong status code received from the netlify CDN purge call. Code received: " . $result->getStatusCode());
          }
          \Drupal::logger('netlify_cdn')->info('Netlify CDN purge successful.');
        } catch (\Exception $e) {
          Error::logException(\Drupal::logger('netlify_cdn'), $e);
        }
      }
    }
  }

  /**
   * Builds an array of netlify site ids based on the available env variables.
   *
   * Each entry of the array will have as key the auth token and as value
   * another array that is just a list of site ids corresponding to that auth
   * token.
   *
   * @return array
   */
  protected function getSites() {
    $envVars = getenv();
    $sites = [];
    foreach ($envVars as $envVarName => $envVarValue) {
      if (!str_starts_with($envVarName, 'NETLIFY_CDN_AUTH_TOKEN_')) {
        continue;
      }
      $authIdentifier = substr($envVarName, strlen('NETLIFY_CDN_AUTH_TOKEN_'));
      $sites[$envVarValue] = [];
      $siteVarPrefix = 'NETLIFY_CDN_SITE_ID_' . $authIdentifier . '_';
      foreach ($envVars as $siteVarName => $siteVarValue) {
        if (!str_starts_with($siteVarName, $siteVarPrefix)) {
          continue;
        }
        $sites[$envVarValue][] = $siteVarValue;
      }
    }
    return $sites;
  }

}
