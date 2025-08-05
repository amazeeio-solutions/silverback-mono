# Silverback

⚠️ This repository is deprecated. If you need to work on a package from this
repo:

- Move the package to
  [silverback-template](https://github.com/AmazeeLabs/silverback-template) repo
- Delete the package from this repo

## What is this?

This is the Amazee Labs _Silverback_ monorepo. A central hub for open source
packages and tools.

## Directory structure

- `packages/npm`: npm packages
- `packages/composer`: composer php packages
- `apps`: applications that use the two above

## Setup locally

### Requirements

- Install [devbox](https://www.jetify.com/devbox/docs/installing_devbox/)
- Install [direnv](https://direnv.net/docs/installation.html) (and don't forget
  about the [hook](https://direnv.net/docs/hook.html))

With `devbox` and `direnv` installed, switching to the project directory will
automatically load the proper versions of PHP/Node.js/etc into the environment.

### Setup

```sh
git clone https://github.com/AmazeeLabs/silverback-mono.git
cd silverback-mono
pnpm i
pnpm build
```

## Notes

- `.envrc` is created automatically via composer install, however it won't be
  overwritten If it already exists.
