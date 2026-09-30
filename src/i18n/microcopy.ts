import type { Lang } from '.'

export type PoolKey = 'start' | 'running' | 'break' | 'end' | 'stopwatch'

/** Absurd, playful lines shown under the timer. A rotating pool per state. */
export const pools: Record<Lang, Record<PoolKey, string[]>> = {
  en: {
    start: [
      'The tomato is watching.',
      'Your future self sends regards.',
      'Focus engaged. Snacks are a distant rumor.',
      'Launching the tiny rocket of productivity.',
      'Ready, steady, mildly dramatic.',
    ],
    running: [
      'Somewhere, a spreadsheet is proud of you.',
      'Keep going. The chair believes in you.',
      'Deep breath. Shallow procrastination.',
      'Even the clock is impressed. Quietly.',
      'You are doing the thing. The thing is being done.',
    ],
    break: [
      'Stand up. Stretch like a dramatic cat.',
      'Water exists. Consider it.',
      'Stare at something far away, like a pigeon philosopher.',
      'Break time: your brain is buffering.',
      'Go say hi to a plant.',
    ],
    end: [
      'Ding. The tomato is satisfied.',
      'Time! Put the pencil down and step away slowly.',
      "That's a wrap. Applause (imaginary).",
      'Session complete. The universe nods.',
      'Bzzzt. The clock has spoken.',
    ],
    stopwatch: [
      'Time flows. You decide where.',
      'Every second is a tiny employee.',
      'Counting up, like a responsible ghost.',
      'The seconds are being collected.',
      'Stopwatch on: no pressure, just math.',
    ],
  },
  he: {
    start: [
      'העגבנייה מסתכלת.',
      'העצמי העתידי שלך שולח דרישת שלום.',
      'מצב ריכוז פעיל. חטיפים זה שמועה רחוקה.',
      'משגרים את הטיל הקטן של היצרנות.',
      'על המקום, היכונו, קצת דרמה.',
    ],
    running: [
      'איפשהו, גיליון אלקטרוני גאה בך.',
      'ממשיכים. הכיסא מאמין בך.',
      'נשימה עמוקה. דחיינות רדודה.',
      'אפילו השעון מתרשם. בשקט.',
      'אתה עושה את הדבר. הדבר נעשה.',
    ],
    break: [
      'לקום. להימתח כמו חתול דרמטי.',
      'מים קיימים. כדאי לשקול.',
      'להסתכל רחוק, כמו יונה פילוסופית.',
      'זמן הפסקה: המוח שלך בטעינה.',
      'לך להגיד שלום לעציץ.',
    ],
    end: [
      'דינג. העגבנייה מרוצה.',
      'זמן! להניח את העיפרון ולהתרחק לאט.',
      'זה סיכום. מחיאות כפיים (דמיוניות).',
      'הסבב הושלם. היקום מהנהן.',
      'ביזזז. השעון אמר את דברו.',
    ],
    stopwatch: [
      'הזמן זורם. אתה מחליט לאן.',
      'כל שנייה היא עובדת קטנטנה.',
      'סופרים למעלה, כמו רוח אחראית.',
      'השניות נאספות.',
      'סטופר פועל: בלי לחץ, רק מתמטיקה.',
    ],
  },
}

/** Deterministic pick: `seed` fixes the starting line, `rotation` (e.g. minutes elapsed) advances it. */
export function pickLine(lang: Lang, pool: PoolKey, seed: number, rotation = 0): string {
  const lines = pools[lang][pool]
  return lines[Math.abs(Math.floor(seed) + Math.floor(rotation)) % lines.length]
}
