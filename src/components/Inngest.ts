import axios, { AxiosInstance, AxiosResponse } from "axios";
import * as InngestT from "../types";
import { version } from "../version";
import { InngestFunction } from "./InngestFunction";
import { InngestStep } from "./InngestStep";

/**
 * A client used to interact with the Inngest API by sending or reacting to
 * events.
 *
 * To provide event typing, make sure to pass in your generated event types as
 * the first generic.
 *
 * @example
 *
 * const inngest = new Inngest<Events>("My App", process.env.INNGEST_API_KEY);
 *
 * // or to provide custom events too
 * const inngest = new Inngest<
 *   Events & {
 *     "demo/event.blah": {
 *       name: "demo/event.blah";
 *       data: {
 *         bar: boolean;
 *       };
 *     };
 *   }
 * >("My App", process.env.INNGEST_API_KEY);
 */
export class Inngest<Events extends Record<string, InngestT.EventPayload>> {
  /**
   * The name of this instance, most commonly the name of the application it
   * resides in.
   */
  public readonly name: string;

  /**
   * Inngest event key, used to send events to Inngest Cloud.
   */
  private readonly eventKey: string;

  /**
   * Base URL for Inngest Cloud.
   */
  public readonly inngestBaseUrl: URL;

  /**
   * The URL of the Inngest Cloud API.
   */
  private readonly inngestApiUrl: URL;

  /**
   * An Axios instance used for communicating with Inngest Cloud.
   *
   * @link https://npm.im/axios
   */
  private readonly client: AxiosInstance;

  /**
   * A client used to interact with the Inngest API by sending or reacting to
   * events.
   *
   * To provide event typing, make sure to pass in your generated event types as
   * the first generic.
   *
   * @example
   *
   * const inngest = new Inngest<Events>("My App", process.env.INNGEST_API_KEY);
   *
   * // or to provide custom events too
   * const inngest = new Inngest<
   *   Events & {
   *     "demo/event.blah": {
   *       name: "demo/event.blah";
   *       data: {
   *         bar: boolean;
   *       };
   *     };
   *   }
   * >("My App", process.env.INNGEST_API_KEY);
   */
  constructor(
    /**
     * The name of this instance, most commonly the name of the application it
     * resides in.
     */
    name: string,

    /**
     * Inngest event key, used to send events to Inngest Cloud.
     */
    eventKey: string,
    { inngestBaseUrl = "https://inn.gs/" }: InngestT.ClientOptions = {}
  ) {
    if (!name) {
      throw new Error("A name must be passed to create an Inngest instance.");
    }

    if (!eventKey) {
      throw new Error(
        "An event key must be passed to create an Inngest instance."
      );
    }

    this.name = name;
    this.eventKey = eventKey;
    this.inngestBaseUrl = new URL(inngestBaseUrl);
    this.inngestApiUrl = new URL(`e/${this.eventKey}`, this.inngestBaseUrl);

    this.client = axios.create({
      timeout: 0,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": `InngestJS v${version}`,
      },
      validateStatus: () => true, // all status codes return a response
      maxRedirects: 0,
    });
  }

  /**
   * Given a response from Inngest, relay the error to the caller.
   */
  #getResponseError(response: AxiosResponse): Error {
    let errorMessage = "Unknown error";
    switch (response.status) {
      case 401:
        errorMessage = "Event key Not Found";
        break;
      case 400:
        errorMessage = "Cannot process event payload";
        break;
      case 403:
        errorMessage = "Forbidden";
        break;
      case 404:
        errorMessage = "Event key not found";
        break;
      case 406:
        errorMessage = `${JSON.stringify(response.data)}`;
        break;
      case 409:
      case 412:
        errorMessage = "Event transformation failed";
        break;
      case 413:
        errorMessage = "Event payload too large";
        break;
      case 500:
        errorMessage = "Internal server error";
        break;
    }
    return new Error(`Inngest API Error: ${response.status} ${errorMessage}`);
  }

  /**
   * Send one or many events to Inngest. Takes a known event from this Inngest
   * instance based on the given `name`.
   *
   * Returns a promise that will resolve if the event(s) were sent successfully,
   * else throws with an error explaining what went wrong.
   *
   * If you wish to send an event with custom types (i.e. one that hasn't been
   * generated), make sure to add it when creating your Inngest instance, like
   * so:
   *
   * @example
   *
   * const inngest = new Inngest<Events & {
   *   "my/event": {
   *     name: "my/event";
   *     data: { bar: string; };
   *   }
   * }>("My App", "API_KEY");
   */
  public async send<Event extends keyof Events>(
    name: Event,
    payload: Omit<Events[Event], "name"> | Omit<Events[Event], "name">[]
  ): Promise<void> {
    const response = await this.client.post(this.inngestApiUrl.href, {
      ...payload,
      name,
    });

    if (response.status >= 200 && response.status < 300) {
      return;
    }

    throw this.#getResponseError(response);
  }

  /**
   * Given an event to listen to, run the given function when that event is
   * seen.
   */
  public createFunction<
    Event extends keyof Events,
    Fn extends InngestT.StepFn<Events[Event], string, "step">
  >(
    /**
     * The name of this function as it will appear in the Inngst Cloud UI.
     */
    name: string,

    /**
     * The event to listen for.
     */
    event: Event,

    /**
     * The function to run when the event is received.
     */
    fn: Fn
  ): InngestFunction<Events>;
  public createFunction<
    Event extends keyof Events,
    Fn extends InngestT.StepFn<Events[Event], string, "step">
  >(
    /**
     * Options for this Inngest function - useful for defining a custom ID.
     */
    opts: InngestT.FunctionOptions,

    /**
     * The event to listen for.
     */
    event: Event,

    /**
     * The function to run when the event is received.
     */
    fn: Fn
  ): InngestFunction<Events>;
  public createFunction<
    Event extends keyof Events,
    Fn extends InngestT.StepFn<Events[Event], string, "step">
  >(
    nameOrOpts: string | InngestT.FunctionOptions,
    event: Event,
    fn: Fn
  ): InngestFunction<Events> {
    return new InngestFunction<Events>(
      typeof nameOrOpts === "string" ? { name: nameOrOpts } : nameOrOpts,
      { event: event as string },
      { step: new InngestStep(fn) }
    );
  }
}
