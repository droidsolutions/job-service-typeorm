## [3.0.1](https://github.com/droidsolutions/job-service-typeorm/compare/v3.0.0...v3.0.1) (2023-11-20)


### Bug Fixes

* **JobRepo:** create copy of logger meta ([d8876a0](https://github.com/droidsolutions/job-service-typeorm/commit/d8876a0e71de281842541fc9d09707bd37a3efe1))

# [3.0.0](https://github.com/droidsolutions/job-service-typeorm/compare/v2.0.1...v3.0.0) (2023-08-11)


### Features

* replace cancellationtoken with AbortSignal ([49a5952](https://github.com/droidsolutions/job-service-typeorm/commit/49a5952fbbd4aadadcd4653fe69e5b4d4cf0e869))


### BREAKING CHANGES

* Replace the cancellationtoken in async method with NodeJS internal AbortSignal

## [2.0.1](https://github.com/droidsolutions/job-service-typeorm/compare/v2.0.0...v2.0.1) (2023-08-01)


### Bug Fixes

* **JobRepository:** clean up job start time on finish ([f61a33d](https://github.com/droidsolutions/job-service-typeorm/commit/f61a33d68deb3ed842f2c14031ed0c1b754216ba))

# [2.0.0](https://github.com/droidsolutions/job-service-typeorm/compare/v1.1.0...v2.0.0) (2023-04-05)


### Bug Fixes

* **JobRepository:** find Requested jobs ([2a151ad](https://github.com/droidsolutions/job-service-typeorm/commit/2a151ade851100dfac6965e4eb42c8bd1b7b59b5))
* update job-service to include merged feature ([f576ca9](https://github.com/droidsolutions/job-service-typeorm/commit/f576ca97b82d01485e9a3731fde5716fd04c0803))


### Features

* allow find started jobs ([9bf253f](https://github.com/droidsolutions/job-service-typeorm/commit/9bf253f6f1d305a96dba8bcd1b793e723313f14e))


### BREAKING CHANGES

* JobRepository.findExistingJobAsync has an additional includeStarted argument

# [2.0.0-develop.3](https://github.com/droidsolutions/job-service-typeorm/compare/v2.0.0-develop.2...v2.0.0-develop.3) (2023-01-30)


### Bug Fixes

* **JobRepository:** find Requested jobs ([2a151ad](https://github.com/droidsolutions/job-service-typeorm/commit/2a151ade851100dfac6965e4eb42c8bd1b7b59b5))

# [2.0.0-develop.2](https://github.com/droidsolutions/job-service-typeorm/compare/v2.0.0-develop.1...v2.0.0-develop.2) (2022-11-03)


### Bug Fixes

* update job-service to include merged feature ([f576ca9](https://github.com/droidsolutions/job-service-typeorm/commit/f576ca97b82d01485e9a3731fde5716fd04c0803))


### Features

* **jobRepository:** add countJobsAsync method ([2f0951b](https://github.com/droidsolutions/job-service-typeorm/commit/2f0951b25a8713c1d23a91c769abd15376d776af))

# [2.0.0-develop.1](https://github.com/droidsolutions/job-service-typeorm/compare/v1.0.0...v2.0.0-develop.1) (2022-07-05)


### Features

* allow find started jobs ([9bf253f](https://github.com/droidsolutions/job-service-typeorm/commit/9bf253f6f1d305a96dba8bcd1b793e723313f14e))


### BREAKING CHANGES

* JobRepository.findExistingJobAsync has an additional includeStarted argument

# [1.1.0](https://github.com/droidsolutions/job-service-typeorm/compare/v1.0.0...v1.1.0) (2022-11-03)


### Features

* **jobRepository:** add countJobsAsync method ([2f0951b](https://github.com/droidsolutions/job-service-typeorm/commit/2f0951b25a8713c1d23a91c769abd15376d776af))

# 1.0.0 (2022-05-11)


### Bug Fixes

* **NPM:** correct main path ([8044e09](https://github.com/droidsolutions/job-service-typeorm/commit/8044e09a6a10b9907acece0ca949651496cbbf08))
* **release:** fix initial release ([03d750b](https://github.com/droidsolutions/job-service-typeorm/commit/03d750b3bea75115dfad1a9d0fb80b433e5e5142))


### Features

* initial release ([bee9527](https://github.com/droidsolutions/job-service-typeorm/commit/bee952706e679d4728989d958d444d53c3b8daf7))

# 1.0.0-develop.1 (2022-05-11)


### Bug Fixes

* **NPM:** correct main path ([8044e09](https://github.com/droidsolutions/job-service-typeorm/commit/8044e09a6a10b9907acece0ca949651496cbbf08))
* **release:** fix initial release ([03d750b](https://github.com/droidsolutions/job-service-typeorm/commit/03d750b3bea75115dfad1a9d0fb80b433e5e5142))


### Features

* initial release ([bee9527](https://github.com/droidsolutions/job-service-typeorm/commit/bee952706e679d4728989d958d444d53c3b8daf7))

# [1.0.0-develop.3](https://github.com/droidsolutions/job-service-typeorm/compare/v1.0.0-develop.2...v1.0.0-develop.3) (2022-04-21)


### Bug Fixes

* **NPM:** correct main path ([2580bb2](https://github.com/droidsolutions/job-service-typeorm/commit/2580bb2444b1fc68a957174a0d5ae2564a32ca7d))

# [1.0.0-develop.2](https://github.com/droidsolutions/job-service-typeorm/compare/v1.0.0-develop.1...v1.0.0-develop.2) (2022-04-21)


### Bug Fixes

* **release:** fix initial release ([faedafa](https://github.com/droidsolutions/job-service-typeorm/commit/faedafa7064d9b4eba91014c59982e8436ee5a2a))

# 1.0.0-develop.1 (2022-04-21)


### Features

* initial release ([bee9527](https://github.com/droidsolutions/job-service-typeorm/commit/bee952706e679d4728989d958d444d53c3b8daf7))
