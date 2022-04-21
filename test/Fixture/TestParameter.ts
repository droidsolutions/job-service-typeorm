export enum TestEnumParameter {
  One = "ONE",
  Two = "TWO",
}

export interface TestParameter {
  notNullableString: string;
  nullableString?: string;
  parameter: TestEnumParameter;
}

export interface TestResult {
  ignoredItems: number;
  checkedSomething: boolean;
}
