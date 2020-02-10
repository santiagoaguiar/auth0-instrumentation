
declare export interface Logger {
  child(options: Object, simple?: boolean): Logger;
  debug(tags: object, message?: string): void;
  debug(message: string, tags?: object): void;
  info(tags: object, message?: string): void;
  info(message: string, tags?: object): void;
  warn(tags: object, message?: string): void;
  warn(message: string, tags?: object): void;
  error(tags: object, message?: string): void;
  error(message: string, tags?: object): void;
  fatal(tags: object, message?: string): void;
  fatal(message: string, tags?: object): void;
}

declare export interface Metrics {
  setDefaultTags(tags: object): void;
  observeBucketed(
    name: string,
    value: number,
    buckets: number[],
    time: number,
    tags?: object,
    callback?: Callback
  ): void;
  gauge(name: string, value: number, tags?: object, callback?: Callback): void;
  histogram(
    name: string,
    time: number,
    tags?: object,
    callback?: Callback
  ): void;
  incrementOne(
    name: string,
    count: number,
    tags?: object,
    callback?: Callback
  ): void;
  increment(
    name: string,
    count: number,
    tags?: object,
    callback?: Callback
  ): void;
  time(name: string, tags?: object): string;
  endTime(id: string, tags?: object): void;
  startResourceCollection(tags?: object): void;
  flush(): void;
  close(): void;
  std: any;
}

declare export interface ExceptionOptions {
  extra?: any;
}

declare export interface ErrorReporter {
  captureException(err: any, options: ExceptionOptions): void;
  captureMessage(msg: string, options: ExceptionOptions): void;
  patchGlobal(exitHandler: () => void);
  express: {
    requestHandler: any;
    errorHandler: any;
  };
  hapi: {
    plugin: any,
  };
}

declare export interface Span {
  log(obj: any): void;
  error(err: any): void;
  finish(): void;
  setTag(tag: string, value: string): void;
  addTags(tags: { [k: string]: string }): void;
  tracer: () => Tracer;
  setOperationName(name: string),
  context: any;
  isStub: boolean
}

declare export interface Tracer {
  startSpan(string: name, options?: any): Span;
  inject(context: any, format: string, carrier: any): void;
  extract(format: string, carrier: any): any;
  Tags: any;
  middleware: any;
}

declare export interface Profiler {
  setupProcessListener(): void;
  createProfile(callback: Callback);
  createProfile(timeout: number, callback: Callback);
  createSnapshot(string: reason): void;
  report(path: string, reason: string): void;
  setupGCReporter(): void;
}

declare export function init(packageJson: any, env: any, serializers: any): void;
declare export const errorReporter: ErrorReporter;
declare export const metrics: Metrics;
declare export const logger: Logger;
declare export const profiler: Profiler;
declare export const tracer: Tracer;
