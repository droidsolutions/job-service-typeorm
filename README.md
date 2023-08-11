# DroidSolutions Job Service TypeORM

TypeORM implementation of [DroidSolutions job service](https://github.com/droidsolutions/job-service).

[![main](https://github.com/droidsolutions/job-service-typeorm/actions/workflows/main.yml/badge.svg)](https://github.com/droidsolutions/job-service-typeorm/actions/workflows/main.yml)
[![Coverage Status](https://coveralls.io/repos/github/droidsolutions/job-service-typeorm/badge.svg?branch=main)](https://coveralls.io/github/droidsolutions/job-service-typeorm?branch=main)
![npm (scoped)](https://img.shields.io/npm/v/@droidsolutions-oss/job-service-typeorm)

This is an implementation of the `IJobRepository` interface from the NodeJS version of the [DroidSolutions job service](https://github.com/droidsolutions/job-service). It can be used to handle (recurring) jobs in a scaled NodeJS application.

# Installation

This library is an extension to the [DroidSolutions Job Service](https://github.com/droidsolutions/job-service) library and needs it installed. Since it is a repository implementation for [TypeORM](https://typeorm.io) the latter is also needed.

To use it install this library along with the dependencies by using

`npm i @droidsolutions-oss/job-service @droidsolutions-oss/job-service-typeorm cancellationtoken typeorm`

**Note:** This library only supports [TypeORM](https://typeorm.io) >= 0.36.0.

# Usage

First you must include the Job entity in your [TypeORM](https://typeorm.io) datasource, then you can instantiate the repository and pass the instance to the job worker for example like this

```ts
import { Job, JobRepository } from "@droidsolutions-oss/job-service-typeorm";
import { DataSourceOptions } from "typeorm";
import { LoggerFactory } from "./loggerfactory";

// Create and initialize TypeORM connection
const options: DataSourceOptions = {
  // ...
  entities: [/* ... */ Job],
};
dataSource = await new DataSource(options).initialize();

// Create job repo instance
const jobRepo = new JobRepository<MyParam, MyResult>(dataSource.manager, undefined, loggerFactory);

// Create and start worker
const workerSettings: IJobWorkerSettings = {
  // ...
};
const worker = new JobWorker(workerSettings, jobRepo, loggerFactory);
const controller = new AbortController();
void worker.executeAsync(controller.signal);

// when you want to stop the worker, e.g. when shutting down the app use the abortcontroller to cancel the signal
controller.abort(new Error("App is shutting down"));
```

# Details

## Job

The job entity is an implementation of the [IJob<TParam, TResult>](https://github.com/droidsolutions/job-service/tree/develop#ijobtparams-tresult) interface using [TypeORM](https://typeorm.io) and `jsonb` column for parameters and result. If you don't use an SQL driver that supports `jsonb` like [PostgreSQL](postgresql.org/) you can extend the entity and overwrite the properties `parameters` and `result`.

The `id` column has the bigint type to prevent reaching a limit with a lot of jobs.

The `state` column uses the `character varying` but has a [CHECK constraint](https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-CHECK-CONSTRAINTS) against the UPPER_CASE values of the `JobState` enum. If you share the table with a .NET application with Entity Framework Core make sure to use the `JobStateToDescriptionConverter` like described in the [documentation](https://github.com/droidsolutions/job-service#aspnet-core) of the job-service repo.

## JobRepository

The job repository is an implementation of the [IJobRepository<TParams, TResult>](https://github.com/droidsolutions/job-service/tree/develop#ijobrepositorytparams-tresult) interface using [TypeORM](https://typeorm.io).

Some methods like `getAndStartFirstPendingJobAsync`, `setTotalItemsAsync` and `addProgressAsync` use table locking to prevent that the same row is updated from different instances (for example if you have scaled your app to run in more than one instance). The locking is implemented via [TypeORM](https://typeorm.io) and should work across database drivers but is only tested against PostgreSQL.

### PostgreSQL specific implementations

The implementation of the function `findExistingJobAsync` uses Postgres specific syntax to find jobs with the same parameters. If you use any SQL driver that doesn't support `::jsonb @> :parameters` you should extend the repo and provide your own implementation for it.

## Logging

The job repository constructor may receive a logger factory like the one used in the `JobWorkerBase` class. This will initialize the internal logger. You can also set a new logger via the `initLogger` method where you can pass additional metadata to attach to logs coming from the repo. This way you could for example set a new logger instance from the worker with the name of the runner as variable or add the current job id to logs for each run of the worker.

Since the `initLogger` method is not part of the interface you must cast the repo in the logger. Consider the following example where the worker implementation uses the `constructor` to set new logger metadata:

```ts
export class ExampleWorker extends JobWorkerBase<void, void> {
  constructor(workerSettings: IJobWorkerSettings, jobRepo: IJobRepository<void, void>, loggerFactory: LoggerFactory) {
    super(workerSettings, jobRepo, loggerFactory);

    const meta = { runner: this.runnerName, jobType: workerSettings.jobType };
    (this.jobRepo as JobRepository<void, void>).initLogger(meta);
  }
}
```

If you don't need any logging from the repository you can omit the `loggerFactory` argument of the constructor. In this case the `EmptyLogger` from the base job-service library is used which doesn't log anything.

## Date

The job repository uses the helper method from the main job-service repository to get the current date in UTC. This is used across the repo when for example jobs are created or the `updatedAt` field is set. This ensures the dates in the database are in UTC even if our application runs in a different timezone.

## Custom repository

[TypeORM](https://typeorm.io) 0.3.0 changed the way custom repositories are used. Now they are mainly extensions to the [TypeORM](https://typeorm.io) default repositories. You can read more on that in [the TypeORM documentation](https://typeorm.io/custom-repository). However this new way makes it hard to use the repository with dependency injection or use generics with it so we decided to workaround that by not using the repository extend API. Instead the JobRepository extends from `Repository<Job>` and therefore needs the `DataSource` instance in the constructor. This way you can use the repository as if it were the default [TypeORM](https://typeorm.io) repository without problems.
