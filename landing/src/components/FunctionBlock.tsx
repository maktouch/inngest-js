import { useMemo } from "preact/hooks";
import { FunctionConfig } from "../types";
import { classNames } from "../utils/classnames";
import { configErrors } from "./ConfigErrors";

interface Props {
  config: FunctionConfig;
  altBg?: boolean;
}

/**
 * Renders a single entry for a found function.
 */
export const FunctionBlock = ({ config, altBg }: Props) => {
  /**
   * Figure out here what kind of function it is so that we can approriately
   * label it.
   *
   * This is naive and doesn't take in to account functions with multiple
   * triggers.
   */
  const type = useMemo<"cron" | "event">(() => {
    const trigger = config.triggers[0] as any;
    if (trigger.cron) return "cron";
    return "event";
  }, [config.triggers]);

  /**
   * Figure out the "expression" used. This doubles up as the found `cron` if
   * it's a scheduled function.
   */
  const expression = useMemo(() => {
    const trigger = config.triggers[0] as any;
    return trigger.cron || trigger.event || "";
  }, [config.triggers]);

  /**
   * Figure out if we have errors to show.
   */
  const hasErrors = useMemo(
    () => Boolean(config.errors?.size),
    [config.errors]
  );

  return (
    <>
      <div
        class={classNames({
          "w-full grid grid-cols-[1fr_1fr_1fr] p-2 items-center": true,
          "bg-slate-200/30": Boolean(altBg),
          "bg-red-400/30": hasErrors,
        })}
      >
        <div class="flex flex-col">
          <div class="font-semibold text-sm">
            {config.name}{" "}
            <span
              class={classNames({
                "uppercase text-xs px-1 py-0.5 rounded": true,
                "bg-blue-300/30": type === "event",
                "bg-green-300/30": type === "cron",
              })}
            >
              {type}
            </span>
          </div>
        </div>
        <div>
          <code
            class={classNames({
              "text-xs text-gray-500": true,
              "bg-white": hasErrors,
              "bg-gray-500/10": !hasErrors,
            })}
          >
            {config.id}
          </code>
        </div>
        <span>
          {expression ? (
            <code>{expression}</code>
          ) : (
            <code class="bg-white">Invalid or no expression</code>
          )}
        </span>
      </div>
      {hasErrors ? (
        <div class="w-full p-2 bg-red-400/30">
          {Array.from(config.errors ?? [])?.map((err) => (
            <div class="bg-red-100 border border-red-400 rounded p-2">
              {configErrors[err]}
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
};
