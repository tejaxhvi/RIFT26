import { getJob } from "@/app/lib/progressStore";
import { onJobEvent } from "@/app/lib/progressStore";
import { NextResponse } from "next/server";
import type { ProgressEvent } from "@/app/lib/progressStore";

function formatSseEvent(eventName: string, data: unknown) {
  return `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const jobId = url.searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
  }

  const job = getJob(jobId);
  if (!job) {
    return NextResponse.json({ error: "Unknown jobId" }, { status: 404 });
  }

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      let unsubscribe: (() => void) | null = null;

      const send = (event: ProgressEvent) => {
        if (closed) return;

        if (event.type === "done") {
          controller.enqueue(formatSseEvent("done", event.payload));
          closed = true;
          unsubscribe?.();
          controller.close();
          return;
        }

        if (event.type === "error") {
          controller.enqueue(formatSseEvent("error", { message: event.message }));
          closed = true;
          unsubscribe?.();
          controller.close();
          return;
        }

        if (event.type === "stage") {
          controller.enqueue(
            formatSseEvent("stage", {
              stage: event.stage,
              message: event.message,
              iteration: event.iteration,
            })
          );
          return;
        }

        if (event.type === "log") {
          controller.enqueue(formatSseEvent("log", { stream: event.stream, line: event.line }));
          return;
        }
      };

      // Flush already-known events so refresh/reconnect can still show progress.
      for (const event of job.events) {
        send(event);
        if (closed) break;
      }

      unsubscribe = onJobEvent(jobId, (event) => {
        send(event);
      });

      request.signal.addEventListener("abort", () => {
        unsubscribe?.();
        if (!closed) controller.close();
      });
    },
    cancel() {
      // Cleanup if the client disconnects unexpectedly.
      // `request.signal` will also trigger in normal cases.
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

