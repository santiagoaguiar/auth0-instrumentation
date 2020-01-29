declare module '@a0/instrumentation' {
  export interface Logger {
    child(options: Object, simple?: boolean): Logger;
    debug(message: string, tags?: object): void;
    info(message: string, tags?: object): void;
    warn(message: string, tags?: object): void;
    error(message: string, tags?: object): void;
    fatal(message: string, tags?: object): void;
  }

  export interface Metrics {
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
  }

  export interface ExceptionOptions {
    extra?: any;
  }

  export interface ErrorReporter {
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

  export interface Span {
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

  export interface Tracer {
    startSpan(string: name, options?: any): Span;
    inject(context: any, format: string, carrier: any): void;
    extract(format: string, carrier: any): any;
    Tags: any;
  }

  export interface Profiler {
    setupProcessListener(): void;
    createProfile(callback: Callback);
    createProfile(timeout: number, callback: Callback);
    createSnapshot(string: reason): void;
    report(path: string, reason: string): void;
    setupGCReporter(): void;
  }

  export function init(packageJson: any, env: any, serializers: any): void;
  export const errorReporter: ErrorReporter;
  export const metrics: Metrics;
  export const logger: Logger;
  export const profiler: Profiler;
  export const tracer: Tracer;
}
