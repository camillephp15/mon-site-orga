/**
 * ICS / iCalendar Parser Module
 * Parses .ics files or webcal/http calendar feeds and maps events to StudyFlow format.
 */

import { SUBJECT_COLORS } from './store.js';

export const ICSParser = {
  /**
   * Parses raw iCalendar text into an array of StudyFlow event objects
   * @param {string} icsText
   * @returns {Array<Object>}
   */
  parse(icsText) {
    if (!icsText || typeof icsText !== 'string') return [];

    // Normalize line endings and unfold lines (lines starting with space/tab are continuations)
    const normalized = icsText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const unfolded = normalized.replace(/\n[ \t]/g, '');

    const lines = unfolded.split('\n');
    const events = [];
    let inEvent = false;
    let currentEvent = {};

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      if (line === 'BEGIN:VEVENT') {
        inEvent = true;
        currentEvent = {};
        continue;
      }

      if (line === 'END:VEVENT') {
        inEvent = false;
        const parsed = this._processVEvent(currentEvent);
        if (parsed) events.push(parsed);
        continue;
      }

      if (inEvent) {
        const colonIdx = line.indexOf(':');
        if (colonIdx !== -1) {
          const propFull = line.substring(0, colonIdx);
          const value = line.substring(colonIdx + 1);
          const propName = propFull.split(';')[0].toUpperCase();
          currentEvent[propName] = value;
          // Store raw property line if needed for timezone
          currentEvent[`_RAW_${propName}`] = propFull;
        }
      }
    }

    return events;
  },

  _processVEvent(raw) {
    const summary = (raw['SUMMARY'] || 'Cours').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\n/g, ' ').trim();
    const location = (raw['LOCATION'] || '').replace(/\\,/g, ',').replace(/\\n/g, ' ').trim();
    const description = (raw['DESCRIPTION'] || '').replace(/\\,/g, ',').replace(/\\n/g, '\n').trim();

    const dtStart = raw['DTSTART'];
    const dtEnd = raw['DTEND'];

    if (!dtStart) return null;

    const startDate = this._parseICSDate(dtStart);
    let endDate = dtEnd ? this._parseICSDate(dtEnd) : null;

    if (!endDate && raw['DURATION']) {
      const durMin = this._parseICSDuration(raw['DURATION']);
      endDate = new Date(startDate.getTime() + durMin * 60000);
    } else if (!endDate) {
      endDate = new Date(startDate.getTime() + 120 * 60000); // 2h default
    }

    const durationMin = Math.round((endDate.getTime() - startDate.getTime()) / 60000);
    if (durationMin <= 0 || isNaN(durationMin)) return null;

    // Day of week
    const daysMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const dayKey = daysMap[startDate.getDay()];

    const startHours = String(startDate.getHours()).padStart(2, '0');
    const startMinutes = String(startDate.getMinutes()).padStart(2, '0');
    const startTime = `${startHours}:${startMinutes}`;

    // Auto-categorize subject and color
    const { type, color, cleanTitle } = this._detectSubjectInfo(summary, description, location);

    return {
      id: 'ics_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
      title: cleanTitle,
      day: dayKey,
      startTime: startTime,
      duration: durationMin,
      color: color,
      room: location || 'Salle',
      teacher: this._extractTeacher(description) || '',
      type: type,
      completed: false,
      isRecurring: true,
      rawSummary: summary
    };
  },

  _parseICSDate(dateStr) {
    // Format: YYYYMMDDTHHMMSSZ or YYYYMMDDTHHMMSS or YYYYMMDD
    const clean = dateStr.replace(/[^0-9TZ]/g, '');
    if (clean.length < 8) return new Date();

    const year = parseInt(clean.substring(0, 4), 10);
    const month = parseInt(clean.substring(4, 6), 10) - 1;
    const day = parseInt(clean.substring(6, 8), 10);

    if (clean.indexOf('T') !== -1) {
      const timePart = clean.substring(clean.indexOf('T') + 1);
      const hours = parseInt(timePart.substring(0, 2) || '0', 10);
      const minutes = parseInt(timePart.substring(2, 4) || '0', 10);
      const seconds = parseInt(timePart.substring(4, 6) || '0', 10);

      if (clean.endsWith('Z')) {
        return new Date(Date.UTC(year, month, day, hours, minutes, seconds));
      }
      return new Date(year, month, day, hours, minutes, seconds);
    }

    return new Date(year, month, day, 8, 0, 0);
  },

  _parseICSDuration(durStr) {
    // PT1H30M / PT2H / PT45M
    let minutes = 0;
    const matchH = durStr.match(/(\d+)H/i);
    const matchM = durStr.match(/(\d+)M/i);
    if (matchH) minutes += parseInt(matchH[1], 10) * 60;
    if (matchM) minutes += parseInt(matchM[1], 10);
    return minutes || 120;
  },

  _detectSubjectInfo(title, desc, loc) {
    const text = `${title} ${desc} ${loc}`.toLowerCase();
    
    let type = 'course';
    let color = SUBJECT_COLORS.Perso;

    if (text.includes('ds') || text.includes('partiel') || text.includes('examen') || text.includes('devoir')) {
      type = 'ds';
      color = SUBJECT_COLORS.DS;
    } else if (text.includes('colle') || text.includes('khôlle')) {
      type = 'colle';
      color = SUBJECT_COLORS.Colle;
    } else if (text.includes('tp') || text.includes('laboratoire') || text.includes('labo')) {
      type = 'tp';
    } else if (text.includes('td') || text.includes('travaux dirigés')) {
      type = 'td';
    }

    if (text.includes('math') || text.includes('algebre') || text.includes('algèbre') || text.includes('analyse') || text.includes('proba')) {
      color = SUBJECT_COLORS.Maths;
    } else if (text.includes('physique') || text.includes('thermo') || text.includes('meca') || text.includes('mécanique') || text.includes('optique') || text.includes('elec') || text.includes('elect')) {
      color = SUBJECT_COLORS.Physique;
    } else if (text.includes('info') || text.includes('python') || text.includes('algo') || text.includes('sql') || text.includes('prog') || text.includes('c++') || text.includes('ocaml')) {
      color = SUBJECT_COLORS.Info;
    } else if (text.includes('chimie')) {
      color = SUBJECT_COLORS.Chimie;
    } else if (text.includes('tipe') || text.includes('projet')) {
      color = SUBJECT_COLORS.TIPE;
    } else if (text.includes('anglais') || text.includes('english') || text.includes('philo') || text.includes('francais') || text.includes('français') || text.includes('lv')) {
      color = SUBJECT_COLORS.Langues;
    }

    return { type, color, cleanTitle: title };
  },

  _extractTeacher(desc) {
    if (!desc) return '';
    const lines = desc.split('\n');
    for (const l of lines) {
      if (l.toLowerCase().includes('prof') || l.toLowerCase().includes('enseignant') || l.toLowerCase().includes('intervenant')) {
        return l.replace(/.*[:\-]\s*/, '').trim();
      }
    }
    return '';
  },

  /**
   * Fetches an online ICS feed URL (using corsproxy if direct fetch blocked)
   */
  async fetchFromUrl(url) {
    let targetUrl = url.trim();
    if (targetUrl.startsWith('webcal://')) {
      targetUrl = targetUrl.replace('webcal://', 'https://');
    }

    try {
      // First attempt: Direct fetch
      const resp = await fetch(targetUrl);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const text = await resp.text();
      return this.parse(text);
    } catch (e) {
      // Fallback: CORS Proxy for university calendars that don't send CORS headers
      try {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
        const respProxy = await fetch(proxyUrl);
        if (!respProxy.ok) throw new Error(`Proxy HTTP ${respProxy.status}`);
        const text = await respProxy.text();
        return this.parse(text);
      } catch (proxyErr) {
        throw new Error('Impossible de charger le flux en ligne (CORS/Réseau). Veuillez télécharger le fichier .ics et l\'importer directement.');
      }
    }
  }
};
