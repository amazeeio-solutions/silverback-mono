# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [2.0.8](https://github.com/AmazeeLabs/silverback-mono/compare/@-amazeelabs/silverback_external_preview@2.0.7...@-amazeelabs/silverback_external_preview@2.0.8) (2025-01-17)


### Bug Fixes

* use correct revision id on latest_version route ([5f27eed](https://github.com/AmazeeLabs/silverback-mono/commit/5f27eed381c9e4792a45045ee4c47659e4d272a4))





## [2.0.7](https://github.com/AmazeeLabs/silverback-mono/compare/@-amazeelabs/silverback_external_preview@2.0.6...@-amazeelabs/silverback_external_preview@2.0.7) (2024-09-09)

**Note:** Version bump only for package @-amazeelabs/silverback_external_preview





## [2.0.6](https://github.com/AmazeeLabs/silverback-mono/compare/@-amazeelabs/silverback_external_preview@2.0.5...@-amazeelabs/silverback_external_preview@2.0.6) (2024-05-10)

**Note:** Version bump only for package @-amazeelabs/silverback_external_preview





## [2.0.5](https://github.com/AmazeeLabs/silverback-mono/compare/@-amazeelabs/silverback_external_preview@2.0.4...@-amazeelabs/silverback_external_preview@2.0.5) (2024-05-09)

**Note:** Version bump only for package @-amazeelabs/silverback_external_preview





# Change Log

All notable changes to this project will be documented in this file. See
[Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [2.0.4](https://github.com/AmazeeLabs/silverback-mono/compare/@-amazeelabs/silverback_external_preview@2.0.3...@-amazeelabs/silverback_external_preview@2.0.4) (2023-08-24)

**Note:** Version bump only for package @-amazeelabs/silverback_external_preview

# Change Log

All notable changes to this project will be documented in this file. See
[Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [2.0.3](https://github.com/AmazeeLabs/silverback-mono/compare/@-amazeelabs/silverback_external_preview@2.0.2...@-amazeelabs/silverback_external_preview@2.0.3) (2023-05-30)

### Bug Fixes

- catch the UndefinedLinkTemplateException when generating the preview link
  ([3aaac4d](https://github.com/AmazeeLabs/silverback-mono/commit/3aaac4d3abe4683933d2506774fd34f1135d4309))

# Change Log

All notable changes to this project will be documented in this file. See
[Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [2.0.2](https://github.com/AmazeeLabs/silverback-mono/compare/@-amazeelabs/silverback_external_preview@2.0.1...@-amazeelabs/silverback_external_preview@2.0.2) (2023-05-25)

### Bug Fixes

- remove the deprecated EXTERNAL_PREVIEW_BASE_URL env var check
  ([9af4e6c](https://github.com/AmazeeLabs/silverback-mono/commit/9af4e6cf2316f95d82270b33820eafbf64b91549))

# Change Log

All notable changes to this project will be documented in this file. See
[Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [2.0.1](https://github.com/AmazeeLabs/silverback-mono/compare/@-amazeelabs/silverback_external_preview@2.0.0...@-amazeelabs/silverback_external_preview@2.0.1) (2023-03-23)

**Note:** Version bump only for package @-amazeelabs/silverback_external_preview

# Change Log

All notable changes to this project will be documented in this file. See
[Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [2.0.0](https://github.com/AmazeeLabs/silverback-mono/compare/@-amazeelabs/silverback_external_preview@1.3.4...@-amazeelabs/silverback_external_preview@2.0.0) (2023-02-02)

- feat(silverback_external_preview)!: update preview links to use new
  \_\_preview path on the frontend
  ([fd22061](https://github.com/AmazeeLabs/silverback-mono/commit/fd220614f89e8c1fe1297119de4881c52521b559))

### BREAKING CHANGES

- preview and live hosts are Drupal config settings, rather than ENV vars.

# Change Log

All notable changes to this project will be documented in this file. See
[Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [1.3.4](https://github.com/AmazeeLabs/silverback-mono/compare/@-amazeelabs/silverback_external_preview@1.3.3...@-amazeelabs/silverback_external_preview@1.3.4) (2023-01-30)

**Note:** Version bump only for package @-amazeelabs/silverback_external_preview

# Change Log

All notable changes to this project will be documented in this file. See
[Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [1.3.3](https://github.com/AmazeeLabs/silverback-mono/compare/@-amazeelabs/silverback_external_preview@1.3.2...@-amazeelabs/silverback_external_preview@1.3.3) (2023-01-24)

**Note:** Version bump only for package @-amazeelabs/silverback_external_preview

## [1.3.2](https://github.com/AmazeeLabs/silverback-mono/compare/@-amazeelabs/silverback_external_preview@1.3.1...@-amazeelabs/silverback_external_preview@1.3.2) (2022-08-16)

### Bug Fixes

- preview entity url language prefix
  ([6d761eb](https://github.com/AmazeeLabs/silverback-mono/commit/6d761ebeec54b111eb7061083c944df2468adb50))

## [1.3.1](https://github.com/AmazeeLabs/silverback-mono/compare/@-amazeelabs/silverback_external_preview@1.3.0...@-amazeelabs/silverback_external_preview@1.3.1) (2022-07-11)

### Bug Fixes

- make external preview computed field private by default
  ([80e0a20](https://github.com/AmazeeLabs/silverback-mono/commit/80e0a203e648360135c46e50d5799bdc7f8aae44))
- typo
  ([5ef654a](https://github.com/AmazeeLabs/silverback-mono/commit/5ef654ac5c0ad4aba9dcc27030323feacd741f3c))

# [1.3.0](https://github.com/AmazeeLabs/silverback-mono/compare/@-amazeelabs/silverback_external_preview@1.2.1...@-amazeelabs/silverback_external_preview@1.3.0) (2022-07-07)

### Features

- add hook_silverback_external_preview_entity_url_alter()
  ([994d987](https://github.com/AmazeeLabs/silverback-mono/commit/994d98766e9ec27c31f1b698da8d1a74ab14ecce))
- add unpublished preview url, fix tempstore id with no langcode
  ([5539783](https://github.com/AmazeeLabs/silverback-mono/commit/5539783cf98e6829e6baa029695b93fe615c6181))

## [1.2.1](https://github.com/AmazeeLabs/silverback-mono/compare/@-amazeelabs/silverback_external_preview@1.2.0...@-amazeelabs/silverback_external_preview@1.2.1) (2022-07-05)

**Note:** Version bump only for package @-amazeelabs/silverback_external_preview

# [1.2.0](https://github.com/AmazeeLabs/silverback-mono/compare/@-amazeelabs/silverback_external_preview@1.1.12...@-amazeelabs/silverback_external_preview@1.2.0) (2022-06-28)

### Bug Fixes

- add \_\_preview prefix
  ([79e6131](https://github.com/AmazeeLabs/silverback-mono/commit/79e6131aa67d52a416f50f4ef742ad1f88e412cb))

### Features

- preview url for revisions
  [#1062](https://github.com/AmazeeLabs/silverback-mono/issues/1062)
  ([9ba3f7f](https://github.com/AmazeeLabs/silverback-mono/commit/9ba3f7fbd04ef0459880e03b12398f3cb3281fb0))
- show live/preview version on node page in Drupal
  [#1062](https://github.com/AmazeeLabs/silverback-mono/issues/1062)
  ([bc6cde9](https://github.com/AmazeeLabs/silverback-mono/commit/bc6cde936a6b15c82c00427601f312f77fceb6bc))

## [1.1.12](https://github.com/AmazeeLabs/silverback-mono/compare/@-amazeelabs/silverback_external_preview@1.1.11...@-amazeelabs/silverback_external_preview@1.1.12) (2022-06-16)

### Bug Fixes

- **external_preview:** get entity from last index in route match param array
  instead of first
  ([ff12637](https://github.com/AmazeeLabs/silverback-mono/commit/ff12637130d26c74a045e79ce41fe103d8b06c84))

## [1.1.11](https://github.com/AmazeeLabs/silverback-mono/compare/@-amazeelabs/silverback_external_preview@1.1.10...@-amazeelabs/silverback_external_preview@1.1.11) (2022-06-16)

### Bug Fixes

- **external_preview:** resolve fatal error on frontend
  ([10ee0d5](https://github.com/AmazeeLabs/silverback-mono/commit/10ee0d52d748841077dfd1bba50feb4685037886))

## [1.1.10](https://github.com/AmazeeLabs/silverback-mono/compare/@-amazeelabs/silverback_external_preview@1.1.9...@-amazeelabs/silverback_external_preview@1.1.10) (2022-06-16)

**Note:** Version bump only for package @-amazeelabs/silverback_external_preview

## [1.1.9](https://github.com/AmazeeLabs/silverback-mono/compare/@-amazeelabs/silverback_external_preview@1.1.8...@-amazeelabs/silverback_external_preview@1.1.9) (2022-06-16)

**Note:** Version bump only for package @-amazeelabs/silverback_external_preview

## [1.1.8](https://github.com/AmazeeLabs/silverback-mono/compare/@-amazeelabs/silverback_external_preview@1.1.7...@-amazeelabs/silverback_external_preview@1.1.8) (2022-06-15)

### Bug Fixes

- **external_preview:** replace preview tempstore path with content entity id as
  key_value key
  ([34300b9](https://github.com/AmazeeLabs/silverback-mono/commit/34300b9ad29cb4eb12818bca2fa38c05690034cd))

## [1.1.7](https://github.com/AmazeeLabs/silverback-mono/compare/@-amazeelabs/silverback_external_preview@1.1.6...@-amazeelabs/silverback_external_preview@1.1.7) (2022-04-21)

**Note:** Version bump only for package @-amazeelabs/silverback_external_preview

## [1.1.6](https://github.com/AmazeeLabs/silverback-mono/compare/@-amazeelabs/silverback_external_preview@1.1.5...@-amazeelabs/silverback_external_preview@1.1.6) (2022-04-20)

### Bug Fixes

- **silverback_external_preview:** preview button caching
  ([45a2c19](https://github.com/AmazeeLabs/silverback-mono/commit/45a2c198e187a16617648f9bd04151d32ea99afd))

## [1.1.5](https://github.com/AmazeeLabs/silverback-mono/compare/@-amazeelabs/silverback_external_preview@1.1.4...@-amazeelabs/silverback_external_preview@1.1.5) (2022-04-12)

### Bug Fixes

- set external preview toolbar item to cache based on URL
  ([296218a](https://github.com/AmazeeLabs/silverback-mono/commit/296218ab7560f78edf9a6799e18edebdc2371512))

## [1.1.4](https://github.com/AmazeeLabs/silverback-mono/compare/@-amazeelabs/silverback_external_preview@1.1.3...@-amazeelabs/silverback_external_preview@1.1.4) (2021-12-27)

**Note:** Version bump only for package @-amazeelabs/silverback_external_preview

## [1.1.3](https://github.com/AmazeeLabs/silverback-mono/compare/@-amazeelabs/silverback_external_preview@1.1.2...@-amazeelabs/silverback_external_preview@1.1.3) (2021-10-18)

### Bug Fixes

- restrict preview link to content entity types only
  ([feb1134](https://github.com/AmazeeLabs/silverback-mono/commit/feb1134341aaec5340f8960fc7659a1fa95105ea))

## [1.1.2](https://github.com/AmazeeLabs/silverback-mono/compare/@-amazeelabs/silverback_external_preview@1.1.1...@-amazeelabs/silverback_external_preview@1.1.2) (2021-10-11)

**Note:** Version bump only for package @-amazeelabs/silverback_external_preview

## [1.1.1](https://github.com/AmazeeLabs/silverback-mono/compare/@-amazeelabs/silverback_external_preview@1.1.0...@-amazeelabs/silverback_external_preview@1.1.1) (2021-07-15)

### Bug Fixes

- **gatsby:** style preview button label with higher precedence
  ([2fbea36](https://github.com/AmazeeLabs/silverback-mono/commit/2fbea367eebb6cccb43d7b79cbf410981b17c95b))
- **gatsby:** trim trailing slashes from preview base urls
  ([9bc52e6](https://github.com/AmazeeLabs/silverback-mono/commit/9bc52e65a45bc132498b9b111315a8aaf4a3250e))

# 1.1.0 (2021-07-15)

### Bug Fixes

- **gatsby:** add missing module dependency to preview module
  ([5eedac3](https://github.com/AmazeeLabs/silverback-mono/commit/5eedac323f0f19d17f3d9fccc5747daf9b1c04f9))

### Features

- **slb-144:** initial work on toolbar external preview button
  ([b6bc050](https://github.com/AmazeeLabs/silverback-mono/commit/b6bc05057eaeaa41bdff3683fceb762262d7dcdc))
