import { JobState, transformDateToUtc } from "@droidsolutions-oss/job-service";
import { addDays, addMinutes, addSeconds } from "date-fns";
import { DataSource, DataSourceOptions, EntityManager } from "typeorm";
import { Job } from "../src/Entities/Job";
import { getJobRepo, JobRepository } from "../src/JobRepository";
import { TestEnumParameter, TestParameter, TestResult } from "./Fixture/TestParameter";

describe("JobRepository", () => {
  let dataSource: DataSource;
  let repo: JobRepository<TestParameter, TestResult>;

  beforeAll(async () => {
    const options: DataSourceOptions = {
      type: "postgres",
      applicationName: "job-service-test",
      database: process.env.POSTGRES_DB ?? "apitest",
      host: process.env.POSTGRES_HOST ?? "localhost",
      username: process.env.POSTGRES_USER ?? "apitest",
      password: process.env.POSTGRES_PASSWORD ?? "password",
      entities: [Job],
      logger: "simple-console",
      logging: [],
      dropSchema: true,
      synchronize: true,
    };
    dataSource = await new DataSource(options).initialize();
    repo = getJobRepo<TestParameter, TestResult>(dataSource);
  });

  afterAll(async () => {
    await dataSource?.destroy();
  });

  it("can be constructed without a logger facotry", () => {
    expect(repo).toBeInstanceOf(JobRepository);
  });

  describe("addJob", () => {
    describe("with dueDate", () => {
      let job: Job<TestParameter, TestResult>;
      const type = "add-job";
      const dueDate = new Date(2021, 9, 28, 8, 27, 35);
      let beforeCreation: number;
      let afterCreation: number;

      beforeAll(async () => {
        beforeCreation = transformDateToUtc().getTime();
        job = await repo.addJobAsync(type, dueDate);
        afterCreation = transformDateToUtc().getTime();
      });

      it("should add a job", () => expect(job).toBeDefined());

      it("should set createdAt", () => {
        expect(job?.createdAt?.getTime()).toBeGreaterThanOrEqual(beforeCreation);
        expect(job?.createdAt?.getTime()).toBeLessThanOrEqual(afterCreation);
      });

      it("should set stae to requested", () => expect(job?.state).toBe(JobState.Requested));
      it("should set dueDate", () => expect(job.dueDate).toEqual(dueDate));

      it("should set job type", () => expect(job.type).toEqual(type));

      it("should set a job id", () => expect(job.id).toBeDefined());
    });

    describe("without dueDate", () => {
      let job: Job<TestParameter, TestResult>;
      const type = "add-job";
      let beforeCreation: number;
      let afterCreation: number;

      beforeAll(async () => {
        // Handle UTC cnversionn by just using the same method
        beforeCreation = transformDateToUtc().getTime();
        job = await repo.addJobAsync(type);
        afterCreation = transformDateToUtc().getTime();
      });

      it("should add a job", () => expect(job).toBeDefined());

      it("should set duedate to now", () => {
        expect(job?.dueDate.getTime()).toBeGreaterThanOrEqual(beforeCreation);
        expect(job?.dueDate.getTime()).toBeLessThanOrEqual(afterCreation);
      });
    });

    describe("with parameters", () => {
      let job: Job<TestParameter, TestResult>;
      const type = "add-job";
      const parameters: TestParameter = { notNullableString: "string", parameter: TestEnumParameter.Two };

      beforeAll(async () => {
        job = await repo.addJobAsync(type, new Date(2021, 9, 28, 9, 25, 36), parameters);
      });

      it("should add a job", () => expect(job).toBeDefined());

      it("should serialize parameters", () => expect(job?.parameters).toEqual(parameters));
    });
  });

  describe("findExistingJob", () => {
    describe("without duedate and parameters", () => {
      it("should throw an error", async () => {
        await expect(repo.findExistingJobAsync("some-type")).rejects.toThrow(
          "Either dueDate or parameters must be given to find a job.",
        );
      });
    });

    describe("with duedate", () => {
      let existingJob: Job<never, never>;
      const dueDate = new Date(2021, 9, 28, 9, 50, 59);
      const type = "job-with-duedate";
      let repo: JobRepository<never, never>;

      beforeAll(async () => {
        repo = getJobRepo<never, never>(dataSource);
        existingJob = await repo.addJobAsync(type, dueDate);
        await repo.addJobAsync("another-type", dueDate);
        const finishedJob = await repo.addJobAsync(type, addMinutes(dueDate, -20));
        finishedJob.state = JobState.Finished;
        await repo.save(finishedJob);
      });

      it("should find a job with correct type and duedate", async () => {
        const actual = await repo.findExistingJobAsync(type, dueDate);
        expect(actual?.id).toBe(existingJob.id);
      });

      it("should not find a job with other type", async () => {
        const actual = await repo.findExistingJobAsync(type, addMinutes(dueDate, -10));
        expect(actual).toBeUndefined();
      });

      it("should not find finished job", async () => {
        const actual = await repo.findExistingJobAsync(type, addMinutes(dueDate, -20));
        expect(actual).toBeUndefined();
      });
    });

    describe("with parameter", () => {
      let existingJob: Job<TestParameter, TestResult>;
      const type = "existing-job-with-params";
      const dueDate = new Date(2021, 9, 28, 10, 12, 22);
      const parameters: TestParameter = { notNullableString: "string", parameter: TestEnumParameter.Two };

      beforeAll(async () => {
        existingJob = await repo.addJobAsync(type, dueDate, parameters);
      });

      it("should find the job by parameters", async () => {
        const actual = await repo.findExistingJobAsync(type, undefined, parameters);
        expect(actual?.id).toBe(existingJob.id);
      });

      it("should serialize job by parameters", async () => {
        const actual = await repo.findExistingJobAsync(type, undefined, parameters);
        expect(actual?.id).toBe(existingJob.id);
      });

      it("should not find job by subset of parameters", async () => {
        const actual = await repo.findExistingJobAsync(type, undefined, {
          parameter: TestEnumParameter.One,
        } as TestParameter);
        expect(actual).toBeUndefined();
      });
    });
  });

  describe("getAndStartFirstPendingJob", () => {
    const runner = "usain-bolt";

    describe("without existing job", () => {
      beforeAll(async () => {
        await repo.addJobAsync("not-the-type-you-are-looking-for");
      });

      it("should return undefined", async () => {
        const job = await repo.getAndStartFirstPendingJobAsync("the-type-i-am-looking-for", runner);

        expect(job).toBeUndefined();
      });
    });

    describe("with existing job", () => {
      let olderJob: Job<TestParameter, TestResult>;
      let foundJob: Job<TestParameter, TestResult> | undefined;
      const dueDate = new Date(2021, 9, 28, 10, 51, 41);
      const type = "start-existing-job";
      let beforeStart: number;
      let afterStart: number;
      const parameters: TestParameter = { notNullableString: "string", parameter: TestEnumParameter.Two };

      beforeAll(async () => {
        await repo.addJobAsync(type, addMinutes(dueDate, 20));
        olderJob = await repo.addJobAsync(type, addMinutes(dueDate, 10), parameters);

        // Handle UTC cnversionn by just using the same method
        beforeStart = transformDateToUtc().getTime();
        foundJob = await repo.getAndStartFirstPendingJobAsync(type, runner);
        afterStart = transformDateToUtc().getTime();
      });

      it("should find oldest job", () => expect(foundJob?.id).toBe(olderJob.id));

      it("should set state to started", () => expect(foundJob?.state).toBe(JobState.Started));

      it("should set runner", () => expect(foundJob?.runner).toBe(runner));

      it("should serialize paramter", () => expect(foundJob?.parameters).toEqual(parameters));

      it("should set updated", () => {
        expect(foundJob?.updatedAt?.getTime()).toBeGreaterThanOrEqual(beforeStart);
        expect(foundJob?.updatedAt?.getTime()).toBeLessThanOrEqual(afterStart);
      });
    });

    describe("when an error is thrown", () => {
      let repo: JobRepository<never, never>;
      let transaction: <T>(runInTransaction: (entityManager: EntityManager) => Promise<T>) => Promise<T>;
      beforeAll(() => {
        repo = getJobRepo<never, never>(dataSource);
        transaction = repo.manager.transaction;
      });

      afterAll(() => {
        if (repo) {
          // @ts-ignore
          repo.manager.transaction = transaction;
        }
      });

      it("should return undefined", async () => {
        const type = "some-never-seen-again-type";
        await repo.addJobAsync(type);

        repo.manager.transaction = () => {
          throw new Error("For testing");
        };
        const job = await repo.getAndStartFirstPendingJobAsync(type, "run-to-the-hills");
        expect(job).toBeUndefined();
      });
    });
  });

  describe("setTotalItems", () => {
    let repo: JobRepository<never, never>;
    let existingJob: Job<never, never>;
    const totalItems = 666;

    beforeAll(async () => {
      repo = getJobRepo<never, never>(dataSource);
      existingJob = await repo.addJobAsync("job-with-total-items");
      await repo.setTotalItemsAsync(existingJob, 666);
    });

    it("should set the total items in the instance", () => expect(existingJob.totalItems).toBe(totalItems));

    it("should save the total items in the database", async () => {
      const job = await repo.findOne({ where: { id: existingJob.id } });
      expect(job?.totalItems).toBe(totalItems);
    });
  });

  describe("addProgress", () => {
    let repo: JobRepository<never, never>;
    let existingJob: Job<never, never>;

    beforeAll(() => {
      repo = getJobRepo<never, never>(dataSource);
    });

    beforeEach(async () => {
      existingJob = await repo.addJobAsync("progress-job");
    });

    it("should throw error when the given job does not exist", async () => {
      await expect(repo.addProgressAsync({ id: 123456789 } as Job<never, never>)).rejects.toThrow(
        "Unable to update progress because no job with id 123456789 exists.",
      );
    });

    it("should add 1 successfulitem when no args given", async () => {
      await repo.addProgressAsync(existingJob);

      expect(existingJob?.successfulItems).toBe(1);
    });

    it("should add 1 faileditem when no items given", async () => {
      await repo.addProgressAsync(existingJob, undefined, true);

      expect(existingJob?.failedItems).toBe(1);
    });

    it("should add amount of items", async () => {
      await repo.addProgressAsync(existingJob, 5, false);
      await repo.addProgressAsync(existingJob, 5, false);

      expect(existingJob?.successfulItems).toBe(10);
    });

    it("should add amount of items to failed", async () => {
      await repo.addProgressAsync(existingJob, 5, true);
      await repo.addProgressAsync(existingJob, 10, true);

      expect(existingJob?.failedItems).toBe(15);
    });

    it("should add updated", async () => {
      const beforeProgress = transformDateToUtc().getTime();
      await repo.addProgressAsync(existingJob, 5, false);
      const afterProgress = transformDateToUtc().getTime();

      const job = await repo.findOne({ where: { id: existingJob.id } });
      expect(job?.successfulItems).toBe(5);
      expect(job?.updatedAt?.getTime()).toBeGreaterThanOrEqual(beforeProgress);
      expect(job?.updatedAt?.getTime()).toBeLessThanOrEqual(afterProgress);
    });
  });

  describe("finishJob", () => {
    let job: Job<TestParameter, TestResult>;
    const parameters: TestParameter = { notNullableString: "string", parameter: TestEnumParameter.Two };
    const result: TestResult = { checkedSomething: true, ignoredItems: 12 };

    describe("without new job", () => {
      let beforeFinish: number;
      let afterFinish: number;
      let loadedJob: Job<TestParameter, TestResult> | null;

      beforeAll(async () => {
        job = await repo.addJobAsync("finished-job-without-new", undefined, parameters);

        beforeFinish = transformDateToUtc().getTime();
        job.result = result;
        await repo.finishJobAsync(job);
        afterFinish = transformDateToUtc().getTime();

        loadedJob = await repo.findOne({ where: { id: job.id } });
      });

      it("should set state to finished in instance", () => expect(job?.state).toBe(JobState.Finished));

      it("should set state to finished in db", () => expect(loadedJob?.state).toBe(JobState.Finished));

      it("should set updated at in instance", () => {
        expect(job?.updatedAt?.getTime()).toBeGreaterThanOrEqual(beforeFinish);
        expect(job?.updatedAt?.getTime()).toBeLessThanOrEqual(afterFinish);
      });

      it("should set updated at in db", () => {
        expect(loadedJob?.updatedAt?.getTime()).toBeGreaterThanOrEqual(beforeFinish);
        expect(loadedJob?.updatedAt?.getTime()).toBeLessThanOrEqual(afterFinish);
      });

      it("should set result in db", () => expect(loadedJob?.result).toEqual(result));
    });

    describe("with new job", () => {
      const type = "add-new-job";
      let beforeFinish: number;
      let existingJob: Job<TestParameter, TestResult>;

      beforeAll(async () => {
        existingJob = await repo.addJobAsync(type, undefined, parameters);
      });

      it("should add a day to next job", async () => {
        beforeFinish = transformDateToUtc().getTime();
        await repo.finishJobAsync(existingJob, { days: 1 });

        const newJob = await repo.findOne({ where: { type, state: JobState.Requested } });
        expect(newJob).toBeDefined();
        expect(newJob?.type).toBe(type);

        const expectedDate = addDays(beforeFinish, 1);
        const actualDate = newJob?.dueDate.getTime();
        expect(actualDate).toBeDefined();
        expect(actualDate).toBeGreaterThanOrEqual(expectedDate.getTime());
        expect(actualDate).toBeLessThan(addSeconds(expectedDate, 10).getTime());
      });
    });
  });

  describe("resetJob", () => {
    let job: Job<TestParameter, TestResult>;
    let loadedJob: Job<TestParameter, TestResult> | null;
    const result: TestResult = { checkedSomething: true, ignoredItems: 12 };

    beforeAll(async () => {
      const type = "resetted-job";
      await repo.addJobAsync(type);
      const temp = await repo.getAndStartFirstPendingJobAsync(type, "its-a-me-mario");
      if (!temp) {
        throw new Error("Unable to set up job for resetJob test.");
      }
      job = temp;

      job.result = result;
      await repo.setTotalItemsAsync(job, 10);
      await repo.addProgressAsync(job);

      await repo.resetJobAsync(job);

      loadedJob = await repo.findOne({ where: { id: job.id } });
    });

    it("should have reset state to requested in instance", () => expect(job.state).toBe(JobState.Requested));

    it("should have reset state to requested in db", () => expect(loadedJob?.state).toBe(JobState.Requested));

    it("should have reset runner to requested in instance", () => expect(job.runner).toBeNull());

    it("should have reset runner to requested in db", () => expect(loadedJob?.runner).toBeNull());

    it("should have reset result to requested in instance", () => expect(job.result).toBeNull());

    it("should have reset result to requested in db", () => expect(loadedJob?.result).toBeNull());

    it("should have reset totalItems to requested in instance", () => expect(job.totalItems).toBeNull());

    it("should have reset totalItems to requested in db", () => expect(loadedJob?.totalItems).toBeNull());

    it("should have reset successfulItems to requested in instance", () => expect(job.successfulItems).toBeNull());

    it("should have reset successfulItems to requested in db", () => expect(loadedJob?.successfulItems).toBeNull());

    it("should have reset failedItems to requested in instance", () => expect(job.failedItems).toBeNull());

    it("should have reset failedItems to requested in db", () => expect(loadedJob?.failedItems).toBeNull());
  });
});
