import { toast } from 'sonner'
import { translate, type Lang, type MessageKey } from '@/i18n'
import { pickLine } from '@/i18n/microcopy'
import type { Settings } from '@/types'
import type { Alerter } from './controller'

/** Short two-tone chime via WebAudio. Silently does nothing where audio is unavailable. */
export function playChime() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const tone = (freq: number, start: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + start)
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + 0.35)
      osc.connect(gain).connect(ctx.destination)
      osc.start(ctx.currentTime + start)
      osc.stop(ctx.currentTime + start + 0.4)
    }
    tone(880, 0)
    tone(660, 0.25)
    window.setTimeout(() => void ctx.close(), 1000)
  } catch {
    // audio blocked by the browser: the toast and notification still fire
  }
}

export function notificationsSupported(): boolean {
  return typeof Notification !== 'undefined'
}

/** Ask once (from a user gesture) so end-of-phase notifications can show. */
export async function ensureNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!notificationsSupported()) return 'unsupported'
  if (Notification.permission === 'default') return Notification.requestPermission()
  return Notification.permission
}

export function showNotification(title: string, body: string) {
  if (!notificationsSupported() || Notification.permission !== 'granted') return
  try {
    new Notification(title, { body })
  } catch {
    // some browsers only allow notifications through a service worker
  }
}

export const browserAlerter: Alerter = {
  phaseEnded(ended, next, settings: Settings) {
    const lang: Lang = settings.language
    const key: MessageKey =
      ended.phase === 'work' ? 'timer.alert.work' : ended.phase === 'countdown' ? 'timer.alert.countdown' : 'timer.alert.break'
    const title = translate(lang, key)
    const body = pickLine(lang, 'end', next.seed)
    toast(title, { description: body })
    if (settings.timer.sound) playChime()
    if (settings.timer.notify) showNotification(title, body)
  },
}
