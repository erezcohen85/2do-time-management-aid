export interface CalendarInfo {
  id: string
  summary: string
  primary?: boolean
  accessRole?: string
}

export interface GEvent {
  id: string
  summary?: string
  status?: string
  transparency?: string
  start?: { dateTime?: string; date?: string }
  end?: { dateTime?: string; date?: string }
}

export interface GEventInput {
  summary: string
  start: { dateTime: string; timeZone?: string }
  end: { dateTime: string; timeZone?: string }
}

/** Raised when the token is missing or expired and could not be renewed silently. */
export class GcalAuthError extends Error {
  constructor(message = 'Google Calendar needs to be reconnected') {
    super(message)
    this.name = 'GcalAuthError'
  }
}

export class GcalApiError extends Error {
  readonly status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'GcalApiError'
    this.status = status
  }
}

/** Everything the app needs from Google. Implemented by the real REST client and by a mock. */
export interface GoogleClient {
  /** Interactive (first time) or silent (renewal) token request. */
  requestToken(opts: { interactive: boolean }): Promise<void>
  /** True while a non-expired token is held. */
  hasValidToken(): boolean
  revoke(): Promise<void>
  listCalendars(): Promise<CalendarInfo[]>
  listEvents(calendarId: string, timeMin: string, timeMax: string): Promise<GEvent[]>
  createCalendar(summary: string, timeZone?: string): Promise<CalendarInfo>
  createEvent(calendarId: string, event: GEventInput): Promise<{ id: string }>
  updateEvent(calendarId: string, eventId: string, event: GEventInput): Promise<void>
  deleteEvent(calendarId: string, eventId: string): Promise<void>
}

export const GCAL_SCOPES = [
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
  'https://www.googleapis.com/auth/calendar.events.readonly',
  'https://www.googleapis.com/auth/calendar.app.created',
]

export const TARGET_CALENDAR_NAME = '2DO'
