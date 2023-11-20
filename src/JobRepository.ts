import {
  EmtpyLogger,
  IJob,
  IJobRepository,
  JobState,
  LoggerFactory,
  SimpleLogger,
} from "@droidsolutions-oss/job-service";
import { add } from "date-fns";
import { Brackets, DataSource, EntityManager, FindOptionsWhere, QueryRunner, Raw, Repository } from "typeorm";
import { Job } from "./Entities/Job";
import { getDateInUtc } from "./UtcHelper";

export const getJobRepo = <TParams, TResult>(
  dataSource: DataSource,
  loggerFactory?: LoggerFactory,
): JobRepository<TParams, TResult> => {
  // const typeormJobRepo = dataSource.getRepository(Job);

  const instance = new JobRepository<TParams, TResult>(
    dataSource.manager,
    dataSource.createQueryRunner(),
    loggerFactory,
  );

  return instance;

  // const jobRepo = typeormJobRepo.extend(instance);

  // return jobRepo;
};

/**
 * A repository to handle database queries related to jobs.
 */
export class JobRepository<TParams, TResult>
  extends Repository<Job<TParams, TResult>>
  implements IJobRepository<TParams, TResult>
{
  private logger: SimpleLogger;
  private jobTimes: Map<number, bigint> = new Map<number, bigint>();
  private loggerFactory: LoggerFactory;

  /**
   * Initializes a new instance of the @see JobRepository class.
   * @param {EntityManager} manager The entity manager to use for the underlying repository.
   * @param {QueryRunner} queryRunner The query runner for the underlying repository.
   * @param {LoggerFactory} loggerFactory The logger factory to create a logger for the repo.
   */
  constructor(manager: EntityManager, queryRunner?: QueryRunner, loggerFactory?: LoggerFactory) {
    super(Job, manager, queryRunner);

    if (!loggerFactory) {
      this.loggerFactory = (_, __): SimpleLogger => new EmtpyLogger();
    } else {
      this.loggerFactory = loggerFactory;
    }

    this.initLogger();
  }

  /**
   * Initializes the logger for this repository instance.
   * @param {Record<string, unknown>} meta Additional data to attach to the logger instance.
   */
  public initLogger(meta?: Record<string, unknown>): void {
    const usedMeta = Object.assign({}, meta);

    usedMeta.module = "@droidsolutions-oss/job-service-typeorm";

    this.logger = this.loggerFactory(this.constructor, usedMeta);

    this.logger.trace("initiated new repo logger");
  }

  public async addJobAsync(
    type: string,
    dueDate?: Date,
    parameters?: TParams,
    cancellationToken?: AbortSignal,
  ): Promise<IJob<TParams, TResult>> {
    const job: Job<TParams, TResult> = new Job();
    const now = getDateInUtc();
    job.createdAt = now;
    job.dueDate = dueDate ?? now;
    job.state = JobState.Requested;
    job.type = type;

    if (parameters) {
      job.parameters = parameters;
    }

    cancellationToken?.throwIfAborted();
    const info = await this.insert(job as never);
    job.id = (info.identifiers[0] as { id: number }).id;

    this.logger?.info(`Added job ${job.id} with type ${job.type} due ${job.dueDate.toISOString()}.`);

    return job;
  }

  public async countJobsAsync(
    type: string,
    state?: JobState | undefined,
    cancellationToken?: AbortSignal | undefined,
  ): Promise<number> {
    const where: FindOptionsWhere<Job<TParams, TResult>> = {};
    if (type) {
      where.type = type;
    }

    if (state) {
      where.state = state;
    }

    cancellationToken?.throwIfAborted();
    return await this.count({ where });
  }

  public async findExistingJobAsync(
    type: string,
    dueDate?: Date,
    parameters?: TParams,
    includeStarted = false,
    cancellationToken?: AbortSignal,
  ): Promise<IJob<TParams, TResult> | undefined> {
    if (!dueDate && !parameters) {
      throw new Error("Either dueDate or parameters must be given to find a job.");
    }

    let query = this.manager.createQueryBuilder<Job<TParams, TResult>>(Job, "j").where("j.type = :type", { type });

    if (includeStarted) {
      query = query.andWhere(
        new Brackets((qb) =>
          qb
            .where("j.state = :requested", { requested: JobState.Requested })
            .orWhere("j.state = :started", { started: JobState.Started }),
        ),
      );
    } else {
      query = query.andWhere("j.state = :state", { state: JobState.Requested });
    }
    if (dueDate) {
      query = query.andWhere("j.dueDate <= :dueDate", { dueDate });
    }

    if (parameters) {
      query = query.andWhere("j.parameters ::jsonb @> :parameters", { parameters });
    }

    cancellationToken?.throwIfAborted();

    const job = await query.getOne();

    return job ?? undefined;
  }

  public async getAndStartFirstPendingJobAsync(
    type: string,
    runner: string,
    cancellationToken?: AbortSignal,
  ): Promise<IJob<TParams, TResult> | undefined> {
    const findOptions: FindOptionsWhere<Job<TParams, TResult>> = {
      state: JobState.Requested,
      dueDate: Raw((alias) => `${alias} <= now()`),
    };

    if (type) {
      findOptions.type = type;
    }

    try {
      const job = await this.manager.transaction<Job<TParams, TResult> | null>(async (manager) => {
        cancellationToken?.throwIfAborted();
        const job = await manager.findOne<Job<TParams, TResult>>(Job, {
          where: findOptions,
          order: { dueDate: "ASC" },
          lock: { mode: "pessimistic_write" },
        });

        if (job) {
          this.jobTimes.set(job.id, process.hrtime.bigint());
          job.state = JobState.Started;
          job.runner = runner;
          job.updatedAt = getDateInUtc();

          cancellationToken?.throwIfAborted();
          const info = await manager.update(
            Job,
            { id: job.id },
            { state: JobState.Started, runner, updatedAt: job.updatedAt },
          );
          this.logger?.info(`Starting job ${job.id} with type ${job.type} on runner ${job.runner}.`, info.affected);
        }

        return job;
      });

      return job ?? undefined;
    } catch (err) {
      if (cancellationToken?.aborted) {
        this.logger?.warn("Starting a job has been cancelled.");
        throw err;
      }

      this.logger?.error({ err }, `Failed to fetch the next job of type ${type}: ${(err as Error).message}`);
      return undefined;
    }
  }

  public async setTotalItemsAsync(
    job: IJob<TParams, TResult>,
    total: number,
    cancellationToken?: AbortSignal,
  ): Promise<void> {
    job.totalItems = total;

    cancellationToken?.throwIfAborted();
    job = await this.manager.save(Job, job);
  }

  public async addProgressAsync(
    job: IJob<TParams, TResult>,
    items = 1,
    failed = false,
    cancellationToken?: AbortSignal,
  ): Promise<void> {
    try {
      await this.manager.transaction(async (manager) => {
        cancellationToken?.throwIfAborted();
        const data = await manager.findOne(Job, {
          select: ["id", "failedItems", "successfulItems"],
          where: { id: job.id },
          lock: { mode: "pessimistic_write" },
        });
        if (!data) {
          throw new Error(`Unable to update progress because no job with id ${job.id} exists.`);
        }

        job.updatedAt = getDateInUtc();
        if (failed === true) {
          job.failedItems = (data.failedItems ?? 0) + items;
          cancellationToken?.throwIfAborted();
          await manager.update(Job, { id: job.id }, { failedItems: job.failedItems, updatedAt: job.updatedAt });
        } else {
          job.successfulItems = (data.successfulItems ?? 0) + items;
          cancellationToken?.throwIfAborted();
          await manager.update(Job, { id: job.id }, { successfulItems: job.successfulItems, updatedAt: job.updatedAt });
        }
      });
    } catch (err) {
      if (cancellationToken?.aborted) {
        this.logger?.warn("Adding job progress has been cancelled.");
        throw err;
      }

      this.logger?.error({ err }, `Failed to update progress of job ${job.id}: ${(err as Error).message}`);

      throw err;
    }
  }

  public async finishJobAsync(
    job: IJob<TParams, TResult>,
    addNextJobIn?: { days?: number; hours?: number; minutes?: number; seconds?: number },
    cancellationToken?: AbortSignal,
  ): Promise<void> {
    job.state = JobState.Finished;
    job.updatedAt = getDateInUtc();
    const startTime = this.jobTimes.get(job.id);
    if (startTime) {
      const endTime = process.hrtime.bigint();

      // convert from nanoseconds to milliseconds
      job.processingTimeMs = Number((endTime - startTime) / 1000000n);
      this.jobTimes.delete(job.id); // Remove start time for this job
    }

    cancellationToken?.throwIfAborted();

    job = await this.manager.save(Job, job as Job<TParams, TResult>);

    this.logger?.info(
      { jobId: job.id, runner: job.runner },
      "Completed job %d on runner %s in %dms.",
      job.id,
      job.runner,
      job.processingTimeMs ?? 0,
    );

    if (!addNextJobIn) {
      return;
    }

    const nextRun: Date = add(getDateInUtc(), addNextJobIn);
    cancellationToken?.throwIfAborted();
    await this.addJobAsync(job.type, nextRun, job.parameters);
  }

  public async resetJobAsync(job: Job<TParams, TResult>, _cancellationToken?: AbortSignal): Promise<void> {
    const runnerName = job.runner;
    job.state = JobState.Requested;
    job.runner = null as unknown as undefined;
    job.result = null as unknown as undefined;
    job.totalItems = null as unknown as undefined;
    job.successfulItems = null as unknown as undefined;
    job.failedItems = null as unknown as undefined;

    // don't check cancellationToken here, reset should be possible if the app shuts down

    job = await this.manager.save(Job, job);

    this.logger?.info("Resetted job %d on runner %s", job.id, runnerName);

    this.jobTimes.delete(job.id);
  }
}
