/** A jotted calendar note, like "Sun 8/23: IRC @ 4pm–5:30pm". */
export interface UpcomingEvent {
  id: string;
  /** Day key of the event. */
  date: string;
  title: string;
  /** Freeform, the way it's written on the pad: "4pm–5:30pm". */
  timeLabel?: string;
  /** The aside scribbled above the entry — "omg lol". */
  note?: string;
}
