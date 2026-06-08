import { Response } from "express";

export interface SSEEvent {
  event?: string;
  data: any;
  id?: string;
  retry?: number;
}

export class SSEStream {
  private closed: boolean = false;
  private closeCallbacks: Array<() => void> = [];

  constructor(private res: Response) {}

  send(eventOrData: SSEEvent) {
    if (this.closed) return;

    const event: SSEEvent =
      typeof eventOrData === "object" && "data" in eventOrData
        ? eventOrData
        : { data: eventOrData };

    let message = "";

    if (event.id) {
      message += `id: ${event.id}\n`;
    }

    if (event.event) {
      message += `event: ${event.event}\n`;
    }

    if (event.retry) {
      message += `retry: ${event.retry}\n`;
    }

    const data =
      typeof event.data === "string" ? event.data : JSON.stringify(event.data);

    const lines = data.split("\n");
    for (const line of lines) {
      message += `data: ${line}\n`;
    }

    message += "\n";

    this.res.write(message);

    if (typeof this.res.flush === "function") {
      this.res.flush();
    }
  }

  onClose(callback: () => void): void {
    this.closeCallbacks.push(callback);
  }

  private _handleClose(): void {
    if (this.closed) return;
    this.closed = true;

    for (const callback of this.closeCallbacks) {
      try {
        callback();
      } catch (e) {}
    }
  }

  close(): void {
    if (this.closed) return;

    this._handleClose();

    if (!this.res.writableEnded) {
      this.res.end();
    }
  }

  get isClosed(): boolean {
    return this.closed;
  }
}
