import { Check, Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { IJob, JobState } from "@droidsolutions-oss/job-service";

/**
 * A typeORM entity for jobs.
 */
@Entity()
export class Job<TParams, TResult> implements IJob<TParams, TResult> {
  /** The unique id of the job. */
  @PrimaryGeneratedColumn({ type: "bigint" })
  public id: number;

  /** The date when the job was created. */
  @Column()
  // @CreateDateColumn()
  public createdAt: Date;

  /** The date when the job was updated the last time. */
  @Column({ nullable: true })
  // @UpdateDateColumn()
  public updatedAt?: Date;

  /** The earliest date when the job should be executed. */
  @Column()
  public dueDate: Date;

  /** The current state of the job. */
  @Column({ default: JobState.Requested })
  @Check(`"state" IN ('REQUESTED', 'STARTED', 'FINISHED')`)
  public state: JobState;

  /** The type of the job. */
  @Column()
  public type: string;

  /** The parameters of the job. */
  @Column({ type: "jsonb", nullable: true })
  public parameters?: TParams;

  /** The result of the job. */
  @Column({ type: "jsonb", nullable: true })
  public result?: TResult;

  /** The amount of items the job must process. */
  @Column({ nullable: true, default: 0 })
  public totalItems?: number;

  /** The amount of items the job has already processed successfully. */
  @Column({ nullable: true, default: 0 })
  public successfulItems?: number;

  /** The amount of items the job failed to process. */
  @Column({ nullable: true, default: 0 })
  public failedItems?: number;

  /** The name of the runner that processed the job. */
  @Column({ nullable: true })
  public runner?: string;

  /** The amount of milliseconds the runner took to process the complete job. */
  @Column({ nullable: true, type: "bigint" })
  public processingTimeMs?: number;
}
